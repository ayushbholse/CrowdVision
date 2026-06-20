// src/hooks/useFaceDetection.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import {
    initializeTensorflow,
    detectFaces,
    decodeImageUri,
    disposeTensors,
    BoundingBox,
    FaceDetectionResult,
} from '../services/faceDetectionService';
import {
    calculateDensity,
    DensityResult,
    isEmergencyCondition,
} from '../utils/crowdCalculator';
import {
    insertCrowdLog,
    insertEmergencyIncident,
} from '../database/crowdRepository';
import { getCurrentTimestamp } from '../utils/timeFormatter';
import { sendCrowdNotification } from './notificationHelper';
import { audioService } from '../services/audioService';
import { uploadLocalImageToCloud, saveUriToGallery } from '../services/storageService';
import { syncLogToFirebase } from '../services/firebaseService';
import { calculateMovement, MovementStatus } from '../utils/movementDetector';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CROWD_LIMIT_KEY, CROWD_LIMIT_ENABLED_KEY } from '../components/CrowdLimitSettings';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FaceDetectionState {
    isModelLoaded: boolean;
    isDetecting: boolean;
    faceCount: number;
    boxes: BoundingBox[];
    density: DensityResult;
    isEmergency: boolean;
    isOverLimit: boolean;
    movementStatus: MovementStatus;
    error: string | null;
    isProcessing: boolean;
}

export interface FaceDetectionActions {
    startDetection: () => void;
    stopDetection: () => void;
    setEmergencyMode: (active: boolean) => void;
    /** Call with a camera photo URI to run one detection frame. */
    performDetection: (imageUri: string) => Promise<void>;
    /** Persist current reading to DB + cloud. */
    logCurrentReading: (imagePath?: string) => Promise<void>;
}

const defaultDensity: DensityResult = {
    percentage: 0,
    level: 'LOW',
    color: '#22C55E',
    label: '🟢 LOW',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFaceDetection(): FaceDetectionState & FaceDetectionActions {
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [faceCount, setFaceCount] = useState(0);
    const [boxes, setBoxes] = useState<BoundingBox[]>([]);
    const [density, setDensity] = useState<DensityResult>(defaultDensity);
    const [isEmergency, setIsEmergency] = useState(false);
    const [isOverLimit, setIsOverLimit] = useState(false);
    const [movementStatus, setMovementStatus] = useState<MovementStatus>('UNKNOWN');
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Refs avoid stale-closure problems inside intervals/callbacks
    const isDetectingRef = useRef(false);
    const isProcessingRef = useRef(false);
    const emergencyRef = useRef(false);
    const faceCountRef = useRef(0);
    const previousBoxesRef = useRef<BoundingBox[]>([]);

    // Configurations
    const limitEnabledRef = useRef(false);
    const limitValueRef = useRef(50);

    // Keep refs in sync with state
    useEffect(() => { isDetectingRef.current = isDetecting; }, [isDetecting]);
    useEffect(() => { faceCountRef.current = faceCount; }, [faceCount]);

    // ── Model init ────────────────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const ready = await initializeTensorflow();
                if (!mounted) return;
                setIsModelLoaded(ready);
                if (!ready) {
                    setError('AI model failed to load. Detection unavailable.');
                }
            } catch (e: any) {
                if (mounted) {
                    setIsModelLoaded(false);
                    setError(e?.message ?? 'Failed to load AI model');
                }
            }
        })();
        return () => { mounted = false; };
    }, []);

    // ── Core detection call ───────────────────────────────────────────────────
    /**
     * performDetection — decode a camera photo URI and run BlazeFace on it.
     * Results (boxes, count, density) are written to state.
     * Uses isProcessingRef to prevent concurrent calls from overlapping.
     */
    const performDetection = useCallback(async (imageUri: string): Promise<void> => {
        // Guard: must be detecting and model must be ready
        if (!isDetectingRef.current || isProcessingRef.current) return;

        isProcessingRef.current = true;
        setIsProcessing(true);

        let tensor: tf.Tensor3D | null = null;
        try {
            console.log('[useFaceDetection] Decoding frame...');
            tensor = await decodeImageUri(imageUri);

            // Re-check after async decode — user may have stopped
            if (!isDetectingRef.current || !tensor) {
                disposeTensors([tensor]);
                return;
            }

            const result: FaceDetectionResult = await detectFaces(tensor);
            console.log(`[useFaceDetection] Faces detected: ${result.count}`);

            // Another guard after the slow inference step
            if (!isDetectingRef.current) {
                disposeTensors([tensor]);
                return;
            }

            const count = result.count;
            const currentBoxes = result.boxes;
            const densityResult = calculateDensity(count);
            let emergency = isEmergencyCondition(count, densityResult.percentage);

            // Movement detection
            const currentMovement = calculateMovement(previousBoxesRef.current, currentBoxes);

            // Crowd Limit Check
            let overLimit = false;
            if (limitEnabledRef.current && count >= limitValueRef.current) {
                overLimit = true;
                emergency = true; // Auto-trigger emergency if over hard limit
            }

            // Batch state updates
            setFaceCount(count);
            setBoxes(currentBoxes);
            setDensity(densityResult);
            setIsEmergency(emergency);
            setIsOverLimit(overLimit);
            setMovementStatus(currentMovement);

            faceCountRef.current = count;
            previousBoxesRef.current = currentBoxes;

            // Emergency alarm
            if (emergency && !emergencyRef.current) {
                emergencyRef.current = true;
                sendCrowdNotification(count, densityResult.percentage);
                audioService.playAlarm();
            } else if (!emergency && emergencyRef.current) {
                emergencyRef.current = false;
                audioService.stopAlarm();
            }

        } catch (e: any) {
            console.error('[useFaceDetection] Detection error:', e);
            setError(e?.message ?? 'Detection error');
        } finally {
            disposeTensors([tensor]);
            isProcessingRef.current = false;
            setIsProcessing(false);
        }
    }, []); // No deps — everything accessed via refs

    // ── Persist reading ───────────────────────────────────────────────────────
    /** Save current reading to SQLite + Cloudinary (runs every ~10s). */
    const logCurrentReading = useCallback(async (imagePath?: string): Promise<void> => {
        const ts = getCurrentTimestamp();
        const count = faceCountRef.current;
        const densityResult = calculateDensity(count);
        const emergency = isEmergencyCondition(count, densityResult.percentage);

        let finalPath = imagePath;
        if (imagePath) {
            try {
                await saveUriToGallery(imagePath);
                const url = await uploadLocalImageToCloud(imagePath);
                if (url) finalPath = url;
            } catch { /* non-critical */ }
        }

        const logData = {
            timestamp: ts,
            face_count: count,
            density: densityResult.percentage,
            image_path: finalPath,
            density_level: densityResult.level,
            is_emergency: emergency ? 1 : 0,
        };

        // Save to local SQLite
        await insertCrowdLog(logData);

        // Save to Firebase (fire and forget to not block UI)
        syncLogToFirebase(logData).catch(e => console.warn('Firebase sync failed:', e));

        if (emergency) {
            await insertEmergencyIncident({
                timestamp: ts,
                face_count: count,
                density: densityResult.percentage,
                image_path: finalPath,
                resolved: 0,
            });
        }
    }, []);

    // ── Controls ──────────────────────────────────────────────────────────────
    const startDetection = useCallback(async () => {
        // Load limits before starting
        try {
            const savedLimit = await AsyncStorage.getItem(CROWD_LIMIT_KEY);
            const savedEnabled = await AsyncStorage.getItem(CROWD_LIMIT_ENABLED_KEY);
            if (savedLimit !== null) limitValueRef.current = parseInt(savedLimit, 10);
            if (savedEnabled !== null) limitEnabledRef.current = savedEnabled === 'true';
        } catch (e) {
            console.error('Failed to load limits for detection loop');
        }

        setIsDetecting(true);
        isDetectingRef.current = true;
        setError(null);
        setFaceCount(0);
        setBoxes([]);
        previousBoxesRef.current = [];
        setDensity(defaultDensity);
        setIsEmergency(false);
        setIsOverLimit(false);
        setMovementStatus('UNKNOWN');
    }, []);

    const stopDetection = useCallback(async () => {
        setIsDetecting(false);
        isDetectingRef.current = false;
        setBoxes([]);
        previousBoxesRef.current = [];
        setFaceCount(0);
        setDensity(defaultDensity);
        setIsEmergency(false);
        setIsOverLimit(false);
        setMovementStatus('UNKNOWN');
        emergencyRef.current = false;
        await audioService.stopAlarm();
    }, []);

    const setEmergencyMode = useCallback((active: boolean) => {
        setIsEmergency(active);
        emergencyRef.current = active;
        if (active) {
            audioService.playAlarm();
        } else {
            audioService.stopAlarm();
        }
    }, []);

    return {
        isModelLoaded,
        isDetecting,
        faceCount,
        boxes,
        density,
        isEmergency,
        isOverLimit,
        movementStatus,
        error,
        isProcessing,
        startDetection,
        stopDetection,
        setEmergencyMode,
        performDetection,
        logCurrentReading,
    };
}
