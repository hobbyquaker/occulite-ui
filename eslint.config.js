import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import * as svelteParser from 'svelte-eslint-parser';
import tseslint from 'typescript-eslint';

import svelteConfig from './svelte.config.js';

/**
 * The questions a page asks go through the kit's own dialog, never through the browser's modal
 * boxes: `window.confirm`, `prompt` and `alert` block the page, cannot be styled or translated and
 * are suppressed inside some frames. Exported, so a consumer can spread it into its own config.
 */
export const noBrowserDialogs = {
    'no-restricted-globals': [
        'error',
        {name: 'confirm', message: 'Ask through the kit dialog, not window.confirm.'},
        {name: 'prompt', message: 'Ask through the kit dialog, not window.prompt.'},
        {name: 'alert', message: 'Show a notice, not window.alert.'},
    ],
    'no-restricted-properties': [
        'error',
        {object: 'window', property: 'confirm', message: 'Ask through the kit dialog, not window.confirm.'},
        {object: 'window', property: 'prompt', message: 'Ask through the kit dialog, not window.prompt.'},
        {object: 'window', property: 'alert', message: 'Show a notice, not window.alert.'},
        {object: 'globalThis', property: 'confirm', message: 'Ask through the kit dialog, not confirm.'},
        {object: 'globalThis', property: 'prompt', message: 'Ask through the kit dialog, not prompt.'},
        {object: 'globalThis', property: 'alert', message: 'Show a notice, not alert.'},
    ],
};

export default tseslint.config(
    {
        ignores: ['dist/**', '.svelte-kit/**', 'coverage/**', '.vite/**', 'size-report/**', '**/*.tsbuildinfo'],
    },
    js.configs.recommended,
    tseslint.configs.recommended,
    svelte.configs.recommended,
    prettier,
    svelte.configs.prettier,
    {
        languageOptions: {
            globals: {...globals.node},
        },
        rules: noBrowserDialogs,
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts'],
        languageOptions: {
            globals: {...globals.browser},
            parserOptions: {
                parser: tseslint.parser,
                svelteConfig,
            },
        },
    },
    {
        // Type-aware linting on the whole library. `project` and not `projectService`: the service
        // resolves a file through TypeScript, which does not know the `.svelte` extension.
        files: ['src/**/*.ts', 'src/**/*.svelte'],
        extends: [tseslint.configs.strictTypeChecked],
        languageOptions: {
            globals: {...globals.browser},
            parserOptions: {
                project: ['./tsconfig.json'],
                tsconfigRootDir: import.meta.dirname,
                extraFileExtensions: ['.svelte'],
            },
        },
        rules: {
            '@typescript-eslint/restrict-template-expressions': ['error', {allowNumber: true}],
            // Svelte 5 reads a rune for its dependency and throws the value away (`void this.#version`).
            // That is the idiom; the rule would ask for a bare expression statement instead.
            '@typescript-eslint/no-meaningless-void-operator': 'off',
            // TypeScript uses an asserted type as the contextual type of the expression, so
            // `screen.getByTestId('x') as HTMLInputElement` needs its assertion; the rule's autofix
            // removes it and breaks the build.
            '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        },
    },
    {
        files: ['src/**/*.svelte'],
        // `strictTypeChecked` sets the TypeScript parser, which cannot read a component: put the
        // svelte parser back, with the TypeScript one inside it.
        languageOptions: {
            parser: svelteParser,
            parserOptions: {parser: tseslint.parser, svelteConfig},
        },
        rules: {
            // svelte-eslint-parser gives typescript-eslint a program in which a callback prop's
            // parameter, a snippet argument and an `{#each}` item are `any`; `svelte-check`, which
            // understands props, is the type check these files really have.
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-base-to-string': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            // `let {a, b = 1}: Props = $props()` and `let x = $state(0)` are declarations Svelte rewrites.
            'prefer-const': 'off',
            '@typescript-eslint/no-useless-default-assignment': 'off',
            // `onclick={() => store.doSomething()}` in a template.
            '@typescript-eslint/no-confusing-void-expression': 'off',
        },
    },
    {
        files: ['src/**/*.test.ts'],
        rules: {
            // `rows[1]!` right after `expect(rows).toHaveLength(4)` is the assertion just made.
            '@typescript-eslint/no-non-null-assertion': 'off',
            // `await waitFor(() => expect(x).toBe(y))` is @testing-library's documented form.
            '@typescript-eslint/no-confusing-void-expression': 'off',
            '@typescript-eslint/require-await': 'off',
        },
    },
);
