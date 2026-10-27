import {describe, expect, it} from 'vitest';

import {LANG_COOKIE, readCookie, searchParam, SHELL_MESSAGE, THEME_COOKIE} from './constants.js';
import {ShellEmbedding} from './ShellEmbedding.svelte.js';

type Listener = (event: MessageEvent) => void;

/** A window as far as ShellEmbedding looks at one: framed or not, its parent's origin (`cross`: another one), its URL. */
function fakeWindow(options: {framed: boolean; parentOrigin?: string; search?: string}): {
    win: Window;
    parent: object;
    send: (data: unknown, from?: {origin?: string; source?: unknown}) => void;
    listeners: Set<Listener>;
} {
    const listeners = new Set<Listener>();
    const origin = 'http://system.local';
    const parent = {
        get location(): {origin: string} {
            if (options.parentOrigin === 'cross') {
                throw new DOMException('Blocked a frame', 'SecurityError');
            }
            return {origin: options.parentOrigin ?? origin};
        },
    };
    const fake: Record<string, unknown> = {
        location: {origin, search: options.search ?? ''},
        addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
        removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
    };
    fake['self'] = fake;
    fake['top'] = options.framed ? parent : fake;
    fake['parent'] = options.framed ? parent : fake;
    const win = fake as unknown as Window;
    const send = (data: unknown, from: {origin?: string; source?: unknown} = {}): void => {
        for (const listener of listeners) {
            listener({
                data,
                origin: from.origin ?? origin,
                source: 'source' in from ? from.source : parent,
            } as MessageEvent);
        }
    };
    return {win, parent, send, listeners};
}

describe("openccu-lite's shell around the page", () => {
    it('is not there for a page of its own - a tab, a CCU, the desktop app', () => {
        const {win, send, listeners} = fakeWindow({framed: false, search: '?theme=dark'});
        const shell = new ShellEmbedding(win);
        expect(shell.embedded).toBe(false);
        expect(shell.theme).toBeUndefined();
        expect(listeners.size).toBe(0);
        send({type: 'openccu-lite:theme', theme: 'dark'});
        expect(shell.embedded).toBe(false);
    });

    it("is there in a frame of the system's origin with the shell's theme on the URL", () => {
        const shell = new ShellEmbedding(fakeWindow({framed: true, search: '?sid=@1@&theme=dark&lang=de'}).win);
        expect(shell.embedded).toBe(true);
        expect(shell.theme).toBe('dark');
        expect(shell.lang).toBe('de');
    });

    it("follows the shell's message, and only the shell's", () => {
        const {win, send} = fakeWindow({framed: true});
        const shell = new ShellEmbedding(win);
        // framed, but nothing from the shell yet: any other frame looks like this
        expect(shell.embedded).toBe(false);

        send({type: 'openccu-lite:theme', theme: 'light'}, {origin: 'http://elsewhere'});
        send({type: 'openccu-lite:theme', theme: 'light'}, {source: {}});
        send({type: 'set-theme', payload: {theme: 'dark'}});
        expect(shell.embedded).toBe(false);

        send({type: 'openccu-lite:theme', theme: 'light', lang: 'en'});
        expect(shell.embedded).toBe(true);
        expect(shell.theme).toBe('light');
        expect(shell.lang).toBe('en');
        send({type: 'openccu-lite:theme', theme: 'light', lang: 'de-DE'});
        expect(shell.lang).toBe('de');
        // a message without a language keeps the last one; garbage is not a language
        send({type: 'openccu-lite:theme', theme: 'light'});
        send({type: 'openccu-lite:theme', theme: 'light', lang: '<script>'});
        expect(shell.lang).toBe('de');
        send({type: 'openccu-lite:theme', theme: 'system'});
        expect(shell.theme).toBe('system');
        // a theme it does not know keeps the last one
        send({type: 'openccu-lite:theme', theme: 'purple'});
        expect(shell.theme).toBe('system');
        shell.dispose();
    });

    it('is not there in a frame of another origin, theme on the URL or not', () => {
        const {win, listeners} = fakeWindow({framed: true, parentOrigin: 'cross', search: '?theme=dark'});
        const shell = new ShellEmbedding(win);
        expect(shell.embedded).toBe(false);
        expect(listeners.size).toBe(0);
    });

    it('stops listening on dispose', () => {
        const {win, listeners} = fakeWindow({framed: true});
        const shell = new ShellEmbedding(win);
        expect(listeners.size).toBe(1);
        shell.dispose();
        expect(listeners.size).toBe(0);
    });
});

describe('the embedding contract', () => {
    it('names the message and the cookies the shell uses', () => {
        expect(SHELL_MESSAGE).toBe('openccu-lite:theme');
        expect(THEME_COOKIE).toBe('ol-theme');
        expect(LANG_COOKIE).toBe('ol-lang');
    });

    it('reads a cookie by name, and never throws', () => {
        const doc = (cookie: string): Document => ({cookie}) as unknown as Document;
        expect(readCookie('ol-lang', doc('a=1; ol-lang=de; b=2'))).toBe('de');
        expect(readCookie('ol-lang', doc('ol-language=xx'))).toBeUndefined();
        expect(readCookie('x', doc('x=%E2%9C%93'))).toBe('✓');
        expect(readCookie('x', doc('x=%E2'))).toBe('%E2');
        expect(readCookie('x', undefined)).toBeUndefined();
        const refusing = {
            get cookie(): string {
                throw new DOMException('sandboxed', 'SecurityError');
            },
        } as unknown as Document;
        expect(readCookie('x', refusing)).toBeUndefined();
    });

    it('reads a URL parameter', () => {
        expect(searchParam('?sid=@1@&theme=dark&lang=de', 'lang')).toBe('de');
        expect(searchParam('', 'lang')).toBeUndefined();
    });
});
