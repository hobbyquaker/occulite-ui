/** How loud a notice is: a receipt, something worth reading, or something that failed. */
export type NoticeLevel = 'info' | 'warn' | 'error';

export interface Notice {
    readonly id: number;
    readonly level: NoticeLevel;
    readonly message: string;
    /** What the notice is about (a connection, a service), shown beside the message. */
    readonly source?: string;
    /** Milliseconds since epoch. */
    readonly timestamp: number;
}

/** How many toasts are on screen at once; the rest collapse into a counter. */
export const VISIBLE_NOTICES = 5;

/** An informational toast is gone after this long, unless it was dismissed first. */
export const INFO_TTL_MS = 5_000;

/** A warning stays three times as long: it is worth reading, but not worth a click. */
export const WARN_TTL_MS = 15_000;

export interface NoticesStoreOptions {
    /** How many notices are kept at all; the oldest is dropped. */
    readonly max?: number;
    readonly now?: () => number;
    /** Lifetime of an `info` toast in ms; `0` keeps it until it is dismissed. */
    readonly infoTtlMs?: number;
    /** Lifetime of a `warn` toast in ms; `0` keeps it until it is dismissed. */
    readonly warnTtlMs?: number;
    /**
     * The hint a warning or an error calls for, or `undefined`. The store shows it once per
     * session as a toast of its own, after the notice that called for it - a hint that every
     * failure of the same kind would otherwise repeat.
     */
    readonly hintFor?: (message: string) => string | undefined;
}

/**
 * Everything the user should see but must not be interrupted by: a dismissable toast, and nothing
 * steals focus. A modal alert would close whatever else is open and could throw away a half-filled
 * dialog.
 *
 * Without rules the toasts pile into a wall that covers the bottom of the window. Three rules keep
 * the stack short, and they are deliberately different per level:
 *
 * - an `info` toast is a receipt ("this write went out"). It has been read by the time the next
 *   thing happens, so it expires on its own after {@link INFO_TTL_MS}.
 * - a `warn` gets {@link WARN_TTL_MS} - long enough to notice, short enough not to accumulate.
 * - an `error` never expires. Something failed; the user decides when that is dealt with.
 *
 * The last rule is why the on-screen cap ({@link VISIBLE_NOTICES}) is a *view* and not a drop: an
 * error must not be able to vanish behind five status messages, so what leaves the screen when the
 * sixth toast arrives stays in `items` and is counted. As the info toasts expire, the errors
 * underneath surface again on their own.
 */
export class NoticesStore {
    items = $state<Notice[]>([]);

    readonly #max: number;
    readonly #now: () => number;
    readonly #infoTtlMs: number;
    readonly #warnTtlMs: number;
    readonly #hintFor: ((message: string) => string | undefined) | undefined;
    /** The hints already shown in this session. Not reactive: nothing renders from it. */
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- see above
    readonly #hintsShown = new Set<string>();
    // Bookkeeping for the expiry timers, deliberately not reactive: nothing renders from it, and a
    // SvelteMap here would invalidate the toast stack on every timer that starts or is cleared.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- see above
    readonly #timers = new Map<number, ReturnType<typeof setTimeout>>();
    #nextId = 1;

    constructor(options: NoticesStoreOptions = {}) {
        this.#max = options.max ?? 20;
        this.#now = options.now ?? (() => Date.now());
        this.#infoTtlMs = options.infoTtlMs ?? INFO_TTL_MS;
        this.#warnTtlMs = options.warnTtlMs ?? WARN_TTL_MS;
        this.#hintFor = options.hintFor;
    }

    /** The newest {@link VISIBLE_NOTICES} - what the toast stack draws. */
    get visible(): Notice[] {
        return this.items.slice(Math.max(0, this.items.length - VISIBLE_NOTICES));
    }

    /** How many are held but not on screen; the "n more" counter. */
    get hidden(): number {
        return Math.max(0, this.items.length - VISIBLE_NOTICES);
    }

    /** Adds a notice and returns its id. `source` names what it is about. */
    push(level: NoticeLevel, message: string, source?: string): number {
        const id = this.#nextId;
        this.#nextId += 1;
        const notice: Notice = {
            id,
            level,
            message,
            timestamp: this.#now(),
            ...(source === undefined ? {} : {source}),
        };
        const items = [...this.items, notice];
        const dropped = items.length > this.#max ? items.slice(0, items.length - this.#max) : [];
        for (const gone of dropped) {
            this.#stopTimer(gone.id);
        }
        this.items = dropped.length > 0 ? items.slice(dropped.length) : items;
        this.#startTimer(id, level);
        if (level !== 'info') {
            this.#hint(message);
        }
        return id;
    }

    /** The hint a notice calls for, once per session; it stays until it is dismissed. */
    #hint(message: string): void {
        const hint = this.#hintFor?.(message);
        if (hint === undefined || hint === '' || this.#hintsShown.has(hint)) {
            return;
        }
        this.#hintsShown.add(hint);
        this.push('error', hint);
    }

    dismiss(id: number): void {
        this.#stopTimer(id);
        this.items = this.items.filter((notice) => notice.id !== id);
    }

    clear(): void {
        for (const id of [...this.#timers.keys()]) {
            this.#stopTimer(id);
        }
        this.items = [];
    }

    dispose(): void {
        this.clear();
    }

    /** The lifetime of a level, `0` for "until dismissed". */
    #ttl(level: NoticeLevel): number {
        if (level === 'info') {
            return this.#infoTtlMs;
        }
        return level === 'warn' ? this.#warnTtlMs : 0;
    }

    #startTimer(id: number, level: NoticeLevel): void {
        const ttl = this.#ttl(level);
        if (ttl <= 0) {
            return;
        }
        const timer = setTimeout(() => {
            this.#timers.delete(id);
            this.items = this.items.filter((notice) => notice.id !== id);
        }, ttl);
        // A toast must never be the reason a Node process (a jsdom test run) stays alive.
        (timer as unknown as {unref?: () => void}).unref?.();
        this.#timers.set(id, timer);
    }

    #stopTimer(id: number): void {
        const timer = this.#timers.get(id);
        if (timer !== undefined) {
            clearTimeout(timer);
            this.#timers.delete(id);
        }
    }
}
