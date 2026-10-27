/** The two `localStorage` methods the kit uses; a test passes a `Map`-backed stub. */
export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

/** `localStorage`, or `undefined` where the browser refuses it (blocked site data throws on the accessor). */
export function defaultStorage(): StorageLike | undefined {
    try {
        return typeof localStorage === 'undefined' ? undefined : localStorage;
    } catch {
        return undefined;
    }
}

/** A stored value, or `undefined`; never throws. */
export function readStored(storage: StorageLike | undefined, key: string): string | undefined {
    try {
        return storage?.getItem(key) ?? undefined;
    } catch {
        return undefined;
    }
}

/** Stores a value; a full or refused storage loses it on the next reload, and nothing else. */
export function writeStored(storage: StorageLike | undefined, key: string, value: string): void {
    try {
        storage?.setItem(key, value);
    } catch {
        // see above
    }
}
