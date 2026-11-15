const { test, expect, PHOTOS, addPhotos, filledCells } = require('./helpers');

test('tab bar opens and closes each sheet', async ({ page }) => {
  await expect(page.locator('.tabbar')).toBeVisible();
  for (const [tab, title] of [['job', 'รายละเอียดงาน'], ['layout', 'จัดหน้า'], ['export', 'ส่งออก'], ['add', 'รูป']]) {
    await page.locator(`.tabbar button[data-open="${tab}"]`).tap();
    await expect(page.locator('#side')).toHaveClass(/open/);
    await expect(page.locator('#sheetTitle')).toHaveText(title);
    await page.locator('#sheetClose').tap();
    await expect(page.locator('#side')).not.toHaveClass(/open/);
  }
});

test('tap selects a photo and shows the action bar', async ({ page }) => {
  await addPhotos(page, PHOTOS.slice(0, 2));
  await filledCells(page).first().tap();
  await expect(page.locator('#selbar')).toBeVisible();
  await page.locator('#unselBtn').tap();
  await expect(page.locator('#selbar')).toBeHidden();
});

test('export on phone shows the ready card before sharing', async ({ page }) => {
  await addPhotos(page, PHOTOS.slice(0, 2));
  await page.evaluate(() => { navigator.canShare = () => true; navigator.share = async () => {}; });
  await page.locator('.tabbar button[data-open="export"]').tap();
  await page.locator('#pdfBtn2').tap();
  await expect(page.locator('#ready')).toBeVisible();
  await expect(page.locator('#readyTxt')).toContainText('PDF 1 หน้า');
  await page.locator('#readyCancel').tap();
  await expect(page.locator('#ready')).toBeHidden();
});

test('controls in the sheets are at least 44px tall', async ({ page }) => {
  for (const tab of ['job', 'layout', 'add', 'export']) {
    await page.locator(`.tabbar button[data-open="${tab}"]`).tap();
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('.side.open .sheet.active :is(button,input,.check), #sheetClose')]
        .filter(e => e.offsetParent && e.type !== 'checkbox')     // checkbox sits inside a 44px .check row
        .map(e => ({ id: e.id || e.dataset.v || e.textContent.trim(), h: e.getBoundingClientRect().height }))
        .filter(x => x.h < 44));
    expect(small, `small targets in ${tab}`).toEqual([]);
    await page.locator('#sheetClose').tap();
  }
});

test('selected photo stays visible above the tool bar', async ({ page }) => {
  await addPhotos(page);
  await filledCells(page).nth(4).tap();                 // bottom row, right where the bar opens
  await expect.poll(async () => {
    const cell = await filledCells(page).nth(4).boundingBox();
    const bar = await page.locator('#selbar').boundingBox();
    return cell.y + cell.height / 2 < bar.y;
  }).toBe(true);
});

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });
  test('primary and danger buttons keep 4.5:1 text contrast', async ({ page }) => {
    await addPhotos(page, PHOTOS.slice(0, 1));
    await page.locator('.tabbar button[data-open="add"]').tap();
    const ratios = await page.evaluate(() => {
      const lum = c => { const v = c.match(/\d+/g).slice(0, 3).map(n => { n /= 255; return n <= .03928 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
        return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
      const panel = getComputedStyle(document.querySelector('#side')).backgroundColor;
      const pr = getComputedStyle(document.querySelector('#pickBtn')), dg = getComputedStyle(document.querySelector('#clearBtn'));
      return { primary: ratio(pr.color, pr.backgroundColor), danger: ratio(dg.color, panel) };
    });
    expect(ratios.primary).toBeGreaterThanOrEqual(4.5);
    expect(ratios.danger).toBeGreaterThanOrEqual(4.5);
  });
});
