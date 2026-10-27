import {svelte} from '@sveltejs/vite-plugin-svelte';
import {defineConfig} from 'vitest/config';

/**
 * The same suite in jsdom (`npm run test:jsdom`): the fallback for a machine without the chromium
 * dependencies. It is not what CI reports on, so a test that only passes here is not a passing test.
 */
export default defineConfig({
    plugins: [svelte()],
    resolve: {conditions: ['browser']},
    test: {
        name: 'occulite-ui-jsdom',
        environment: 'jsdom',
        include: ['src/**/*.test.ts'],
        setupFiles: ['./vitest.setup.ts'],
        css: true,
    },
});
