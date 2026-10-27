import {themeOf, type ThemeChoice} from '../theme/choices.js';
import {LANG_PARAM, SHELL_MESSAGE, searchParam, THEME_PARAM} from './constants.js';

/**
 * Whether the page runs inside openccu-lite's shell - the system's menu chrome around an addon
 * page - and which theme and language the shell shows.
 *
 * Inside that frame the shell has the user, the logout and the theme of its own, so a page leaves
 * those controls out and follows the shell. Being on openccu-lite is not enough: the same page
 * opened full screen in a tab of its own, on a classic CCU or in a desktop app keeps every control.
 * So "inside the shell" is a framed page whose parent is of its own origin, *and* the shell's theme
 * on the URL or the shell's message from that parent - a CCU or any other frame sends neither.
 */
export class ShellEmbedding {
    /** Inside openccu-lite's shell. */
    embedded = $state(false);
    /** The shell's theme while embedded; `undefined` outside, where the app's own choice applies. */
    theme = $state<ThemeChoice | undefined>(undefined);
    /** The shell's language while embedded, as the shell names it (`de`, `en`); `undefined` outside. */
    lang = $state<string | undefined>(undefined);

    readonly #win: Window | undefined;
    readonly #onMessage = (event: MessageEvent): void => {
        this.#message(event);
    };

    constructor(win: Window | undefined = typeof window === 'undefined' ? undefined : window) {
        this.#win = win;
        if (!win || !framedBySameOrigin(win)) {
            return;
        }
        const fromUrl = themeOf(searchParam(win.location.search, THEME_PARAM));
        if (fromUrl !== undefined) {
            this.embedded = true;
            this.theme = fromUrl;
            this.lang = langOf(searchParam(win.location.search, LANG_PARAM));
        }
        win.addEventListener('message', this.#onMessage);
    }

    #message(event: MessageEvent): void {
        const win = this.#win;
        if (!win || event.origin !== win.location.origin || event.source !== win.parent) {
            return;
        }
        const data = event.data as {type?: unknown; theme?: unknown; lang?: unknown} | null;
        if (data === null || typeof data !== 'object' || data.type !== SHELL_MESSAGE) {
            return;
        }
        this.embedded = true;
        this.theme = themeOf(data.theme) ?? this.theme ?? 'system';
        this.lang = langOf(data.lang) ?? this.lang;
    }

    dispose(): void {
        this.#win?.removeEventListener('message', this.#onMessage);
    }
}

/** A language code as the shell sends one: two or three letters, region dropped. */
function langOf(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const code = value.toLowerCase().split('-')[0] ?? '';
    return /^[a-z]{2,3}$/u.test(code) ? code : undefined;
}

/** A frame whose parent is a page of this origin; a cross-origin parent throws on `location`. */
function framedBySameOrigin(win: Window): boolean {
    try {
        return win.self !== win.top && win.parent.location.origin === win.location.origin;
    } catch {
        return false;
    }
}

let shared: ShellEmbedding | undefined;

/**
 * The page's one `ShellEmbedding`, created on first use: the theme and the language both follow
 * the same shell, and two listeners for one message would only be two places to get it wrong.
 */
export function shellEmbedding(): ShellEmbedding {
    shared ??= new ShellEmbedding();
    return shared;
}
