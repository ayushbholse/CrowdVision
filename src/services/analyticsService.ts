// src/services/analyticsService.ts
import {
    getAllCrowdLogs,
    getAverageDensity,
    getPeakFaceCount,
    CrowdLog,
} from '../database/crowdRepository';
import { getHourLabel } from '../utils/timeFormatter';

export interface HourlyData {
    hour: string;
    avgFaces: number;
    avgDensity: number;
}

export interface AnalyticsSummary {
    totalSessions: number;
    peakFaceCount: number;
    averageDensity: number;
    highAlertCount: number;
    mediumAlertCount: number;
    lowAlertCount: number;
    hourlyTrend: HourlyData[];
    recentLogs: CrowdLog[];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const logs = await getAllCrowdLogs();
    const peakFaceCount = await getPeakFaceCount();
    const averageDensity = await getAverageDensity();

    const highAlertCount = logs.filter((l) => l.density_level === 'HIGH').length;
    const mediumAlertCount = logs.filter((l) => l.density_level === 'MEDIUM').length;
    const lowAlertCount = logs.filter((l) => l.density_level === 'LOW').length;

    // Build hourly trend
    const hourMap: Record<string, { faces: number[]; densities: number[] }> = {};
    logs.forEach((log) => {
        const hour = getHourLabel(log.timestamp);
        if (!hourMap[hour]) hourMap[hour] = { faces: [], densities: [] };
        hourMap[hour].faces.push(log.face_count);
        hourMap[hour].densities.push(log.density);
    });

    const hourlyTrend: HourlyData[] = Object.entries(hourMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, data]) => ({
            hour,
            avgFaces: Math.round(
                data.faces.reduce((s, v) => s + v, 0) / data.faces.length,
            ),
            avgDensity: Math.round(
                data.densities.reduce((s, v) => s + v, 0) / data.densities.length,
            ),
        }));

    return {
        totalSessions: logs.length,
        peakFaceCount,
        averageDensity: Math.round(averageDensity),
        highAlertCount,
        mediumAlertCount,
        lowAlertCount,
        hourlyTrend,
        recentLogs: logs.slice(0, 20),
    };
}

/**
 * Get last N face counts as a simple array (for chart datasets).
 */
export function extractFaceCountSeries(
    logs: CrowdLog[],
    limit = 20,
): number[] {
    return logs
        .slice(0, limit)
        .reverse()
        .map((l) => l.face_count);
}

/**
 * Get last N density values as a simple array (for chart datasets).
 */
export function extractDensitySeries(
    logs: CrowdLog[],
    limit = 20,
): number[] {
    return logs
        .slice(0, limit)
        .reverse()
        .map((l) => Math.round(l.density));
}
