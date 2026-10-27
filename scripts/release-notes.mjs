#!/usr/bin/env node
/**
 * `node scripts/release-notes.mjs v0.1.0 > notes.md`: the CHANGELOG.md section of that version.
 * Used by the github-release job of release.yml.
 */
import {readFileSync} from 'node:fs';

const tag = process.argv[2];
if (!tag) {
    console.error('usage: release-notes.mjs <tag>');
    process.exit(1);
}
const version = tag.replace(/^v/, '');
const lines = readFileSync('CHANGELOG.md', 'utf8').split('\n');
const start = lines.findIndex((line) => line.startsWith('## ') && line.includes(`[${version}]`));
let section = '';
if (start !== -1) {
    const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
    section = lines
        .slice(start + 1, end === -1 ? lines.length : end)
        .join('\n')
        .trim();
}
process.stdout.write(`${section || `Release ${version}`}\n`);
