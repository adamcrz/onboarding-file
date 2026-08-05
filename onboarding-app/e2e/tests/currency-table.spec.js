const { test, expect } = require('@playwright/test');
const { readTableRows } = require('../helpers/docxTable');

// The DE and EN "All-In" templates' currency allocation table had a broken
// row: AUD and GBP shared a single malformed table row (label text missing
// or swapped, values colored red as an editing leftover), so one of the two
// currencies never displayed correctly. Fixed by giving each currency its
// own clean row cloned from a working one (see EUR). This locks that in.

const FIELD_VALUES = {
  ccy_chf_min: '0', ccy_chf_max: '50',
  ccy_usd_min: '0', ccy_usd_max: '30',
  ccy_eur_min: '0', ccy_eur_max: '40',
  ccy_gbp_min: '0', ccy_gbp_max: '20',
  ccy_aud_min: '5', ccy_aud_max: '25',
  ccy_other_min: '0', ccy_other_max: '10',
};

for (const [templateId, othersLabel] of [['de-all-in', 'Andere'], ['en-disc-all-in', 'Others']]) {
  test(`${templateId}: currency table has all 6 currencies, each with its own clean row`, async ({ request }) => {
    const res = await request.post(`/api/contracts/generate/${templateId}`, {
      data: { fieldValues: FIELD_VALUES, fieldDefs: [] },
    });
    expect(res.ok()).toBe(true);
    const buffer = await res.body();

    const rows = readTableRows(buffer, 'CHF');
    expect(rows).toHaveLength(6);

    const byBookmark = Object.fromEntries(rows.map((r) => [r.bookmarks[0], r]));
    expect(byBookmark.CHF.texts).toEqual(['CHF', '0%', '-', '50%']);
    expect(byBookmark.USD.texts).toEqual(['USD', '0%', '-', '30%']);
    expect(byBookmark.EUR.texts).toEqual(['EUR', '0%', '-', '40%']);
    expect(byBookmark.AUD.texts).toEqual(['AUD', '5%', '-', '25%']);
    expect(byBookmark.GBP.texts).toEqual(['GBP', '0%', '-', '20%']);
    expect(byBookmark.And.texts).toEqual([othersLabel, '0%', '-', '10%']);

    // No row should carry a non-black color (the old broken row used red,
    // EE0000, as an editing leftover).
    for (const row of rows) {
      for (const color of row.colors) {
        expect(color.toLowerCase()).toBe('000000');
      }
    }
  });
}
