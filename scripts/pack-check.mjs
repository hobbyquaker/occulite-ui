#!/usr/bin/env node
/**
 * `npm pack --dry-run` against an allowlist: the tarball holds the built library, the licence
 * texts and the readme - no tests, no sources outside `dist/`, no configuration. And it holds the
 * entry points the exports map names, so a build that silently produced nothing fails here.
 */
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const ALLOWED = [
    /^package\.json$/,
    /^README\.md$/,
    /^CHANGELOG\.md$/,
    /^LICENSE$/,
    /^THIRD_PARTY_NOTICES\.md$/,
    /^dist\/.+\.(js|d\.ts|svelte|css)$/,
];
const FORBIDDEN = [/\.test\./, /\.spec\./, /(^|\/)\./];

const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {encoding: 'utf8'});
const [info] = JSON.parse(out);
const files = info.files.map((file) => file.path).sort();

const problems = [];
for (const file of files) {
    if (!ALLOWED.some((pattern) => pattern.test(file))) {
        problems.push(`not on the allowlist: ${file}`);
    }
    if (FORBIDDEN.some((pattern) => pattern.test(file))) {
        problems.push(`must not be packed: ${file}`);
    }
}

/** Every file the exports map points at (wildcards checked by their directory). */
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const targets = new Set();
for (const entry of Object.values(pkg.exports)) {
    for (const target of typeof entry === 'string' ? [entry] : Object.values(entry)) {
        targets.add(target.replace(/^\.\//, ''));
    }
}
for (const target of targets) {
    if (target.includes('*')) {
        const [prefix, suffix] = target.split('*');
        if (!files.some((file) => file.startsWith(prefix) && file.endsWith(suffix))) {
            problems.push(`no file for the export ${target}`);
        }
    } else if (!files.includes(target)) {
        problems.push(`missing the export target ${target}`);
    }
}
for (const required of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'README.md']) {
    if (!files.includes(required)) {
        problems.push(`missing ${required}`);
    }
}

console.log(
    `${info.name}@${info.version}: ${files.length} files, ${info.size} bytes packed, ${info.unpackedSize} unpacked`,
);
if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exit(1);
}
console.log('pack check: ok');
