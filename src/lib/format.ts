/** `14:22:41` - a time of day, 24-hour, in the given locale. */
export function formatTime(timestamp: number, locale?: string): string {
    return new Date(timestamp).toLocaleTimeString(locale, {hour12: false});
}

/** The date and the time, for where the day matters. */
export function formatDateTime(timestamp: number, locale?: string): string {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString(locale)} ${date.toLocaleTimeString(locale, {hour12: false})}`;
}

/** `184 ms`, `1.20 s` - a duration. */
export function formatDuration(durationMs: number): string {
    if (durationMs < 1000) {
        return `${Math.round(durationMs)} ms`;
    }
    return `${(durationMs / 1000).toFixed(2)} s`;
}
