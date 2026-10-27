import {describe, expect, it} from 'vitest';

import type {StorageLike} from '../storage.js';
import {LocalColumnWidths} from './LocalColumnWidths.svelte.js';

const COLUMN_WIDTHS_STORAGE_KEY = 'test.columnWidths';

/** The store the tests use: the key above, a scope function. */
function columnWidthsStore(storage: StorageLike | undefined, scope: () => string): LocalColumnWidths {
    return new LocalColumnWidths({storage, storageKey: COLUMN_WIDTHS_STORAGE_KEY, scope});
}

class MemoryStorage implements StorageLike {
    readonly map = new Map<string, string>();
    getItem(key: string): string | null {
        return this.map.get(key) ?? null;
    }
    setItem(key: string, value: string): void {
        this.map.set(key, value);
    }
}

/**
 * The widths a user dragged are kept per table and per scope, survive a reload, and go back to the
 * designed ones on request.
 */
describe('LocalColumnWidths', () => {
    it('keeps the widths of each table apart', () => {
        const store = columnWidthsStore(new MemoryStorage(), () => 'ccu');
        store.set('devices', 'name', 260);
        store.set('links', 'name', 90);
        store.set('devices', 'rooms', 180);

        expect(store.widths('devices')).toEqual({name: 260, rooms: 180});
        expect(store.widths('links')).toEqual({name: 90});
        expect(store.widths('events')).toEqual({});
    });

    it('clamps what it is given', () => {
        const store = columnWidthsStore(new MemoryStorage(), () => 'ccu');
        store.set('devices', 'name', 3);
        expect(store.widths('devices')).toEqual({name: 40});
    });

    it('survives a reload: a new store on the same storage has the widths', () => {
        const storage = new MemoryStorage();
        columnWidthsStore(storage, () => 'ccu').set('radio', 'TYPE', 210);

        expect(columnWidthsStore(storage, () => 'ccu').widths('radio')).toEqual({TYPE: 210});
        expect(JSON.parse(storage.getItem(COLUMN_WIDTHS_STORAGE_KEY)!)).toEqual({ccu: {radio: {TYPE: 210}}});
    });

    it('resets one table and leaves the others and the other profiles alone', () => {
        const storage = new MemoryStorage();
        let profile = 'ccu-a';
        const store = columnWidthsStore(storage, () => profile);
        store.set('devices', 'name', 260);
        store.set('links', 'name', 90);
        profile = 'ccu-b';
        store.set('devices', 'name', 300);
        profile = 'ccu-a';

        store.reset('devices');
        expect(store.widths('devices')).toEqual({});
        expect(store.widths('links')).toEqual({name: 90});
        profile = 'ccu-b';
        expect(store.widths('devices')).toEqual({name: 300});

        store.reset('devices');
        // the last table of a profile takes the profile with it, and a second reset is a no-op
        expect(JSON.parse(storage.getItem(COLUMN_WIDTHS_STORAGE_KEY)!)).toEqual({'ccu-a': {links: {name: 90}}});
        store.reset('devices');
    });

    it('does not write when nothing changed', () => {
        const storage = new MemoryStorage();
        const store = columnWidthsStore(storage, () => 'ccu');
        store.set('devices', 'name', 260);
        storage.map.clear();
        store.set('devices', 'name', 260);
        expect(storage.map.size).toBe(0);
    });

    it('starts from the designed widths when the storage holds garbage', () => {
        for (const garbage of ['{', '[1,2]', '"wide"', JSON.stringify({ccu: [1], other: {devices: 'x'}})]) {
            const storage = new MemoryStorage();
            storage.setItem(COLUMN_WIDTHS_STORAGE_KEY, garbage);
            expect(columnWidthsStore(storage, () => 'ccu').widths('devices')).toEqual({});
        }
        const mixed = new MemoryStorage();
        mixed.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify({ccu: {devices: {name: 250, type: 'x'}, empty: {}}}));
        expect(columnWidthsStore(mixed, () => 'ccu').widths('devices')).toEqual({name: 250});
    });

    it('works without a storage and with one that refuses to write', () => {
        const none = columnWidthsStore(undefined, () => 'ccu');
        none.set('devices', 'name', 250);
        expect(none.widths('devices')).toEqual({name: 250});

        const refusing: StorageLike = {
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('quota');
            },
        };
        const store = columnWidthsStore(refusing, () => 'ccu');
        store.set('devices', 'name', 250);
        expect(store.widths('devices')).toEqual({name: 250});
    });

    it('uses one scope when none is given', () => {
        const storage = new MemoryStorage();
        const store = new LocalColumnWidths({storage, storageKey: 'k'});
        store.set('devices', 'name', 200);
        expect(JSON.parse(storage.getItem('k')!)).toEqual({default: {devices: {name: 200}}});
    });
});
