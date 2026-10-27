import type {StorageLike} from '../storage.js';
import {clampColumnWidth, sanitizeColumnWidths, type ColumnWidths} from './columnWidths.js';
import type {ColumnWidthPersistence} from './dataTableContext.js';

/** Scope -> table id -> column key -> pixels. */
type StoredWidths = Record<string, Record<string, Record<string, number>>>;

const NO_WIDTHS: ColumnWidths = Object.freeze({});

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Whatever is in the storage, reduced to what this store can use; nothing at all when it is garbage. */
function readStored(storage: StorageLike | undefined, storageKey: string): StoredWidths {
    let parsed: unknown;
    try {
        const raw = storage?.getItem(storageKey);
        parsed = raw == null ? undefined : JSON.parse(raw);
    } catch {
        return {};
    }
    const stored: StoredWidths = {};
    if (!isRecord(parsed)) {
        return stored;
    }
    for (const [profile, tables] of Object.entries(parsed)) {
        if (!isRecord(tables)) {
            continue;
        }
        const kept: Record<string, Record<string, number>> = {};
        for (const [tableId, widths] of Object.entries(tables)) {
            const clean = sanitizeColumnWidths(widths);
            if (Object.keys(clean).length > 0) {
                kept[tableId] = clean;
            }
        }
        if (Object.keys(kept).length > 0) {
            stored[profile] = kept;
        }
    }
    return stored;
}

export interface LocalColumnWidthsOptions {
    /** The `localStorage` key all widths are kept under (`myapp.columnWidths`). */
    readonly storageKey: string;
    /** The storage; `undefined` keeps the widths for as long as the store lives. */
    readonly storage: StorageLike | undefined;
    /**
     * The scope a width belongs to - a connection profile, a user. Read on every access, so a
     * scope that changes later (a configuration that arrives) switches the widths. One scope,
     * `default`, when absent.
     */
    readonly scope?: () => string;
}

/**
 * The column widths a user gave the tables, per scope and per table, kept in `localStorage`.
 *
 * A column width is a property of the screen it was dragged on - the same app is opened from a
 * phone and from a desktop, and one width for both would be wrong on one of them - so it lives in
 * the browser, not on a server. Keyed by a scope (a connection profile, say), so a scope switched to
 * another target starts from the designed widths and gets its own back when it is switched back.
 */
export class LocalColumnWidths implements ColumnWidthPersistence {
    #stored = $state.raw<StoredWidths>({});
    readonly #storage: StorageLike | undefined;
    readonly #storageKey: string;
    readonly #profile: () => string;

    constructor(options: LocalColumnWidthsOptions) {
        this.#storage = options.storage;
        this.#storageKey = options.storageKey;
        this.#profile = options.scope ?? (() => 'default');
        this.#stored = readStored(options.storage, options.storageKey);
    }

    /** The widths of one table in the current scope; empty when the user has not resized any. */
    widths(tableId: string): ColumnWidths {
        return this.#stored[this.#profile()]?.[tableId] ?? NO_WIDTHS;
    }
    set(tableId: string, key: string, width: number): void {
        const profile = this.#profile();
        const tables = this.#stored[profile] ?? {};
        const widths = tables[tableId] ?? {};
        const clamped = clampColumnWidth(width);
        if (widths[key] === clamped) {
            return;
        }
        this.#stored = {...this.#stored, [profile]: {...tables, [tableId]: {...widths, [key]: clamped}}};
        this.#write();
    }

    /** Back to the designed widths - every column of this table, in this scope only. */
    reset(tableId: string): void {
        const profile = this.#profile();
        const tables = this.#stored[profile];
        if (tables?.[tableId] === undefined) {
            return;
        }
        const rest = Object.fromEntries(Object.entries(tables).filter(([id]) => id !== tableId));
        const others = Object.fromEntries(Object.entries(this.#stored).filter(([name]) => name !== profile));
        this.#stored = Object.keys(rest).length === 0 ? others : {...others, [profile]: rest};
        this.#write();
    }

    #write(): void {
        try {
            this.#storage?.setItem(this.#storageKey, JSON.stringify(this.#stored));
        } catch {
            // A full or refused storage loses the width on the next reload, and nothing else.
        }
    }
}
