/**
 * The token in `tokens.css` is the source of truth for the row height; `metrics.ts` is the copy
 * JavaScript can read. A row height changed in the theme and not in the virtualiser leaves the rows
 * overlapping their own scroll offsets, and nothing else in the suite would notice.
 */

import {describe, expect, it} from 'vitest';

import tokensCss from '../css/tokens.css?raw';
import {ROW_HEIGHT} from './metrics.js';

function pixels(token: string): number {
    const match = new RegExp(`${token}:\\s*(\\d+)px;`).exec(tokensCss);
    expect(match, `${token} is not declared in tokens.css`).not.toBeNull();
    return Number(match![1]);
}

describe('the table metrics', () => {
    it('takes the row height from --hmm-row-height', () => {
        expect(ROW_HEIGHT).toBe(pixels('--hmm-row-height'));
    });

    it('defaults to 30 px rows', () => {
        expect(ROW_HEIGHT).toBe(30);
    });
});
