import {flushSync} from 'svelte';
import {afterEach, describe, expect, it} from 'vitest';

import {ShellEmbedding} from '../embedding/ShellEmbedding.svelte.js';
import type {StorageLike} from '../storage.js';
import {
    addMessages,
    browserLanguage,
    catalogue,
    createI18n,
    has,
    i18n,
    initI18n,
    LANGUAGE_LABELS,
    languageChoice,
    resetMessages,
    resolveLanguage,
    setLanguage,
    t,
    translations,
    UI_LANGUAGES,
} from './i18n.svelte.js';
import {KIT_MESSAGES} from './messages.js';
import {
    createTranslator,
    DEFAULT_FALLBACKS,
    interpolate,
    mergeCatalogues,
    pluralCategory,
    type Catalogue,
} from './translator.js';

class MemoryStorage implements StorageLike {
    readonly map = new Map<string, string>();
    getItem(key: string): string | null {
        return this.map.get(key) ?? null;
    }
    setItem(key: string, value: string): void {
        this.map.set(key, value);
    }
}

/** A document as far as the i18n looks at one: a cookie and `<html lang>`. */
function fakeDocument(cookie = ''): Document {
    return {cookie, documentElement: {lang: ''}} as unknown as Document;
}

/** An embedding that is not one: a page of its own. */
function notEmbedded(): ShellEmbedding {
    return new ShellEmbedding(undefined);
}

afterEach(() => {
    resetMessages();
    i18n.language = 'en';
});

describe('the translator', () => {
    const catalogue: Catalogue = {
        Devices: {de: 'Geräte', en: 'Devices'},
        '{count} devices': {
            de: {one: '{count} Gerät', other: '{count} Geräte'},
            en: {one: '{count} device', other: '{count} devices'},
        },
        'only en': {en: 'only en'},
        'only de': {de: 'nur de'},
        both: {de: 'beide', en: 'both'},
    };

    it('separates exactly one from everything else in German and English', () => {
        expect(pluralCategory('de', 1)).toBe('one');
        expect(pluralCategory('en', 1)).toBe('one');
        expect(pluralCategory('de', 0)).toBe('other');
        expect(pluralCategory('en', 2)).toBe('other');
        expect(pluralCategory('de', -1)).toBe('other');
    });

    it('has no plural agreement in Turkish', () => {
        expect(pluralCategory('tr', 1)).toBe('other');
        expect(pluralCategory('tr', 5)).toBe('other');
    });

    it('fills placeholders and leaves one without a value alone', () => {
        expect(interpolate('Connected to {host}', {host: 'ccu'})).toBe('Connected to ccu');
        expect(interpolate('{a} and {b}', {a: 1, b: 2})).toBe('1 and 2');
        expect(interpolate('Connected to {host}', {})).toBe('Connected to {host}');
        expect(interpolate('Devices', {host: 'ccu'})).toBe('Devices');
    });

    it('translates, pluralises and fills {count}', () => {
        const de = createTranslator('de', {catalogue});
        expect(de.t('Devices')).toBe('Geräte');
        expect(de.t('{count} devices', {}, 1)).toBe('1 Gerät');
        expect(de.t('{count} devices', {}, 7)).toBe('7 Geräte');
        expect(createTranslator('en', {catalogue}).t('{count} devices', {}, 0)).toBe('0 devices');
        expect(de.language).toBe('de');
    });

    it('falls back English first, then German', () => {
        const tr = createTranslator('tr', {catalogue});
        expect(tr.t('only en')).toBe('only en');
        expect(tr.t('only de')).toBe('nur de');
        expect(tr.t('both')).toBe('both');
        expect(DEFAULT_FALLBACKS).toEqual(['en', 'de']);
    });

    it('takes a caller-supplied fallback chain', () => {
        expect(createTranslator('tr', {catalogue: {x: {de: 'de', en: 'en'}}, fallbacks: ['de', 'en']}).t('x')).toBe(
            'de',
        );
    });

    it('returns the key when nobody translated it, interpolated', () => {
        const translator = createTranslator('de');
        expect(translator.t('Never translated')).toBe('Never translated');
        expect(translator.has('Never translated')).toBe(false);
        expect(translator.t('Hello {name}', {name: 'world'})).toBe('Hello world');
    });

    it('returns the key when the entry exists but has no language of the chain', () => {
        const translator = createTranslator('de', {catalogue: {x: {tr: 'sadece tr'}}, fallbacks: []});
        expect(translator.has('x')).toBe(false);
        expect(translator.t('x')).toBe('x');
    });

    it('is not fooled by inherited object properties', () => {
        const translator = createTranslator('de');
        expect(translator.has('toString')).toBe(false);
        expect(translator.t('constructor')).toBe('constructor');
    });

    it('merges catalogues per key and per language, later ones winning', () => {
        const merged = mergeCatalogues(
            {Close: {de: 'Schließen', en: 'Close'}},
            {Close: {de: 'Zu'}},
            {Open: {en: 'Open'}},
        );
        expect(merged).toEqual({Close: {de: 'Zu', en: 'Close'}, Open: {en: 'Open'}});
    });
});

describe('I18n', () => {
    const catalogue: Catalogue = {Devices: {de: 'Geräte', en: 'Devices'}};

    it('re-translates when the language changes', () => {
        const local = createI18n('de', {catalogue});
        expect(local.t('Devices')).toBe('Geräte');
        local.language = 'en';
        expect(local.language).toBe('en');
        expect(local.t('Devices')).toBe('Devices');
    });

    it('starts in English when nobody says otherwise', () => {
        expect(createI18n().language).toBe('en');
    });

    it('lists every text of a key, the key first', () => {
        expect(createI18n('en', {catalogue}).translations('Devices')).toEqual(['Devices', 'Geräte']);
        expect(createI18n('en', {catalogue}).translations('unknown')).toEqual(['unknown']);
    });

    it('offers exactly the two languages the kit has', () => {
        expect(UI_LANGUAGES).toEqual(['de', 'en']);
        expect(LANGUAGE_LABELS['de']).toBe('Deutsch');
        expect(LANGUAGE_LABELS['en']).toBe('English');
    });
});

describe("the kit's catalogue", () => {
    it('has a German and an English text for every key', () => {
        for (const [key, entry] of Object.entries(KIT_MESSAGES)) {
            expect(entry['de'], `${key} has no German text`).toBeDefined();
            expect(entry['en'], `${key} has no English text`).toBeDefined();
        }
    });

    it('is the page catalogue before any app adds its own', () => {
        expect(catalogue()).toBe(KIT_MESSAGES);
        i18n.language = 'de';
        expect(t('Close')).toBe('Schließen');
        expect(t('{count} more', {}, 3)).toBe('3 weitere');
        expect(has('Close')).toBe(true);
        expect(translations('Close')).toEqual(['Close', 'Schließen']);
    });

    it('merges an app catalogue over its own, the app winning per language', () => {
        addMessages({Close: {de: 'Zumachen'}, Devices: {de: 'Geräte', en: 'Devices'}});
        addMessages({Devices: {de: 'Die Geräte'}});
        i18n.language = 'de';
        expect(t('Close')).toBe('Zumachen');
        expect(t('Devices')).toBe('Die Geräte');
        i18n.language = 'en';
        expect(t('Close')).toBe('Close');
        expect(t('Devices')).toBe('Devices');
        resetMessages();
        expect(t('Devices')).toBe('Devices');
        expect(has('Devices')).toBe(false);
    });
});

/**
 * The language a page starts in: the browser's with English as the fallback, and a choice the
 * user stored wins over the browser.
 */
describe('the language the page starts in', () => {
    describe('what the browser asks for', () => {
        it('takes the first supported entry, region subtag dropped', () => {
            expect(browserLanguage(['de-DE', 'en-US'])).toBe('de');
            expect(browserLanguage(['en-GB'])).toBe('en');
            expect(browserLanguage(['de-AT', 'de', 'en'])).toBe('de');
        });

        it('respects the order rather than a preference of ours', () => {
            expect(browserLanguage(['en-US', 'de-DE'])).toBe('en');
            expect(browserLanguage(['fr-FR', 'de-DE'])).toBe('de');
        });

        it('falls back to English for a language the kit does not have', () => {
            expect(browserLanguage(['fr'])).toBe('en');
            expect(browserLanguage(['tr-TR'])).toBe('en');
            expect(browserLanguage([])).toBe('en');
        });
    });

    describe('what wins', () => {
        const browser = ['de-DE', 'de', 'en'];

        it('lets a stored choice win over the browser', () => {
            expect(resolveLanguage('en', browser)).toBe('en');
            expect(resolveLanguage('de', ['en-US'])).toBe('de');
        });

        it('follows the browser for `auto`, for nothing stored and for a language it cannot show', () => {
            expect(resolveLanguage('auto', browser)).toBe('de');
            expect(resolveLanguage(undefined, browser)).toBe('de');
            expect(resolveLanguage('auto', ['fr'])).toBe('en');
            expect(resolveLanguage('tr', browser)).toBe('de');
        });
    });

    describe('initI18n', () => {
        it('takes the stored choice first', () => {
            const storage = new MemoryStorage();
            storage.setItem('app.language', 'de');
            const doc = fakeDocument('ol-lang=en');
            initI18n({storageKey: 'app.language', storage, languages: ['en'], document: doc, shell: notEmbedded()});
            expect(i18n.language).toBe('de');
            expect(languageChoice.value).toBe('de');
            expect(doc.documentElement.lang).toBe('de');
        });

        it("takes the shell's cookie when nothing is stored, and the browser behind it", () => {
            const storage = new MemoryStorage();
            const options = {storageKey: 'app.language', storage, shell: notEmbedded()};
            initI18n({...options, languages: ['en'], document: fakeDocument('x=1; ol-lang=de')});
            expect(i18n.language).toBe('de');
            expect(languageChoice.value).toBe('auto');

            initI18n({...options, languages: ['de'], document: fakeDocument()});
            expect(i18n.language).toBe('de');
            initI18n({...options, languages: ['fr'], document: fakeDocument()});
            expect(i18n.language).toBe('en');
        });

        it('lets a stored `auto` mean the browser, not the cookie', () => {
            const storage = new MemoryStorage();
            storage.setItem('app.language', 'auto');
            initI18n({
                storageKey: 'app.language',
                storage,
                languages: ['en'],
                document: fakeDocument('ol-lang=de'),
                shell: notEmbedded(),
            });
            expect(i18n.language).toBe('en');
        });

        it('ignores the cookie when told to', () => {
            initI18n({cookie: false, languages: ['en'], document: fakeDocument('ol-lang=de'), shell: notEmbedded()});
            expect(i18n.language).toBe('en');
        });

        it('stores a choice under the app key and writes <html lang>, never the cookie', () => {
            const storage = new MemoryStorage();
            const doc = fakeDocument('');
            initI18n({storageKey: 'app.language', storage, languages: ['en'], document: doc, follow: 'none'});
            setLanguage('de');
            expect(i18n.language).toBe('de');
            expect(storage.getItem('app.language')).toBe('de');
            expect(doc.documentElement.lang).toBe('de');
            expect(doc.cookie).toBe('');
            setLanguage('auto');
            expect(storage.getItem('app.language')).toBe('auto');
            expect(i18n.language).toBe('en');
        });

        it("follows the shell's language while embedded", () => {
            const shell = notEmbedded();
            const stop = initI18n({languages: ['en'], document: fakeDocument(), shell});
            expect(i18n.language).toBe('en');
            shell.embedded = true;
            shell.lang = 'de';
            flushSync();
            expect(i18n.language).toBe('de');
            shell.lang = 'en';
            flushSync();
            expect(i18n.language).toBe('en');
            stop();
            shell.lang = 'de';
            flushSync();
            expect(i18n.language).toBe('en');
        });

        it("does not follow the shell with follow: 'none'", () => {
            const shell = notEmbedded();
            shell.embedded = true;
            shell.lang = 'de';
            initI18n({languages: ['en'], document: fakeDocument(), shell, follow: 'none'});
            flushSync();
            expect(i18n.language).toBe('en');
        });
    });
});
