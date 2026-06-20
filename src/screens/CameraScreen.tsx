// src/screens/CameraScreen.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import {
    View as RNView, Text, StyleSheet, TouchableOpacity,
    useWindowDimensions, Animated,
} from 'react-native';
import { CameraView as RNCameraView, useCameraPermissions } from 'expo-camera';

const View = RNView as any;
const CameraView = RNCameraView as any;
import { theme } from '../styles/theme';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmergencyButton from '../components/EmergencyButton';
import CrowdHeatmapOverlay from '../components/CrowdHeatmapOverlay';

// How often (ms) to capture a frame and run inference
const DETECTION_INTERVAL_MS = 300;
// How often (ms) to log a reading to the DB / upload to cloud
const LOGGING_INTERVAL_MS = 10_000;

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const {
        isDetecting,
        faceCount,
        density,
        boxes,
        isEmergency,
        isOverLimit,
        movementStatus,
        performDetection,
        startDetection,
        stopDetection,
        setEmergencyMode,
        logCurrentReading,
        isModelLoaded,
        isProcessing,
        error,
    } = useFaceDetection();

    const { width: winW, height: winH } = useWindowDimensions();
    const cameraRef = useRef<any>(null);

    // Animated pulse for emergency state
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (isEmergency) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
        }
    }, [isEmergency]);

    // ── Detection loop (fast — every 300ms) ───────────────────────────────────
    useEffect(() => {
        if (!isDetecting) return;

        const detect = async () => {
            if (!cameraRef.current || !isDetecting) return;
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.25,       // low quality = fast decode
                    base64: false,
                    skipProcessing: true,
                });
                if (photo?.uri) {
                    console.log('[CameraScreen] Frame captured, sending to detector...');
                    await performDetection(photo.uri);
                }
            } catch (err) {
                // Silently skip — camera may not be ready for a single frame
            }
        };

        // Run immediately, then on interval
        detect();
        const detectionTimer = setInterval(detect, DETECTION_INTERVAL_MS);

        return () => clearInterval(detectionTimer);
    }, [isDetecting, performDetection]);

    // ── Logging loop (slow — every 10s) ──────────────────────────────────────
    useEffect(() => {
        if (!isDetecting) return;

        const loggingTimer = setInterval(async () => {
            if (!cameraRef.current || !isDetecting) return;
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.5,
                    base64: false,
                    skipProcessing: true,
                });
                if (photo?.uri) {
                    await logCurrentReading(photo.uri);
                }
            } catch { /* non-critical */ }
        }, LOGGING_INTERVAL_MS);

        return () => clearInterval(loggingTimer);
    }, [isDetecting, logCurrentReading]);

    // ─── Permission screens ───────────────────────────────────────────────────
    if (!permission) return <View style={styles.container} />;

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.permissionText}>
                    📷 Camera permission is required for face detection.
                </Text>
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const densityBarWidth = `${density.percentage}%` as any;

    return (
        <View style={styles.container}>
            {/* Camera feed */}
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
            />

            {/* Heatmap Layer */}
            {isDetecting && <CrowdHeatmapOverlay boxes={boxes} />}

            {/* Emergency Red Border Overlay */}
            {isEmergency && <View style={styles.emergencyBorder} pointerEvents="none" />}

            {/* ── Overlay ── */}
            <SafeAreaView style={styles.overlay} pointerEvents="box-none">

                {/* ── Header info strip ── */}
                <View style={styles.header}>
                    {/* Density badge */}
                    <View style={[styles.badge, { backgroundColor: density.color + 'DD' }]}>
                        <Text style={styles.badgeText}>{density.label}</Text>
                    </View>

                    {/* Face counter — the most important readout */}
                    <Animated.View
                        style={[
                            styles.faceCounter,
                            isEmergency && { transform: [{ scale: pulseAnim }], backgroundColor: theme.colors.danger + 'EE' },
                        ]}
                    >
                        <Text style={styles.faceCountNumber}>{faceCount}</Text>
                        <Text style={styles.faceCountLabel}>
                            {faceCount === 1 ? 'face' : 'faces'}
                        </Text>
                    </Animated.View>

                    {/* Status badge */}
                    <View style={[styles.badge, { backgroundColor: theme.colors.overlay }]}>
                        <Text style={styles.badgeText}>
                            {isProcessing ? '⏳ Scanning…' : isDetecting ? '🔴 LIVE' : '⏸ Paused'}
                        </Text>
                    </View>
                </View>

                {/* Over Limit Warning */}
                {isOverLimit && (
                    <View style={styles.limitWarning}>
                        <Text style={styles.limitWarningText}>⚠ CROWD LIMIT EXCEEDED</Text>
                    </View>
                )}

                {/* Movement Indicator Badge */}
                {isDetecting && movementStatus !== 'UNKNOWN' && (
                    <View style={styles.movementBadge}>
                        <Text style={styles.movementText}>
                            {movementStatus === 'MOVING' ? '🏃 Crowd Moving' : '🧍 Crowd Stable'}
                        </Text>
                    </View>
                )}

                {/* ── Density progress bar ── */}
                {isDetecting && (
                    <View style={styles.densityBarBg}>
                        <View style={[styles.densityBarFill, { width: densityBarWidth, backgroundColor: density.color }]} />
                        <Text style={styles.densityBarLabel}>{density.percentage}% density</Text>
                    </View>
                )}

                {/* ── Bounding boxes (drawn in absolute-fill layer) ── */}
                <View style={StyleSheet.absoluteFill as any} pointerEvents="none">
                    {isDetecting && boxes.map((box, i) => (
                        <View
                            key={i}
                            style={[
                                styles.boundingBox,
                                {
                                    left: box.x * winW,
                                    top: box.y * winH,
                                    width: box.width * winW,
                                    height: box.height * winH,
                                    borderColor: density.color,
                                },
                            ]}
                        >
                            {/* Face label */}
                            <View style={[styles.boxLabel, { backgroundColor: density.color }]}>
                                <Text style={styles.boxLabelText}>P{i + 1}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* ── Footer controls ── */}
                <View style={styles.footer}>
                    {/* Model status */}
                    {!isModelLoaded && !error && (
                        <View style={styles.statusChip}>
                            <Text style={styles.statusChipText}>⏳ Loading AI model…</Text>
                        </View>
                    )}
                    {error && (
                        <View style={[styles.statusChip, { backgroundColor: theme.colors.danger + 'CC' }]}>
                            <Text style={styles.statusChipText}>⚠ {error}</Text>
                        </View>
                    )}

                    {/* Start / Stop */}
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            isDetecting ? styles.stopBtn : styles.startBtn,
                            !isModelLoaded && !isDetecting && styles.disabledBtn,
                        ]}
                        onPress={isDetecting ? stopDetection : startDetection}
                        disabled={!isModelLoaded && !isDetecting}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>
                            {isDetecting ? '⏹ Stop Analysis' : '▶ Start Analysis'}
                        </Text>
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.black,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        zIndex: 10,
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.sm,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    badgeText: {
        color: theme.colors.white,
        fontWeight: theme.fontWeight.bold,
        fontSize: theme.fontSize.sm,
    },
    // Face counter — hero element
    faceCounter: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.25)',
        minWidth: 80,
    },
    faceCountNumber: {
        fontSize: 32,
        fontWeight: '900',
        color: theme.colors.white,
        lineHeight: 36,
    },
    faceCountLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    // Density bar
    densityBarBg: {
        marginHorizontal: theme.spacing.md,
        height: 18,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 9,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    densityBarFill: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 9,
    },
    densityBarLabel: {
        position: 'absolute',
        alignSelf: 'center',
        color: theme.colors.white,
        fontSize: 10,
        fontWeight: theme.fontWeight.bold,
    },
    // Bounding boxes
    boundingBox: {
        position: 'absolute',
        borderWidth: 2,
        borderRadius: 4,
        backgroundColor: 'transparent',
    },
    boxLabel: {
        position: 'absolute',
        top: -20,
        left: -2,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 3,
    },
    boxLabelText: {
        color: theme.colors.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    // Footer
    footer: {
        alignItems: 'center',
        paddingBottom: theme.spacing.xl,
        gap: theme.spacing.sm,
    },
    statusChip: {
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: theme.borderRadius.full,
    },
    statusChipText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.medium,
    },
    actionButton: {
        paddingHorizontal: 36,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.full,
        elevation: 6,
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    startBtn: { backgroundColor: theme.colors.accent },
    stopBtn: { backgroundColor: theme.colors.danger },
    disabledBtn: { backgroundColor: theme.colors.textMuted, elevation: 0 },
    buttonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        letterSpacing: 0.5,
    },
    // Permission screen
    permissionText: {
        color: theme.colors.text,
        textAlign: 'center',
        paddingHorizontal: 32,
        marginBottom: 20,
        fontSize: theme.fontSize.md,
    },
    permissionBtn: {
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
    },
    // New Features
    emergencyBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 6,
        borderColor: theme.colors.danger,
        zIndex: 20,
    },
    limitWarning: {
        backgroundColor: theme.colors.danger,
        padding: theme.spacing.sm,
        marginTop: theme.spacing.md,
        alignSelf: 'center',
        borderRadius: theme.borderRadius.md,
        borderWidth: 2,
        borderColor: theme.colors.white,
    },
    limitWarningText: {
        color: theme.colors.white,
        fontWeight: '900',
        fontSize: theme.fontSize.lg,
        letterSpacing: 1,
    },
    movementBadge: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.full,
        marginTop: theme.spacing.md,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: theme.colors.accent,
    },
    movementText: {
        color: theme.colors.white,
        fontWeight: 'bold',
        fontSize: theme.fontSize.sm,
    }
});
