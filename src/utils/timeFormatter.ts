// src/utils/timeFormatter.ts

/**
 * Format ISO timestamp to a human-readable string.
 */
export function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });
}

/**
 * Format date only from ISO string.
 */
export function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Format time only from ISO string.
 */
export function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Get current ISO timestamp string.
 */
export function getCurrentTimestamp(): string {
    return new Date().toISOString();
}

/**
 * Get hour label for a timestamp (e.g. "14:00").
 */
export function getHourLabel(isoString: string): string {
    const date = new Date(isoString);
    const h = date.getHours().toString().padStart(2, '0');
    return `${h}:00`;
}
