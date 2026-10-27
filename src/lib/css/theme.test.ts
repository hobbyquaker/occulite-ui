import {fireEvent, render, screen} from '@testing-library/svelte';
import type {Component} from 'svelte';
import {afterEach, describe, expect, it} from 'vitest';

import appCss from './app.css?raw';
import baseCss from './base.css?raw';
import tokensCss from './tokens.css?raw';
import './app.css';
import DataTableComponent from '../components/DataTable.svelte';
import Notices from '../components/Notices.svelte';
import ToolbarButton from '../components/ToolbarButton.svelte';
import type {Notice} from '../notices/NoticesStore.svelte.js';

/**
 * Light and dark are both requirements, not a nicety. What is asserted is the contract that makes
 * the two themes work at all, and it catches the regressions that actually happen:
 *
 * 1. every colour token is defined three times - `:root`, the `prefers-color-scheme: dark` block
 *    guarded against an explicit light choice, and `[data-theme='dark']` - and the dark value
 *    really differs from the light one;
 * 2. text stays legible on its surface in both themes (WCAG contrast, computed from the tokens);
 * 3. no component hard-codes a colour, so switching a token switches every component;
 * 4. the elements whose colour carries meaning keep their semantic class in both themes, i.e. the
 *    theme changes tokens and never structure.
 */

/** A generic component resolves its type parameter to `unknown` when `render()` gets it. */
const DataTable = DataTableComponent as unknown as Component<Record<string, unknown>>;

/** The tokens where the colour means something rather than just decorating. */
const MEANINGFUL_TOKENS = [
    '--hmm-ok',
    '--hmm-error',
    '--hmm-warn',
    '--hmm-accent',
    '--hmm-accent-fg',
    '--hmm-row-selected',
    '--hmm-row-selected-text',
    '--hmm-fg',
    '--hmm-bg',
    '--hmm-border',
    // the flat surfaces: a bar, a button face and an input field have to be legible in both
    // themes exactly like the text on them
    '--hmm-header-bg',
    '--hmm-control-bg',
    '--hmm-input-bg',
    '--hmm-overlay',
    '--hmm-backdrop',
    '--hmm-shadow-menu',
    '--hmm-shadow-toast',
];

function block(css: string, selector: string): string {
    const start = css.indexOf(selector);
    expect(start, `${selector} is missing from tokens.css`).toBeGreaterThanOrEqual(0);
    const open = css.indexOf('{', start);
    const end = css.indexOf('\n}', open);
    return css.slice(open, end);
}

function tokenValue(source: string, token: string): string | undefined {
    const match = new RegExp(`${token}:\\s*([^;]+);`).exec(source);
    return match?.[1]?.trim();
}

const lightBlock = block(tokensCss, ':root {');
const mediaBlock = block(tokensCss, "@media (prefers-color-scheme: dark) {\n    :root:not([data-theme='light'])");
const darkBlock = block(tokensCss, ":root[data-theme='dark'] {");

/** WCAG 2 relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
    expect(hex, `${hex} is not a #rrggbb colour`).toMatch(/^#[0-9a-f]{6}$/i);
    const [red, green, blue] = [1, 3, 5].map((start) => {
        const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
        return channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
    const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a) as [number, number];
    return (lighter + 0.05) / (darker + 0.05);
}

describe('the theme tokens', () => {
    it('defines every meaningful colour in light, in the media query and under [data-theme=dark]', () => {
        for (const token of MEANINGFUL_TOKENS) {
            const light = tokenValue(lightBlock, token);
            const media = tokenValue(mediaBlock, token);
            const dark = tokenValue(darkBlock, token);

            expect(light, `${token} has no light value`).toBeDefined();
            expect(media, `${token} is not redefined for prefers-color-scheme: dark`).toBeDefined();
            expect(dark, `${token} is not redefined for the manual dark theme`).toBeDefined();
            expect(dark, `${token} is the same in both themes`).not.toBe(light);
            expect(media, `${token} differs between the media query and the manual dark theme`).toBe(dark);
        }
    });

    it('defines the same tokens in the media query and under [data-theme=dark]', () => {
        const names = (source: string): string[] => [...source.matchAll(/(--[\w-]+):/g)].map((m) => m[1]!).sort();
        expect(names(mediaBlock)).toEqual(names(darkBlock));
    });

    it('guards the media query so an explicit light choice still wins', () => {
        expect(tokensCss).toContain('@media (prefers-color-scheme: dark)');
        expect(tokensCss).toContain(":root:not([data-theme='light'])");
    });

    it('sets color-scheme in both themes, so form controls follow', () => {
        expect(lightBlock).toContain('color-scheme: light');
        expect(mediaBlock).toContain('color-scheme: dark');
        expect(darkBlock).toContain('color-scheme: dark');
    });

    it('has no gradient anywhere: the surfaces are flat', () => {
        expect(tokensCss + baseCss).not.toContain('gradient(');
    });

    it('paints the body explicitly rather than inheriting the host background', () => {
        expect(baseCss).toMatch(/\nbody \{[^}]*background: var\(--hmm-bg\)/);
        expect(baseCss).toMatch(/\nbody \{[^}]*color: var\(--hmm-fg\)/);
    });

    it('keeps app.css as the tokens followed by the base rules', () => {
        expect(appCss).toMatch(/@import '\.\/tokens\.css';\s*@import '\.\/base\.css';/);
    });

    it('keeps tokens.css to custom properties: no rule outside the three blocks', () => {
        const withoutComments = tokensCss.replace(/\/\*[\s\S]*?\*\//g, '');
        const selectors = [...withoutComments.matchAll(/^([^\s{}][^{]*)\{/gm)].map((m) => m[1]!.trim());
        expect(selectors).toEqual([':root', '@media (prefers-color-scheme: dark)', ":root[data-theme='dark']"]);
    });

    /** The dark palette is the blue-grey one, not a neutral grey on grey. */
    it('uses the blue-grey dark palette', () => {
        expect(tokenValue(darkBlock, '--hmm-bg')).toBe('#1b1f26');
        expect(tokenValue(darkBlock, '--hmm-fg')).toBe('#ccd2dc');
        for (const token of ['--hmm-bg', '--hmm-header-bg', '--hmm-control-bg', '--hmm-input-bg', '--hmm-border']) {
            const hex = tokenValue(darkBlock, token) ?? '';
            const [red, , blue] = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
            expect(blue! > red!, `${token} ${hex} is not blue-grey`).toBe(true);
        }
    });

    describe('legibility', () => {
        /** Text token -> surface token, each at least 4.5 : 1 (WCAG AA for small text). */
        const pairs = [
            ['--hmm-fg', '--hmm-bg'],
            ['--hmm-fg', '--hmm-header-bg'],
            ['--hmm-fg', '--hmm-control-bg'],
            ['--hmm-fg', '--hmm-input-bg'],
            ['--hmm-fg-muted', '--hmm-bg'],
            ['--hmm-link', '--hmm-bg'],
            ['--hmm-row-selected-text', '--hmm-row-selected'],
            ['--hmm-accent-fg', '--hmm-accent'],
            ['--hmm-error', '--hmm-bg'],
            ['--hmm-warn', '--hmm-bg'],
            ['--hmm-ok', '--hmm-bg'],
        ] as const;

        for (const [name, source] of [
            ['light', lightBlock],
            ['dark', darkBlock],
        ] as const) {
            it(`keeps text at 4.5 : 1 or better on its surface in ${name}`, () => {
                for (const [ink, surface] of pairs) {
                    const fg = tokenValue(source, ink) ?? '';
                    const bg = tokenValue(source, surface) ?? '';
                    expect(contrast(fg, bg), `${name}: ${ink} ${fg} on ${surface} ${bg}`).toBeGreaterThanOrEqual(4.5);
                }
            });
        }
    });
});

describe('the components', () => {
    /** Every `.svelte` file of the kit, as source, so the styles can be inspected. */
    const sources = import.meta.glob('../**/*.svelte', {query: '?raw', import: 'default', eager: true}) as Record<
        string,
        string
    >;

    it('has more than a handful of components to check', () => {
        expect(Object.keys(sources).length).toBeGreaterThan(15);
    });

    it('hard-codes no colour anywhere - every colour comes from a token', () => {
        const offenders: string[] = [];
        for (const [path, source] of Object.entries(sources)) {
            const styles = /<style>([\s\S]*?)<\/style>/.exec(source)?.[1] ?? '';
            for (const line of styles.split('\n')) {
                if (/^\s*\/\*/.test(line)) {
                    continue;
                }
                if (/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|:\s*(white|black|red|green|blue|gray|grey)\b/.test(line)) {
                    offenders.push(`${path}: ${line.trim()}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });

    it('uses only tokens that tokens.css defines', () => {
        const defined = new Set([...tokensCss.matchAll(/(--hmm-[\w-]+):/g)].map((m) => m[1]!));
        const missing = new Set<string>();
        for (const [path, source] of Object.entries(sources)) {
            for (const match of source.matchAll(/var\((--hmm-[\w-]+)\s*[,)]/g)) {
                // a token with a fallback inside the var() is the app's to define
                const fallback = source.slice(match.index + match[0].length - 1, match.index + match[0].length) === ',';
                // a custom property the component sets itself (`style:--x={…}`, `--x: …`) is local
                const local = source.includes(`style:${match[1]!}`) || source.includes(`${match[1]!}:`);
                if (!defined.has(match[1]!) && !fallback && !local) {
                    missing.add(`${path}: ${match[1]!}`);
                }
            }
        }
        expect([...missing]).toEqual([]);
    });
});

describe('colours that carry meaning', () => {
    afterEach(() => {
        document.documentElement.removeAttribute('data-theme');
    });

    const notices: Notice[] = [
        {id: 1, level: 'info', message: 'info', timestamp: 0},
        {id: 2, level: 'warn', message: 'warn', timestamp: 0},
        {id: 3, level: 'error', message: 'error', timestamp: 0},
    ];

    for (const theme of ['light', 'dark'] as const) {
        it(`marks the notice severities in the ${theme} theme`, () => {
            document.documentElement.setAttribute('data-theme', theme);
            const {container} = render(Notices, {props: {notices}});

            expect(container.querySelectorAll('.hmm-notice')).toHaveLength(3);
            expect(container.querySelectorAll('.hmm-notice-warn')).toHaveLength(1);
            expect(container.querySelectorAll('.hmm-notice-error')).toHaveLength(1);
        });

        it(`marks the selected row in the ${theme} theme`, async () => {
            document.documentElement.setAttribute('data-theme', theme);
            const {container} = render(DataTable, {
                props: {
                    rows: [
                        {id: 'A', name: 'A'},
                        {id: 'B', name: 'B'},
                    ],
                    columns: [{key: 'name', label: 'Name'}],
                    getId: (row: {id: string}) => row.id,
                    height: 100,
                },
            });

            const row = container.querySelectorAll('.hmm-tr')[1];
            await fireEvent.click(row!);
            expect(row?.classList.contains('hmm-tr-selected')).toBe(true);
        });

        it(`marks a disabled toolbar button in the ${theme} theme`, () => {
            document.documentElement.setAttribute('data-theme', theme);
            render(ToolbarButton, {props: {title: 'Delete', disabled: true}});
            expect(screen.getByRole<HTMLButtonElement>('button', {name: 'Delete'}).disabled).toBe(true);
        });
    }

    it.skipIf(document.body.getBoundingClientRect().width === 0)(
        'switches a token on the page when data-theme changes',
        () => {
            const probe = (): string => getComputedStyle(document.documentElement).getPropertyValue('--hmm-bg').trim();
            document.documentElement.setAttribute('data-theme', 'light');
            expect(probe()).toBe('#ffffff');
            document.documentElement.setAttribute('data-theme', 'dark');
            expect(probe()).toBe('#1b1f26');
        },
    );
});
