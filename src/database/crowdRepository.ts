// src/database/crowdRepository.ts
import { getDatabase } from './database';

export interface CrowdLog {
    id?: number;
    timestamp: string;
    face_count: number;
    density: number;
    image_path?: string;
    density_level: string;
    is_emergency: number;
}

export interface EmergencyIncident {
    id?: number;
    timestamp: string;
    face_count: number;
    density: number;
    image_path?: string;
    resolved: number;
}

// ─── Crowd Logs ───────────────────────────────────────────────────────────────

export async function insertCrowdLog(log: Omit<CrowdLog, 'id'>): Promise<number> {
    const db = await getDatabase();
    const result = await db.runAsync(
        `INSERT INTO crowd_logs (timestamp, face_count, density, image_path, density_level, is_emergency)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [
            log.timestamp,
            log.face_count,
            log.density,
            log.image_path ?? null,
            log.density_level,
            log.is_emergency,
        ],
    );
    return result.lastInsertRowId;
}

export async function getAllCrowdLogs(): Promise<CrowdLog[]> {
    const db = await getDatabase();
    return db.getAllAsync<CrowdLog>(
        'SELECT * FROM crowd_logs ORDER BY timestamp DESC LIMIT 200',
    );
}

export async function getRecentCrowdLogs(limit = 50): Promise<CrowdLog[]> {
    const db = await getDatabase();
    return db.getAllAsync<CrowdLog>(
        'SELECT * FROM crowd_logs ORDER BY timestamp DESC LIMIT ?',
        [limit],
    );
}

export async function getLogsByDateRange(
    from: string,
    to: string,
): Promise<CrowdLog[]> {
    const db = await getDatabase();
    return db.getAllAsync<CrowdLog>(
        'SELECT * FROM crowd_logs WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp ASC',
        [from, to],
    );
}

export async function getAverageDensity(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ avg_density: number }>(
        'SELECT AVG(density) as avg_density FROM crowd_logs',
    );
    return row?.avg_density ?? 0;
}

export async function getPeakFaceCount(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ max_faces: number }>(
        'SELECT MAX(face_count) as max_faces FROM crowd_logs',
    );
    return row?.max_faces ?? 0;
}

export async function deleteCrowdLog(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM crowd_logs WHERE id = ?', [id]);
}

export async function clearAllLogs(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM crowd_logs');
}

// ─── Emergency Incidents ──────────────────────────────────────────────────────

export async function insertEmergencyIncident(
    incident: Omit<EmergencyIncident, 'id'>,
): Promise<number> {
    const db = await getDatabase();
    const result = await db.runAsync(
        `INSERT INTO emergency_incidents (timestamp, face_count, density, image_path, resolved)
     VALUES (?, ?, ?, ?, ?)`,
        [
            incident.timestamp,
            incident.face_count,
            incident.density,
            incident.image_path ?? null,
            incident.resolved,
        ],
    );
    return result.lastInsertRowId;
}

export async function getAllEmergencyIncidents(): Promise<EmergencyIncident[]> {
    const db = await getDatabase();
    return db.getAllAsync<EmergencyIncident>(
        'SELECT * FROM emergency_incidents ORDER BY timestamp DESC',
    );
}

export async function resolveIncident(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
        'UPDATE emergency_incidents SET resolved = 1 WHERE id = ?',
        [id],
    );
}
