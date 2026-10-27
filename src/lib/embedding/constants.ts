/**
 * openccu-lite's embedding contract, frame side.
 *
 * The system's shell frames an addon's page as an iframe of the same origin. The frame URL carries
 * `theme=system|light|dark` and `lang=de|en` for the first paint, and the shell posts
 * `{type: SHELL_MESSAGE, theme, lang}` to the frame on load and on every change. For pages of the
 * same origin outside a frame, the shell keeps its choice in two cookies. The contract is the
 * shell's; these constants name it so both ends agree.
 */

/** The `type` of the message the shell posts to its frames. */
export const SHELL_MESSAGE = 'openccu-lite:theme';

/** The cookie the shell keeps its theme choice in. */
export const THEME_COOKIE = 'ol-theme';

/** The cookie the shell keeps its language in. */
export const LANG_COOKIE = 'ol-lang';

/** The frame URL's parameter for the theme. */
export const THEME_PARAM = 'theme';

/** The frame URL's parameter for the language. */
export const LANG_PARAM = 'lang';

/** The value of a cookie, or `undefined`; never throws (a sandboxed document refuses `cookie`). */
export function readCookie(
    name: string,
    doc: Document | undefined = typeof document === 'undefined' ? undefined : document,
): string | undefined {
    let cookies: string;
    try {
        cookies = doc?.cookie ?? '';
    } catch {
        return undefined;
    }
    for (const part of cookies.split(';')) {
        const index = part.indexOf('=');
        if (index < 0) {
            continue;
        }
        if (part.slice(0, index).trim() === name) {
            const raw = part.slice(index + 1).trim();
            try {
                return decodeURIComponent(raw);
            } catch {
                return raw;
            }
        }
    }
    return undefined;
}

/** The value of a URL search parameter, or `undefined`. */
export function searchParam(search: string, name: string): string | undefined {
    try {
        return new URLSearchParams(search).get(name) ?? undefined;
    } catch {
        return undefined;
    }
}
