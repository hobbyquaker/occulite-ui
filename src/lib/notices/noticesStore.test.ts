import {describe, expect, it, vi} from 'vitest';

import {NoticesStore} from './NoticesStore.svelte.js';

describe('NoticesStore', () => {
    it('holds what is pushed, with its source', () => {
        const notices = new NoticesStore({now: () => 5});
        notices.push('warn', 'The server is not answering', 'server');
        notices.push('info', 'Saved');

        expect(notices.items).toEqual([
            {
                id: 1,
                level: 'warn',
                message: 'The server is not answering',
                source: 'server',
                timestamp: 5,
            },
            {id: 2, level: 'info', message: 'Saved', timestamp: 5},
        ]);
    });

    it('drops the oldest notice above the maximum, dismisses and clears', () => {
        const notices = new NoticesStore({max: 2});
        notices.push('info', 'one');
        const second = notices.push('info', 'two');
        notices.push('info', 'three');

        expect(notices.items.map((notice) => notice.message)).toEqual(['two', 'three']);
        notices.dismiss(second);
        expect(notices.items.map((notice) => notice.message)).toEqual(['three']);
        notices.clear();
        expect(notices.items).toEqual([]);
    });

    /**
     * The cap is a *view*: what leaves the screen is still held and counted, because an error never
     * expires and must not be pushed out of existence by five status messages.
     */
    it('shows at most five and counts the rest', () => {
        const notices = new NoticesStore();
        for (let index = 1; index <= 7; index += 1) {
            notices.push('error', `error ${index}`);
        }

        expect(notices.items).toHaveLength(7);
        expect(notices.visible.map((notice) => notice.message)).toEqual([
            'error 3',
            'error 4',
            'error 5',
            'error 6',
            'error 7',
        ]);
        expect(notices.hidden).toBe(2);
    });

    it('has nothing hidden while the stack is short', () => {
        const notices = new NoticesStore();
        notices.push('error', 'one');
        expect(notices.visible.map((notice) => notice.message)).toEqual(['one']);
        expect(notices.hidden).toBe(0);
    });

    it('expires an info toast, gives a warning longer and keeps an error until it is dismissed', async () => {
        vi.useFakeTimers();
        try {
            const notices = new NoticesStore({infoTtlMs: 5000, warnTtlMs: 15_000});
            notices.push('info', 'written');
            notices.push('warn', 'slow');
            const failure = notices.push('error', 'failed');

            await vi.advanceTimersByTimeAsync(5000);
            expect(notices.items.map((notice) => notice.message)).toEqual(['slow', 'failed']);

            await vi.advanceTimersByTimeAsync(10_000);
            expect(notices.items.map((notice) => notice.message)).toEqual(['failed']);

            await vi.advanceTimersByTimeAsync(600_000);
            expect(notices.items).toHaveLength(1);

            notices.dismiss(failure);
            expect(notices.items).toEqual([]);
        } finally {
            vi.useRealTimers();
        }
    });

    it('never expires anything when the lifetimes are zero', async () => {
        vi.useFakeTimers();
        try {
            const notices = new NoticesStore({infoTtlMs: 0, warnTtlMs: 0});
            notices.push('info', 'stays');
            notices.push('warn', 'stays too');
            await vi.advanceTimersByTimeAsync(600_000);
            expect(notices.items).toHaveLength(2);
        } finally {
            vi.useRealTimers();
        }
    });

    it('forgets the timer of a dismissed notice, so a later one keeps its own lifetime', async () => {
        vi.useFakeTimers();
        try {
            const notices = new NoticesStore({infoTtlMs: 1000});
            const first = notices.push('info', 'one');
            notices.dismiss(first);
            notices.push('info', 'two');

            await vi.advanceTimersByTimeAsync(999);
            expect(notices.items.map((notice) => notice.message)).toEqual(['two']);
            await vi.advanceTimersByTimeAsync(1);
            expect(notices.items).toEqual([]);
        } finally {
            vi.useRealTimers();
        }
    });

    it('stops every timer on dispose', async () => {
        vi.useFakeTimers();
        try {
            const notices = new NoticesStore({infoTtlMs: 1000});
            notices.push('info', 'one');
            notices.dispose();
            expect(notices.items).toEqual([]);
            await vi.advanceTimersByTimeAsync(2000);
            expect(notices.items).toEqual([]);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('NoticesStore: hintFor', () => {
    const BLOCKED = 'connect EHOSTUNREACH 192.0.2.9:2001';

    it('adds the hint once, after the first warning or error that calls for it', () => {
        const asked: string[] = [];
        const notices = new NoticesStore({
            hintFor: (message) => {
                asked.push(message);
                return message.includes('EHOSTUNREACH') ? 'the hint' : undefined;
            },
        });
        notices.push('info', 'EHOSTUNREACH in an info');
        expect(asked).toEqual([]);

        notices.push('warn', BLOCKED, 'server');
        notices.push('error', `again: ${BLOCKED}`);
        expect(notices.items.map((notice) => notice.message)).toEqual([
            'EHOSTUNREACH in an info',
            BLOCKED,
            'the hint',
            `again: ${BLOCKED}`,
        ]);
        // an error: it stays until it is dismissed, and dismissing it does not bring it back
        const hint = notices.items.find((notice) => notice.message === 'the hint')!;
        expect(hint.level).toBe('error');
        notices.dismiss(hint.id);
        notices.push('warn', BLOCKED);
        expect(notices.items.filter((notice) => notice.message === 'the hint')).toEqual([]);
    });

    it('adds nothing without hintFor, or for an empty hint', () => {
        expect(new NoticesStore().push('warn', BLOCKED)).toBe(1);
        const empty = new NoticesStore({hintFor: () => ''});
        empty.push('error', BLOCKED);
        expect(empty.items).toHaveLength(1);
    });
});
