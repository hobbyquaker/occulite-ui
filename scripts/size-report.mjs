#!/usr/bin/env node
/**
 * The size of what an app ships when it imports a typical set of the kit, built the way a consumer
 * builds it: Vite with the Svelte plugin, minified, the Svelte runtime included, gzip measured.
 *
 * Three sets: `frame` (an addon page's chrome: tabs, notices, a dialog, the loader, toolbar
 * buttons, theme and language), `table` (the frame plus the DataTable), `all` (everything the
 * barrel exports). The budget is `size-budget.json`; a set more than 10 % over its budget fails.
 * `--update` writes the measured sizes as the new budget.
 *
 * Builds from `dist/`, so `npm run build` comes first.
 */
import {mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync, statSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {gzipSync} from 'node:zlib';

import {svelte} from '@sveltejs/vite-plugin-svelte';
import {build} from 'vite';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const work = join(root, 'size-report');
const TOLERANCE = 0.1;

if (!existsSync(join(dist, 'index.js'))) {
    console.error('dist/ is missing: run `npm run build` first');
    process.exit(1);
}

const frame = `
import {mount} from 'svelte';
import '${dist}/css/app.css';
import Tabs from '${dist}/components/Tabs.svelte';
import Notices from '${dist}/components/Notices.svelte';
import Dialog from '${dist}/components/Dialog.svelte';
import Loader from '${dist}/components/Loader.svelte';
import Toolbar from '${dist}/components/Toolbar.svelte';
import ToolbarButton from '${dist}/components/ToolbarButton.svelte';
import ThemeSwitch from '${dist}/components/ThemeSwitch.svelte';
import {NoticesStore} from '${dist}/notices/index.js';
import {addMessages, initI18n, t} from '${dist}/i18n/index.js';
import {initTheme} from '${dist}/theme/index.js';
export {mount, Tabs, Notices, Dialog, Loader, Toolbar, ToolbarButton, ThemeSwitch, NoticesStore, addMessages, initI18n, t, initTheme};
`;
const SETS = {
    frame,
    table: `${frame}
import DataTable from '${dist}/components/DataTable.svelte';
import {LocalColumnWidths, setDataTableEnvironment} from '${dist}/table/index.js';
export {DataTable, LocalColumnWidths, setDataTableEnvironment};
`,
    all: `import '${dist}/css/app.css';\nexport * from '${dist}/index.js';\n`,
};

rmSync(work, {recursive: true, force: true});
mkdirSync(work, {recursive: true});

const sizes = {};
for (const [name, source] of Object.entries(SETS)) {
    const entry = join(work, `${name}.js`);
    writeFileSync(entry, source);
    const outDir = join(work, name);
    await build({
        root,
        logLevel: 'error',
        configFile: false,
        plugins: [svelte({configFile: false})],
        build: {
            outDir,
            emptyOutDir: true,
            minify: true,
            target: 'es2022',
            cssCodeSplit: false,
            lib: {entry, formats: ['es'], fileName: name},
            rollupOptions: {},
        },
    });
    let js = 0;
    let css = 0;
    for (const file of readdirSync(outDir)) {
        const path = join(outDir, file);
        if (!statSync(path).isFile()) continue;
        const gz = gzipSync(readFileSync(path)).length;
        if (file.endsWith('.js')) js += gz;
        if (file.endsWith('.css')) css += gz;
    }
    sizes[name] = {js, css, total: js + css};
}

const budgetFile = join(root, 'size-budget.json');
const update = process.argv.includes('--update');
const budget = existsSync(budgetFile) ? JSON.parse(readFileSync(budgetFile, 'utf8')) : {};

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
let failed = false;
const lines = ['| set | JS (gzip) | CSS (gzip) | total | budget |', '|---|---|---|---|---|'];
for (const [name, size] of Object.entries(sizes)) {
    const limit = budget[name];
    const over = limit !== undefined && size.total > limit * (1 + TOLERANCE);
    failed ||= over && !update;
    lines.push(
        `| ${name} | ${kb(size.js)} | ${kb(size.css)} | ${kb(size.total)} | ${limit === undefined ? '-' : kb(limit)}${over ? ' **over**' : ''} |`,
    );
}
const report = lines.join('\n');
console.log(report);
writeFileSync(join(work, 'report.md'), `${report}\n`);
if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, `### Size report\n\n${report}\n`, {flag: 'a'});
}
if (update) {
    writeFileSync(
        budgetFile,
        `${JSON.stringify(Object.fromEntries(Object.entries(sizes).map(([n, s]) => [n, s.total])), null, 2)}\n`,
    );
    console.log('size-budget.json updated');
}
if (failed) {
    console.error(`a set is more than ${String(TOLERANCE * 100)} % over its budget`);
    process.exit(1);
}
