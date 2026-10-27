import {LANG_COOKIE, readCookie} from '../embedding/constants.js';
import {shellEmbedding, type ShellEmbedding} from '../embedding/ShellEmbedding.svelte.js';
import {defaultStorage, readStored, writeStored, type StorageLike} from '../storage.js';
import {KIT_MESSAGES} from './messages.js';
import {
    createTranslator,
    mergeCatalogues,
    type Catalogue,
    type Language,
    type LanguageChoice,
    type LanguageCode,
    type MessageParams,
    type Translator,
} from './translator.js';

/** The languages the kit offers in its language switch. */
export const UI_LANGUAGES: readonly Language[] = ['de', 'en'];

/** English is what a browser that asks for nothing the UI has gets. */
export const FALLBACK_LANGUAGE: Language = 'en';

/** The name of each language in itself. An app with an extra fallback locale adds its own entry. */
export const LANGUAGE_LABELS: Readonly<Record<string, string>> = {
    de: 'Deutsch',
    en: 'English',
};

/**
 * What the browser prefers, in its own order; empty outside a browser.
 *
 * `navigator.languages` is typed as always there but is not on every engine, so the single
 * `navigator.language` is the fallback behind it.
 */
function navigatorLanguages(): readonly string[] {
    if (typeof navigator === 'undefined') {
        return [];
    }
    const list = navigator.languages as readonly string[] | undefined;
    if (list !== undefined && list.length > 0) {
        return list;
    }
    return navigator.language === '' ? [] : [navigator.language];
}

/** `de-AT` -> `de`; `undefined` for anything that is not one of {@link UI_LANGUAGES}. */
export function supportedLanguage(code: string | null | undefined): Language | undefined {
    if (code === undefined || code === null) {
        return undefined;
    }
    const base = code.toLowerCase().split('-')[0];
    return UI_LANGUAGES.find((candidate) => candidate === base);
}

/**
 * The language the browser asks for: the first entry of `navigator.languages` the UI has, English
 * behind it.
 *
 * Region subtags are dropped, so `de-DE`, `de-AT` and `de-CH` are all German and `en-GB` is
 * English; a browser that asks for French first and German second gets German, because the *order*
 * is what the user expressed.
 */
export function browserLanguage(languages: readonly string[] = navigatorLanguages()): Language {
    for (const entry of languages) {
        const supported = supportedLanguage(entry);
        if (supported !== undefined) {
            return supported;
        }
    }
    return FALLBACK_LANGUAGE;
}

/**
 * The language a UI starts in: a choice the user made and stored wins, and everything else -
 * `auto`, an absent value, a language the UI does not have - means the browser decides.
 */
export function resolveLanguage(
    stored: string | undefined,
    languages: readonly string[] = navigatorLanguages(),
): Language {
    const chosen = stored === undefined || stored === 'auto' ? undefined : UI_LANGUAGES.find((c) => c === stored);
    return chosen ?? browserLanguage(languages);
}

export interface I18nOptions {
    /**
     * The catalogue, or a function returning it. A function is read reactively, so a catalogue
     * that grows later (`addMessages`) re-renders what was translated with it.
     */
    readonly catalogue?: Catalogue | (() => Catalogue);
    /** Languages to try after the current one; English, then German by default. */
    readonly fallbacks?: readonly LanguageCode[];
}

/**
 * A language that can change at runtime, and the translation in it. Everything that called `t()`
 * in a template re-renders when the language changes.
 */
export class I18n {
    #language = $state<LanguageCode>(FALLBACK_LANGUAGE);
    readonly #catalogue: () => Catalogue;
    readonly #fallbacks: readonly LanguageCode[] | undefined;
    readonly #translator: Translator = $derived.by(() => {
        const catalogue = this.#catalogue();
        const fallbacks = this.#fallbacks;
        return createTranslator(this.#language, fallbacks === undefined ? {catalogue} : {catalogue, fallbacks});
    });

    constructor(language: LanguageCode = FALLBACK_LANGUAGE, options: I18nOptions = {}) {
        this.#language = language;
        const catalogue = options.catalogue ?? {};
        this.#catalogue = typeof catalogue === 'function' ? catalogue : () => catalogue;
        this.#fallbacks = options.fallbacks;
    }

    get language(): LanguageCode {
        return this.#language;
    }

    set language(language: LanguageCode) {
        this.#language = language;
    }

    /** `t('Close')`, `t('{count} more', {}, 7)`. Bound, so it can be passed around. */
    readonly t = (key: string, params: MessageParams = {}, count?: number): string =>
        this.#translator.t(key, params, count);

    /** Is there a text for this key at all? */
    readonly has = (key: string): boolean => this.#translator.has(key);

    /**
     * Every text of a key, in every language of the catalogue - for a filter that should match
     * what the reader may have read, whatever language it was in. The key comes first.
     */
    readonly translations = (key: string): string[] => {
        const catalogue = this.#catalogue();
        const entry = Object.prototype.hasOwnProperty.call(catalogue, key) ? catalogue[key] : undefined;
        // a plain Set: a local value that is returned as an array, never rendered from
        // eslint-disable-next-line svelte/prefer-svelte-reactivity -- see above
        const texts = new Set<string>([key]);
        for (const text of Object.values(entry ?? {})) {
            if (typeof text === 'string') {
                texts.add(text);
            } else if (text !== undefined) {
                texts.add(text.one);
                texts.add(text.other);
            }
        }
        return [...texts];
    };
}

export function createI18n(language: LanguageCode = FALLBACK_LANGUAGE, options: I18nOptions = {}): I18n {
    return new I18n(language, options);
}

// ------------------------------------------------------------------ the page's catalogue and language

let registry = $state.raw<Catalogue>(KIT_MESSAGES);

/**
 * Adds an app's (or an addon's) strings to the page's catalogue. May be called more than once;
 * later catalogues win over earlier ones and every app catalogue wins over the kit's, per key and
 * per language.
 */
export function addMessages(...catalogues: readonly Catalogue[]): void {
    registry = mergeCatalogues(registry, ...catalogues);
}

/** The page's catalogue as it is now: the kit's strings with every `addMessages()` on top. */
export function catalogue(): Catalogue {
    return registry;
}

/** Back to the kit's own strings only - for tests. */
export function resetMessages(): void {
    registry = KIT_MESSAGES;
}

/** The page's translation: the kit's components and every app that does not bring its own. */
export const i18n: I18n = new I18n(FALLBACK_LANGUAGE, {catalogue: () => registry});

/** `t('Close')` in the page's language; reactive in a template. */
export const t = i18n.t;
/** Is there a text for this key in the page's catalogue? */
export const has = i18n.has;
/** Every text of a key, in every language. */
export const translations = i18n.translations;

export interface InitI18nOptions {
    /** The `localStorage` key the app keeps its choice in (`myapp.language`); none stores nothing. */
    readonly storageKey?: string | undefined;
    /**
     * `shell` (the default): inside openccu-lite's shell the page speaks the shell's language and
     * follows it when it changes. `none`: the page's own choice and the browser only.
     */
    readonly follow?: 'shell' | 'none';
    /** Read the shell's `ol-lang` cookie when nothing is stored (default `true`). */
    readonly cookie?: boolean;
    /** The storage to use; `localStorage` where the browser allows it. */
    readonly storage?: StorageLike | undefined;
    /** The browser's languages; `navigator.languages` by default. */
    readonly languages?: readonly string[] | undefined;
    /** The embedding to follow; the page's shared one by default. */
    readonly shell?: ShellEmbedding | undefined;
    /** The document whose `lang` is set and whose cookie is read; `document` by default. */
    readonly document?: Document | undefined;
}

interface I18nSetup {
    storageKey: string | undefined;
    storage: StorageLike | undefined;
    languages: readonly string[] | undefined;
    document: Document | undefined;
}

let setup: I18nSetup = {
    storageKey: undefined,
    storage: undefined,
    languages: undefined,
    document: typeof document === 'undefined' ? undefined : document,
};

/** What the user chose: a language, or `auto`. Reactive; a language switch binds to it. */
export const languageChoice = $state<{value: LanguageChoice}>({value: 'auto'});

/**
 * Picks the page's language, in this order:
 *
 * 1. the shell's, when embedded in openccu-lite's shell and `follow` is `shell`;
 * 2. the app's own stored choice (`storageKey`);
 * 3. the shell's `ol-lang` cookie of this origin, when nothing is stored;
 * 4. the browser's languages, English behind them.
 *
 * Returns a function that stops following the shell.
 */
export function initI18n(options: InitI18nOptions = {}): () => void {
    setup = {
        storageKey: options.storageKey,
        storage: options.storage ?? defaultStorage(),
        languages: options.languages,
        document: options.document ?? (typeof document === 'undefined' ? undefined : document),
    };
    const stored = setup.storageKey === undefined ? undefined : readStored(setup.storage, setup.storageKey);
    const storedChoice: LanguageChoice | undefined = stored === 'auto' ? 'auto' : supportedLanguage(stored);
    languageChoice.value = storedChoice ?? 'auto';
    if (storedChoice !== undefined && storedChoice !== 'auto') {
        apply(storedChoice);
    } else {
        const fromCookie =
            storedChoice === undefined && options.cookie !== false
                ? supportedLanguage(readCookie(LANG_COOKIE, setup.document))
                : undefined;
        apply(fromCookie ?? browserLanguage(setup.languages ?? navigatorLanguages()));
    }

    if (options.follow === 'none') {
        return () => {};
    }
    const shell = options.shell ?? shellEmbedding();
    return $effect.root(() => {
        $effect(() => {
            const fromShell = shell.embedded ? supportedLanguage(shell.lang) : undefined;
            if (fromShell !== undefined) {
                apply(fromShell);
            }
        });
    });
}

/**
 * Sets the page's language: a language, or `auto` for the browser's. Stored under the app's key
 * (when `initI18n` was given one) and written to `<html lang>`; nothing else, the shell's cookie
 * least of all - that is the shell's to write.
 */
export function setLanguage(choice: LanguageChoice): void {
    languageChoice.value = choice;
    if (setup.storageKey !== undefined) {
        writeStored(setup.storage, setup.storageKey, choice);
    }
    apply(resolveLanguage(choice, setup.languages ?? navigatorLanguages()));
}

function apply(language: Language): void {
    i18n.language = language;
    if (setup.document?.documentElement) {
        setup.document.documentElement.lang = language;
    }
}
