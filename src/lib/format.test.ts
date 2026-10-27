import {describe, expect, it} from 'vitest';

import {formatDateTime, formatDuration, formatTime} from './format.js';

describe('formatTime and formatDateTime', () => {
    const timestamp = Date.parse('2026-09-05T09:57:02Z');

    it('prints a 24-hour time and a date plus time', () => {
        expect(formatTime(timestamp, 'de-DE')).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        expect(formatDateTime(timestamp, 'de-DE')).toMatch(/^\d.*\d{2}:\d{2}:\d{2}$/);
    });
});

describe('formatDuration', () => {
    it('switches from milliseconds to seconds at one second', () => {
        expect(formatDuration(0)).toBe('0 ms');
        expect(formatDuration(184.4)).toBe('184 ms');
        expect(formatDuration(999)).toBe('999 ms');
        expect(formatDuration(1000)).toBe('1.00 s');
        expect(formatDuration(1902)).toBe('1.90 s');
    });
});
