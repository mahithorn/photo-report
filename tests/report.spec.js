const { test, expect, PHOTOS, addPhotos, photoCount, photoNames, filledCells } = require('./helpers');

test('starts empty with export disabled', async ({ page }) => {
  await expect(page).toHaveTitle('รายงานภาพถ่ายหน้างาน');
  await expect(page.locator('#pages .page')).toHaveCount(1);
  await expect(filledCells(page)).toHaveCount(0);
  await expect(page.locator('#pdfBtn')).toBeDisabled();
  await expect(page.locator('#jpgBtn')).toBeDisabled();
});

test('adds photos sorted by time taken', async ({ page }) => {
  await addPhotos(page);
  await expect(filledCells(page)).toHaveCount(5);
  // a..e were shot at 10:30, 09:15, 08:00, 11:45, 12:10
  expect(await photoNames(page)).toEqual(['c.jpg', 'b.jpg', 'a.jpg', 'd.jpg', 'e.jpg']);
  await expect(page.locator('#status')).toContainText('เพิ่ม 5 รูป');
  await expect(page.locator('#pdfBtn')).toBeEnabled();
});

test('keeps pick order when auto-sort is off', async ({ page }) => {
  await page.locator('#sortTime').uncheck();
  await addPhotos(page);
  expect(await photoNames(page)).toEqual(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg']);
  await page.locator('#sortBtn').click();
  expect(await photoNames(page)).toEqual(['c.jpg', 'b.jpg', 'a.jpg', 'd.jpg', 'e.jpg']);
});

test('photos per page changes the page count', async ({ page }) => {
  await addPhotos(page);
  await expect(page.locator('#pages .page')).toHaveCount(1);       // 6 per page
  await page.locator('#count button[data-v="4"]').click();
  await expect(page.locator('#pages .page')).toHaveCount(2);
  await expect(page.locator('#pages .page').first().locator('.cell')).toHaveCount(4);
  await page.locator('#orient button[data-v="l"]').click();
  await expect(page.locator('#pages .pagewrap.land')).toHaveCount(2);
});

test('header shows title, detail and page number', async ({ page }) => {
  await page.locator('#title').fill('อาคาร E งานสถาปัตย์');
  await page.locator('#detail').fill('แปลง A34 งวด 9-10');
  const hdr = page.locator('#pages .hdr').first();
  await expect(hdr).toContainText('อาคาร E งานสถาปัตย์');
  await expect(hdr).toContainText('แปลง A34 งวด 9-10');
  await expect(hdr).toContainText('หน้า 1/1');
  await page.locator('#showHeader').uncheck();
  await expect(page.locator('#pages .hdr')).toHaveCount(0);
});

test('select a photo, add a caption, then delete it', async ({ page }) => {
  await page.locator('#captions').check();
  await addPhotos(page, PHOTOS.slice(0, 2));
  await filledCells(page).first().click();
  await expect(page.locator('#selbar')).toBeVisible();
  await page.locator('#capInput').fill('ติดตั้งฝ้าชั้น 2');
  await expect(filledCells(page).first().locator('.cap')).toHaveText('ติดตั้งฝ้าชั้น 2');
  await page.locator('#delBtn').click();
  expect(await photoCount(page)).toBe(1);
  await expect(page.locator('#selbar')).toBeHidden();
});

test('multi-select delete and clear all', async ({ page }) => {
  await addPhotos(page);
  await page.locator('#multiBtn').click();
  await filledCells(page).nth(0).click();
  await filledCells(page).nth(1).click();
  await expect(page.locator('#pickCount')).toHaveText('เลือกแล้ว 2 รูป');
  await page.locator('#pickDel').click();
  expect(await photoCount(page)).toBe(3);
  await page.locator('#pickDone').click();
  await page.locator('#clearBtn').click();
  expect(await photoCount(page)).toBe(0);
});

test('drag a photo onto another swaps them', async ({ page }) => {
  await addPhotos(page, PHOTOS.slice(0, 2));        // order: b, a
  const [from, to] = [filledCells(page).nth(0), filledCells(page).nth(1)];
  const a = await from.boundingBox(), b = await to.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  expect(await photoNames(page)).toEqual(['a.jpg', 'b.jpg']);
});

test('work is restored after reload', async ({ page }) => {
  await page.locator('#title').fill('งานทดสอบ');
  await addPhotos(page, PHOTOS.slice(0, 3));
  await expect(page.locator('#saveState')).toContainText('บันทึกอัตโนมัติแล้ว');
  await page.reload();
  await expect.poll(() => photoCount(page)).toBe(3);
  await expect(page.locator('#title')).toHaveValue('งานทดสอบ');
  await expect(page.locator('#saveState')).toContainText('เปิดงานเดิมต่อ');
});

test('exports a multi-page PDF', async ({ page }) => {
  await page.locator('#title').fill('รายงาน');
  await page.locator('#count button[data-v="4"]').click();
  await addPhotos(page);
  const dl = page.waitForEvent('download');
  await page.locator('#pdfBtn').click();
  const file = await dl;
  // Headless Chromium replaces any non-ASCII download name with "download",
  // so check the name the app builds instead of the one the test browser reports.
  expect(await page.evaluate(() => fname())).toMatch(/^รายงาน \d{4}-\d{2}-\d{2}$/);
  const buf = require('fs').readFileSync(await file.path());
  expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(buf.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(2);
});

test('exports one JPG per page', async ({ page }) => {
  await page.locator('#count button[data-v="4"]').click();
  await addPhotos(page);
  const files = [];
  page.on('download', d => files.push(d));
  await page.locator('#jpgBtn').click();
  await expect.poll(() => files.length).toBe(2);
  expect(files.map(f => f.suggestedFilename()).sort()).toEqual([
    expect.stringMatching(/\(1\)\.jpg$/), expect.stringMatching(/\(2\)\.jpg$/)]);
  const buf = require('fs').readFileSync(await files[0].path());
  expect([buf[0], buf[1]]).toEqual([0xff, 0xd8]);   // JPEG magic
});

test('arrow buttons move the selected photo (no drag needed)', async ({ page }) => {
  await addPhotos(page, PHOTOS.slice(0, 3));        // order: c, b, a
  await filledCells(page).first().click();
  await expect(page.locator('#selPos')).toHaveText('รูปที่ 1 จาก 3');
  await expect(page.locator('#prevBtn')).toBeDisabled();
  await page.locator('#nextBtn').click();
  expect(await photoNames(page)).toEqual(['b.jpg', 'c.jpg', 'a.jpg']);
  await expect(page.locator('#selPos')).toHaveText('รูปที่ 2 จาก 3');
  await page.locator('#nextBtn').click();
  await expect(page.locator('#nextBtn')).toBeDisabled();
  await page.locator('#prevBtn').click();
  expect(await photoNames(page)).toEqual(['b.jpg', 'c.jpg', 'a.jpg']);
});

test('keyboard: Enter selects a photo, Escape deselects', async ({ page }) => {
  await addPhotos(page, PHOTOS.slice(0, 2));
  await filledCells(page).nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(filledCells(page).nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#selbar')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#selbar')).toBeHidden();
});

test('toggle groups expose their selected state', async ({ page }) => {
  await expect(page.locator('#count button[data-v="6"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#count button[data-v="9"]').click();
  await expect(page.locator('#count button[data-v="9"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#count button[data-v="6"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#bg .sw[data-v="#1c1c1c"]').click();
  await expect(page.locator('#bg .sw[data-v="#1c1c1c"]')).toHaveAttribute('aria-pressed', 'true');
});
