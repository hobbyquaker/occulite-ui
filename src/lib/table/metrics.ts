/**
 * The row height of every table, as a number as well as a token.
 *
 * `tokens.css` declares `--hmm-row-height`, and everything CSS can do reads it from there. The
 * table virtualiser cannot: it computes a scroll offset from the row height, so the value is
 * mirrored here and `metrics.test.ts` fails when the two drift. An app that sets the token to
 * another height (a denser 26 px, say) passes the same number to `DataTable`'s `rowHeight`.
 */

/** `--hmm-row-height`. One row of every table; the virtualiser needs it to be uniform. */
export const ROW_HEIGHT = 30;
