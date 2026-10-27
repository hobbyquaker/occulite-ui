import {svelte} from '@sveltejs/vite-plugin-svelte';
import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

/**
 * Component tests run in a real headless chromium: the virtualised table, the native `<dialog>`
 * stacking and the focus handling need layout, which jsdom does not have. The browser binary is
 * installed once with `npx playwright install --with-deps chromium`. `npm run test:jsdom` runs the
 * same files without a browser, as a fallback; CI reports on this configuration.
 */
export default defineConfig({
    plugins: [svelte()],
    test: {
        name: 'occulite-ui',
        include: ['src/**/*.test.ts'],
        setupFiles: ['./vitest.setup.ts'],
        // The theme test reads the stylesheets as source; vitest's default `css: false` would hand
        // back an empty module for every stylesheet, a `?raw` import included.
        css: true,
        browser: {
            enabled: true,
            headless: true,
            // Every layout assertion (dialogs that must not overflow, column tracks) is measured here.
            viewport: {width: 1280, height: 800},
            provider: playwright(),
            instances: [{browser: 'chromium'}],
        },
    },
});
