/** What a theme switch stores: `system` lets `prefers-color-scheme` decide. */
export type ThemeChoice = 'system' | 'light' | 'dark';

/** The order the theme switch cycles through. */
export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

/** The theme a choice resolves to on screen. */
export type ResolvedTheme = 'light' | 'dark';

/** A theme choice, or `undefined` for anything else (a stored value from an older app, a URL parameter). */
export function themeOf(value: unknown): ThemeChoice | undefined {
    return value === 'system' || value === 'light' || value === 'dark' ? value : undefined;
}
