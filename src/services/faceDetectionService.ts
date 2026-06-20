// src/services/faceDetectionService.ts
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as blazeface from '@tensorflow-models/blazeface';
import * as ImageManipulator from 'expo-image-manipulator';

export interface FaceDetectionResult {
    count: number;
    boxes: BoundingBox[];
}

export interface BoundingBox {
    x: number;      // 0.0–1.0  (normalized to image width)
    y: number;      // 0.0–1.0  (normalized to image height)
    width: number;  // 0.0–1.0
    height: number; // 0.0–1.0
}

// ─── Singleton model state ────────────────────────────────────────────────────

let blazefaceModel: blazeface.BlazeFaceModel | null = null;
let tfInitialized = false;
let initializationError: string | null = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Initialize TensorFlow.js backend and load the BlazeFace model.
 * Safe to call multiple times — returns immediately if already initialized.
 */
export async function initializeTensorflow(): Promise<boolean> {
    if (tfInitialized && blazefaceModel) return true;

    try {
        console.log('[FaceDetectionService] Starting TF initialization...');
        await tf.ready();

        // Try WebGL first (fastest on device), fall back to CPU
        try {
            await tf.setBackend('rn-webgl');
            console.log('[FaceDetectionService] Backend set to rn-webgl');
        } catch {
            await tf.setBackend('cpu');
            console.warn('[FaceDetectionService] WebGL unavailable, using CPU backend');
        }

        console.log('[FaceDetectionService] TF backend active:', tf.getBackend());

        // Load BlazeFace with aggressive sensitivity settings for multi-face
        blazefaceModel = await blazeface.load({
            maxFaces: 100,          // detect up to 100 faces in one frame
            scoreThreshold: 0.3,   // lower = more sensitive (default ~0.75)
            iouThreshold: 0.3,     // lower = keep more overlapping boxes
        });

        tfInitialized = true;
        console.log('[FaceDetectionService] BlazeFace model loaded — ready for multi-face detection');
        return true;

    } catch (error: any) {
        initializationError = error?.message ?? 'Unknown TF init error';
        console.error('[FaceDetectionService] TF init FAILED:', initializationError);
        tfInitialized = false;
        return false;
    }
}

// ─── Decode ───────────────────────────────────────────────────────────────────

/**
 * Decode an image URI to a TF tensor, resizing to 320px wide for speed.
 * Returns a [H, W, 3] uint8 tensor, or null on failure.
 */
export async function decodeImageUri(uri: string): Promise<tf.Tensor3D | null> {
    try {
        // Resize to 320×320 before decoding — speeds up decode + inference
        let processedUri = uri;
        try {
            const resized = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 320, height: 320 } }],
                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
            );
            processedUri = resized.uri;
        } catch {
            // If resize fails, fall back to original
        }

        // Use the new expo-file-system File API to read bytes
        const { File } = await import('expo-file-system');
        const file = new File(processedUri);
        const bytes = new Uint8Array(await file.arrayBuffer());

        const { decodeJpeg } = await import('@tensorflow/tfjs-react-native');
        const tensor = decodeJpeg(bytes, 3);
        return tensor as tf.Tensor3D;

    } catch (error) {
        console.warn('[FaceDetectionService] Decode error:', error);
        return null;
    }
}

// ─── Detect ───────────────────────────────────────────────────────────────────

/**
 * Run BlazeFace inference on a decoded image tensor.
 *
 * The tensor must be [H, W, 3].  We run at a fixed 320×320 input size for
 * consistent, fast inference.  Boxes are returned as 0-to-1 normalized
 * fractions of the *original* image dimensions so they can be overlaid on
 * any view size.
 *
 * Key multi-face settings:
 *   scoreThreshold: 0.3  — keeps faint/distant face predictions
 *   iouThreshold:   0.3  — keeps overlapping boxes (crowd scenarios)
 *   maxFaces:       100  — no cap on detections
 */
export async function detectFaces(imageTensor: tf.Tensor3D | null): Promise<FaceDetectionResult> {
    const empty: FaceDetectionResult = { count: 0, boxes: [] };
    if (!tfInitialized || !blazefaceModel || !imageTensor) return empty;

    const start = Date.now();

    // Squeeze batch dim if present
    let tensor: tf.Tensor3D = imageTensor;
    if ((imageTensor as any).shape.length === 4) {
        tensor = (imageTensor as any).squeeze([0]) as tf.Tensor3D;
    }

    const [imgH, imgW] = tensor.shape as [number, number, number];

    // Resize to 320×320 for the model
    const TARGET = 320;
    const resized = tf.image.resizeBilinear(tensor as unknown as tf.Tensor4D, [TARGET, TARGET]) as unknown as tf.Tensor3D;

    try {
        // returnTensors: false → predictions come back as plain JS arrays (faster)
        const predictions = await blazefaceModel.estimateFaces(resized as any, false);

        const elapsed = Date.now() - start;
        console.log(`[FaceDetectionService] Inference: ${elapsed}ms | Faces detected: ${predictions.length}`);

        // Map model coordinates (in 320×320 space) back to normalized 0-1
        const boxes: BoundingBox[] = predictions.map((pred: any) => {
            // topLeft / bottomRight are [x, y] in the 320×320 resized frame
            const [x1, y1] = pred.topLeft as [number, number];
            const [x2, y2] = pred.bottomRight as [number, number];

            // Clamp and normalize to [0, 1]
            const normX = Math.max(0, x1 / TARGET);
            const normY = Math.max(0, y1 / TARGET);
            const normW = Math.min(1 - normX, (x2 - x1) / TARGET);
            const normH = Math.min(1 - normY, (y2 - y1) / TARGET);

            return { x: normX, y: normY, width: normW, height: normH };
        });

        return { count: predictions.length, boxes };

    } finally {
        // Always dispose intermediate tensors to prevent memory leaks
        resized.dispose();
        if (tensor !== imageTensor) tensor.dispose();
    }
}

// ─── Dispose ──────────────────────────────────────────────────────────────────

/** Safely dispose one or more tensors. */
export function disposeTensors(tensors: Array<tf.Tensor | null | undefined>): void {
    for (const t of tensors) {
        try {
            if (t && typeof t.dispose === 'function') t.dispose();
        } catch { /* ignore */ }
    }
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export function isModelReady(): boolean {
    return tfInitialized && blazefaceModel !== null;
}

export function getInitializationError(): string | null {
    return initializationError;
}
