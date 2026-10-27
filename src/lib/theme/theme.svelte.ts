import {MediaQuery} from 'svelte/reactivity';

import {shellEmbedding, type ShellEmbedding} from '../embedding/ShellEmbedding.svelte.js';
import {defaultStorage, readStored, writeStored, type StorageLike} from '../storage.js';
import {THEME_CHOICES, themeOf, type ResolvedTheme, type ThemeChoice} from './choices.js';

/** `system` -> `light` -> `dark` -> `system`, the order a theme button cycles through. */
export function nextTheme(choice: ThemeChoice): ThemeChoice {
    const index = THEME_CHOICES.indexOf(choice);
    return THEME_CHOICES[(index + 1) % THEME_CHOICES.length] ?? 'system';
}

/**
 * Puts a choice on the document: `light`/`dark` as `data-theme` on `<html>`, `system` as no
 * attribute at all, so `prefers-color-scheme` in `tokens.css` decides.
 */
export function applyTheme(choice: ThemeChoice, root: HTMLElement | undefined = defaultRoot()): void {
    if (!root) {
        return;
    }
    if (choice === 'system') {
        root.removeAttribute('data-theme');
    } else {
        root.setAttribute('data-theme', choice);
    }
}

function defaultRoot(): HTMLElement | undefined {
    return typeof document === 'undefined' ? undefined : document.documentElement;
}

/**
 * The page's theme: the app's own choice, or the shell's while the page is embedded in
 * openccu-lite's shell and follows it.
 */
export class ThemeState {
    /** The app's own choice, as its switch shows it and its storage keeps it. */
    choice = $state<ThemeChoice>('system');
    #shell = $state.raw<ShellEmbedding | undefined>(undefined);
    #dark: MediaQuery | undefined;

    /** The theme in effect: the shell's while embedded and following, the app's choice otherwise. */
    get value(): ThemeChoice {
        const shell = this.#shell;
        return shell?.embedded === true && shell.theme !== undefined ? shell.theme : this.choice;
    }

    /**
     * Whether the shell decides: an app hides its own theme switch then, because the shell has one.
     */
    get followsShell(): boolean {
        return this.#shell?.embedded === true;
    }

    /** `light` or `dark`, with `system` resolved through `prefers-color-scheme`. Reactive. */
    get resolved(): ResolvedTheme {
        const value = this.value;
        if (value !== 'system') {
            return value;
        }
        this.#dark ??= new MediaQuery('(prefers-color-scheme: dark)', false);
        return this.#dark.current ? 'dark' : 'light';
    }

    /** @internal set by `initTheme` */
    follow(shell: ShellEmbedding | undefined): void {
        this.#shell = shell;
    }
}

export const theme = new ThemeState();

interface ThemeSetup {
    storageKey: string | undefined;
    storage: StorageLike | undefined;
}

let setup: ThemeSetup = {storageKey: undefined, storage: undefined};

export interface InitThemeOptions {
    /** The `localStorage` key the app keeps its choice in (`myapp.theme`); none stores nothing. */
    readonly storageKey?: string | undefined;
    /**
     * `shell` (the default): inside openccu-lite's shell the page shows the shell's theme and
     * follows it. `none`: the app's own choice only - a page in a classic CCU's WebUI frame, say,
     * which has no shell message and follows the browser unless its own choice says otherwise.
     */
    readonly follow?: 'shell' | 'none';
    /** The storage to use; `localStorage` where the browser allows it. */
    readonly storage?: StorageLike | undefined;
    /** The embedding to follow; the page's shared one by default. */
    readonly shell?: ShellEmbedding | undefined;
    /** Where `data-theme` goes; `<html>` by default. `null` leaves the document alone. */
    readonly root?: HTMLElement | null | undefined;
}

/**
 * Reads the stored choice, starts following the shell and keeps `data-theme` on `<html>` in step
 * with the theme in effect. Call it once, before mounting the app. Returns a function that stops
 * it.
 */
export function initTheme(options: InitThemeOptions = {}): () => void {
    setup = {storageKey: options.storageKey, storage: options.storage ?? defaultStorage()};
    const stored = setup.storageKey === undefined ? undefined : themeOf(readStored(setup.storage, setup.storageKey));
    theme.choice = stored ?? 'system';
    theme.follow(options.follow === 'none' ? undefined : (options.shell ?? shellEmbedding()));
    const root = options.root === null ? undefined : (options.root ?? defaultRoot());
    if (root === undefined) {
        return () => {
            theme.follow(undefined);
        };
    }
    const stop = $effect.root(() => {
        $effect(() => {
            applyTheme(theme.value, root);
        });
    });
    return () => {
        stop();
        theme.follow(undefined);
    };
}

/** Sets and stores the app's own choice. */
export function setTheme(choice: ThemeChoice): void {
    theme.choice = choice;
    if (setup.storageKey !== undefined) {
        writeStored(setup.storage, setup.storageKey, choice);
    }
}

/** The next choice in the cycle, set and stored. */
export function cycleTheme(): void {
    setTheme(nextTheme(theme.choice));
}

/** Is the page dark right now? Reactive. */
export function isDark(): boolean {
    return theme.resolved === 'dark';
}

/** `light` or `dark`, right now. Reactive. */
export function resolvedTheme(): ResolvedTheme {
    return theme.resolved;
}
