// src/services/firebaseService.ts
import { collection, addDoc, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { CrowdLog } from '../database/crowdRepository';

const LOGS_COLLECTION = 'crowd_logs';

/**
 * Syncs a single crowd log to Firebase Firestore.
 * This should be called primarily for emergency logs or significant events
 * to save cloud storage costs, but you can call it for all logs if desired.
 */
export async function syncLogToFirebase(log: Omit<CrowdLog, 'id'>): Promise<string | null> {
    try {
        const docRef = await addDoc(collection(db, LOGS_COLLECTION), {
            timestamp: log.timestamp, // ISO string
            face_count: log.face_count,
            density: log.density,
            density_level: log.density_level,
            image_path: log.image_path || null,
            is_emergency: log.is_emergency === 1,
            created_at: new Date().toISOString()
        });
        console.log('[FirebaseService] Synced log to Firestore ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('[FirebaseService] Error syncing log to Firestore:', error);
        return null;
    }
}

/**
 * Fetches crowd logs from Firestore.
 * Useful if the user reinstalls the app and needs their history.
 */
export async function fetchLogsFromFirebase(maxLimit = 100): Promise<CrowdLog[]> {
    try {
        const q = query(
            collection(db, LOGS_COLLECTION),
            orderBy('timestamp', 'desc'),
            limit(maxLimit)
        );
        const querySnapshot = await getDocs(q);

        const logs: CrowdLog[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            logs.push({
                id: doc.id as any, // Firebase uses string IDs, SQLite uses number IDs. Type casting as workaround.
                timestamp: data.timestamp,
                face_count: data.face_count,
                density: data.density,
                density_level: data.density_level,
                image_path: data.image_path,
                is_emergency: data.is_emergency ? 1 : 0
            });
        });
        return logs;
    } catch (error) {
        console.error('[FirebaseService] Error fetching logs from Firestore:', error);
        return [];
    }
}
