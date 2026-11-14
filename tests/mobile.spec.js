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
