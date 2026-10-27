import {flushSync} from 'svelte';
import {afterEach, describe, expect, it} from 'vitest';

import {ShellEmbedding} from '../embedding/ShellEmbedding.svelte.js';
import type {StorageLike} from '../storage.js';
import {THEME_CHOICES, themeOf} from './choices.js';
import {applyTheme, cycleTheme, initTheme, isDark, nextTheme, resolvedTheme, setTheme, theme} from './theme.svelte.js';

class MemoryStorage implements StorageLike {
    readonly map = new Map<string, string>();
    getItem(key: string): string | null {
        return this.map.get(key) ?? null;
    }
    setItem(key: string, value: string): void {
        this.map.set(key, value);
    }
}

function element(): HTMLElement {
    return document.createElement('div');
}

let stop: (() => void) | undefined;

afterEach(() => {
    stop?.();
    stop = undefined;
    theme.choice = 'system';
});

describe('the theme choices', () => {
    it('cycles system -> light -> dark -> system', () => {
        expect(THEME_CHOICES).toEqual(['system', 'light', 'dark']);
        expect(nextTheme('system')).toBe('light');
        expect(nextTheme('light')).toBe('dark');
        expect(nextTheme('dark')).toBe('system');
    });

    it('accepts only the three choices', () => {
        expect(themeOf('dark')).toBe('dark');
        expect(themeOf('purple')).toBeUndefined();
        expect(themeOf(undefined)).toBeUndefined();
    });

    it('puts light and dark on the document as data-theme and system as no attribute', () => {
        const root = element();
        applyTheme('dark', root);
        expect(root.getAttribute('data-theme')).toBe('dark');
        applyTheme('light', root);
        expect(root.getAttribute('data-theme')).toBe('light');
        applyTheme('system', root);
        expect(root.hasAttribute('data-theme')).toBe(false);
    });
});

describe('initTheme', () => {
    it("reads the app's stored choice and keeps data-theme in step", () => {
        const storage = new MemoryStorage();
        storage.setItem('app.theme', 'dark');
        const root = element();
        stop = initTheme({storageKey: 'app.theme', storage, root, follow: 'none'});
        flushSync();
        expect(theme.choice).toBe('dark');
        expect(root.getAttribute('data-theme')).toBe('dark');
        expect(isDark()).toBe(true);
        expect(resolvedTheme()).toBe('dark');

        setTheme('light');
        flushSync();
        expect(storage.getItem('app.theme')).toBe('light');
        expect(root.getAttribute('data-theme')).toBe('light');
        expect(isDark()).toBe(false);

        cycleTheme();
        flushSync();
        expect(theme.choice).toBe('dark');
        cycleTheme();
        flushSync();
        expect(theme.choice).toBe('system');
        expect(root.hasAttribute('data-theme')).toBe(false);
        expect(storage.getItem('app.theme')).toBe('system');
    });

    it('starts at system for nothing stored or garbage, and works without a storage', () => {
        const storage = new MemoryStorage();
        storage.setItem('app.theme', 'purple');
        stop = initTheme({storageKey: 'app.theme', storage, root: null, follow: 'none'});
        expect(theme.choice).toBe('system');
        stop();
        stop = initTheme({storage: undefined, root: null, follow: 'none'});
        setTheme('dark');
        expect(theme.choice).toBe('dark');
    });

    it('survives a storage that refuses to read and to write', () => {
        const refusing: StorageLike = {
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('quota');
            },
        };
        stop = initTheme({storageKey: 'app.theme', storage: refusing, root: null, follow: 'none'});
        setTheme('dark');
        expect(theme.choice).toBe('dark');
    });

    it("follows the shell's theme while embedded, and says so", () => {
        const shell = new ShellEmbedding(undefined);
        const root = element();
        const storage = new MemoryStorage();
        storage.setItem('app.theme', 'light');
        stop = initTheme({storageKey: 'app.theme', storage, shell, root});
        flushSync();
        expect(theme.followsShell).toBe(false);
        expect(root.getAttribute('data-theme')).toBe('light');

        shell.embedded = true;
        shell.theme = 'dark';
        flushSync();
        expect(theme.followsShell).toBe(true);
        expect(theme.value).toBe('dark');
        expect(root.getAttribute('data-theme')).toBe('dark');
        // the app's own choice is kept for when the page is opened on its own
        expect(theme.choice).toBe('light');

        shell.theme = 'system';
        flushSync();
        expect(root.hasAttribute('data-theme')).toBe(false);
    });

    it("ignores the shell with follow: 'none'", () => {
        const shell = new ShellEmbedding(undefined);
        shell.embedded = true;
        shell.theme = 'dark';
        const root = element();
        stop = initTheme({shell, root, follow: 'none', storage: undefined});
        flushSync();
        expect(theme.value).toBe('system');
        expect(root.hasAttribute('data-theme')).toBe(false);
    });

    it('resolves system through prefers-color-scheme', () => {
        stop = initTheme({root: null, follow: 'none', storage: undefined});
        const dark = matchMedia('(prefers-color-scheme: dark)').matches;
        expect(resolvedTheme()).toBe(dark ? 'dark' : 'light');
    });
});
