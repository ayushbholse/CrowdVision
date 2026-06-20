// src/utils/movementDetector.ts
import { BoundingBox } from '../services/faceDetectionService';

export type MovementStatus = 'STABLE' | 'MOVING' | 'UNKNOWN';

// Threshold: If the average face moves more than 2% of the screen across one frame, it's considered moving.
const MOVEMENT_THRESHOLD = 0.02;

/**
 * Calculates if a crowd is generally moving or stable based on
 * how far bounding boxes have shifted since the last frame.
 * @param previousBoxes The bounding boxes from the previous frame
 * @param currentBoxes The bounding boxes from the current frame
 */
export function calculateMovement(previousBoxes: BoundingBox[], currentBoxes: BoundingBox[]): MovementStatus {
    if (!previousBoxes.length || !currentBoxes.length) {
        return 'UNKNOWN';
    }

    let totalDisplacement = 0;
    let matchedPairs = 0;

    // For every box in the current frame, find the closest box in the previous frame
    // to estimate its movement vector.
    for (const curr of currentBoxes) {
        const currCenterX = curr.x + (curr.width / 2);
        const currCenterY = curr.y + (curr.height / 2);

        let minDistance = Infinity;

        for (const prev of previousBoxes) {
            const prevCenterX = prev.x + (prev.width / 2);
            const prevCenterY = prev.y + (prev.height / 2);

            // Euclidean distance in normalized coordinate space (0-1)
            const dx = currCenterX - prevCenterX;
            const dy = currCenterY - prevCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
            }
        }

        // Only count it if it's a realistic match (less than 15% jump in one 300ms frame)
        // Otherwise, it might be a newly tracked face or a false positive.
        if (minDistance < 0.15) {
            totalDisplacement += minDistance;
            matchedPairs++;
        }
    }

    if (matchedPairs === 0) {
        return 'UNKNOWN'; // Could not reliably track any faces
    }

    const averageDisplacement = totalDisplacement / matchedPairs;

    return averageDisplacement > MOVEMENT_THRESHOLD ? 'MOVING' : 'STABLE';
}
