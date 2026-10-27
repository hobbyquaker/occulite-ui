/**
 * Message translation: `t(key, params, count)`.
 *
 * A missing translation is never an error: the chain is the requested language, then English,
 * then German, then the key itself, and interpolation happens either way. A half-translated UI is
 * usable, a UI that throws on a missing string is not. The key is the English text, so a
 * catalogue entry without `en` still reads correctly in English.
 */

/** The languages the kit has its own strings in. */
export type Language = 'de' | 'en';

/**
 * A language code a catalogue may carry beyond `de`/`en` (an app's own fallback locale, say).
 * `Language` is what the kit offers in its switches; `LanguageCode` is what it can look up.
 */
export type LanguageCode = Language | (string & {});

/** What a language switch stores: a language, or `auto` for "the browser decides". */
export type LanguageChoice = Language | 'auto';

/** The plural categories German and English need. */
export type PluralCategory = 'one' | 'other';

/** Values for the `{placeholders}` of a message. */
export type MessageParams = Readonly<Record<string, string | number>>;

/** A message: one string, or the two plural forms German and English need. */
export type MessageEntry = string | {readonly one: string; readonly other: string};

/** Message key -> language -> text. */
export type Catalogue = Readonly<Record<string, Readonly<Partial<Record<LanguageCode, MessageEntry>>>>>;

/** The default fallback chain: English is the key language, German the most complete one. */
export const DEFAULT_FALLBACKS: readonly LanguageCode[] = ['en', 'de'];

/**
 * Languages without plural agreement with a number: their `other` form is used for every count.
 * Turkish is the one an app of this family carries as a fallback locale.
 */
const NO_PLURAL_AGREEMENT: ReadonlySet<string> = new Set(['tr']);

/**
 * The plural category of a count. German and English agree: exactly one is `one`, everything else
 * (zero included) is `other`.
 */
export function pluralCategory(language: LanguageCode, count: number): PluralCategory {
    if (NO_PLURAL_AGREEMENT.has(language)) {
        return 'other';
    }
    return count === 1 ? 'one' : 'other';
}

/** Replaces `{name}` with the value; a placeholder without a value is left as it is. */
export function interpolate(template: string, params: MessageParams): string {
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
        const value = params[name];
        return value === undefined ? placeholder : String(value);
    });
}

export interface TranslatorOptions {
    /** The catalogue to look keys up in; empty by default. */
    readonly catalogue?: Catalogue;
    /** Languages to try after the requested one; {@link DEFAULT_FALLBACKS} by default. */
    readonly fallbacks?: readonly LanguageCode[];
}

/** Translates message keys into one language. Immutable; make a new one to switch languages. */
export class Translator {
    readonly language: LanguageCode;
    readonly #catalogue: Catalogue;
    readonly #chain: LanguageCode[];

    constructor(language: LanguageCode, options: TranslatorOptions = {}) {
        this.language = language;
        this.#catalogue = options.catalogue ?? {};
        const fallbacks = options.fallbacks ?? DEFAULT_FALLBACKS;
        this.#chain = [language, ...fallbacks.filter((candidate) => candidate !== language)];
    }

    /** Is there a text for this key in any language of the chain? */
    has(key: string): boolean {
        return this.#entry(key) !== undefined;
    }

    /**
     * The translated text.
     *
     * @param params values for the `{placeholders}`; `{count}` is filled from `count`.
     * @param count  selects the plural form and becomes the `{count}` placeholder.
     */
    t(key: string, params: MessageParams = {}, count?: number): string {
        const entry = this.#entry(key);
        const values = count === undefined ? params : {count, ...params};
        if (entry === undefined) {
            return interpolate(key, values);
        }
        const [text, language] = entry;
        if (typeof text === 'string') {
            return interpolate(text, values);
        }
        const category = pluralCategory(language, count ?? 0);
        return interpolate(text[category], values);
    }

    /** The first text for the key in the fallback chain, with the language it came from. */
    #entry(key: string): [MessageEntry, LanguageCode] | undefined {
        const message = Object.prototype.hasOwnProperty.call(this.#catalogue, key) ? this.#catalogue[key] : undefined;
        if (!message) {
            return undefined;
        }
        for (const language of this.#chain) {
            const text = message[language];
            if (text !== undefined) {
                return [text, language];
            }
        }
        return undefined;
    }
}

/** Shorthand for `new Translator(...)`. */
export function createTranslator(language: LanguageCode, options: TranslatorOptions = {}): Translator {
    return new Translator(language, options);
}

/**
 * Merges catalogues: later ones win, per key and per language, so a catalogue that only brings a
 * German text for a key keeps the English one of the catalogue before it.
 */
export function mergeCatalogues(...catalogues: readonly Catalogue[]): Catalogue {
    const merged: Record<string, Partial<Record<LanguageCode, MessageEntry>>> = {};
    for (const catalogue of catalogues) {
        for (const [key, entry] of Object.entries(catalogue)) {
            const before = Object.prototype.hasOwnProperty.call(merged, key) ? merged[key] : undefined;
            merged[key] = before === undefined ? {...entry} : {...before, ...entry};
        }
    }
    return merged;
}
