// src/database/database.ts
import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise) return dbPromise;

  console.log('[Database] Opening database: crowdvision.db');
  dbPromise = (async () => {
    try {
      const database = await SQLite.openDatabaseAsync('crowdvision.db');
      console.log('[Database] Database opened. Initializing...');
      await initializeDatabase(database);
      console.log('[Database] Database initialized.');
      return database;
    } catch (err) {
      console.error('[Database] Open/Init failed:', err);
      throw err;
    }
  })();

  return dbPromise;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS crowd_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      face_count INTEGER NOT NULL,
      density REAL NOT NULL,
      image_path TEXT,
      density_level TEXT NOT NULL DEFAULT 'LOW',
      is_emergency INTEGER NOT NULL DEFAULT 0
    );
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS emergency_incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      face_count INTEGER NOT NULL,
      density REAL NOT NULL,
      image_path TEXT,
      resolved INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export async function closeDatabase(): Promise<void> {
  if (dbPromise) {
    const database = await dbPromise;
    await database.closeAsync();
    dbPromise = null;
  }
}
