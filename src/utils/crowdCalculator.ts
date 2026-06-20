// src/utils/crowdCalculator.ts

export type DensityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DensityResult {
    percentage: number;
    level: DensityLevel;
    color: string;
    label: string;
}

/**
 * Calculate crowd density percentage and level.
 * Density = (faceCount / frameCapacity) × 100
 * frameCapacity: estimated max faces for a given area (default: 50)
 */
export function calculateDensity(
    faceCount: number,
    frameCapacity: number = 50,
): DensityResult {
    const percentage = Math.min(
        Math.round((faceCount / frameCapacity) * 100),
        100,
    );

    let level: DensityLevel;
    let color: string;
    let label: string;

    if (percentage <= 30) {
        level = 'LOW';
        color = '#22C55E';
        label = '🟢 LOW';
    } else if (percentage <= 60) {
        level = 'MEDIUM';
        color = '#FACC15';
        label = '🟡 MEDIUM';
    } else {
        level = 'HIGH';
        color = '#EF4444';
        label = '🔴 HIGH';
    }

    return { percentage, level, color, label };
}

/**
 * Determine if emergency mode should be triggered.
 */
export function isEmergencyCondition(
    faceCount: number,
    densityPercent: number,
): boolean {
    return faceCount > 50 || densityPercent > 75;
}

/**
 * Get a descriptive alert message for the density level.
 */
export function getDensityAlertMessage(
    faceCount: number,
    densityPercent: number,
): string {
    if (densityPercent > 75) {
        return `⚠ High Crowd Density Detected: ${densityPercent}%`;
    } else if (densityPercent > 50) {
        return `⚠ Medium Crowd Density: ${densityPercent}%`;
    }
    return `✓ Normal crowd level: ${faceCount} people`;
}
