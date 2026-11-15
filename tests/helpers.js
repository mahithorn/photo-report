const path = require('path');
const { test: base, expect } = require('@playwright/test');

const FIX = path.join(__dirname, 'fixtures');
const PHOTOS = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'].map(f => path.join(FIX, f));
const JSPDF = require.resolve('jspdf/dist/jspdf.umd.min.js');

// Every test starts with a fresh browser context (empty IndexedDB / localStorage),
// serves jsPDF from node_modules instead of the CDN, and skips Google Fonts,
// so the suite runs the same offline and online.
const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/cdnjs.cloudflare.com/**/jspdf.umd.min.js', r => r.fulfill({ path: JSPDF, contentType: 'text/javascript' }));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    page.on('dialog', d => d.accept());
    await page.goto('/');
    await use(page);
  },
});

/** Add photos through the hidden file input and wait until they are on the page. */
async function addPhotos(page, files = PHOTOS) {
  const before = await photoCount(page);
  await page.locator('#file').setInputFiles(files);
  await expect.poll(() => photoCount(page)).toBe(before + files.length);
}
const photoCount = page => page.evaluate(() => S.photos.length);
const photoNames = page => page.evaluate(() => S.photos.map(p => p.name));
const filledCells = page => page.locator('#pages .cell:not(.empty)');

module.exports = { test, expect, PHOTOS, addPhotos, photoCount, photoNames, filledCells };
