import { expect, test } from '@playwright/test';

test('the reteach report names the student who actually showed the mix-up', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'Checked on desktop.');
  await page.goto('/?debug=1');
  await page.getByTestId('play-sample-btn').click();
  await expect(page.locator('canvas').first()).toBeVisible();

  // A wrong answer on "Simplify 4/8"; mock Gemini names a mix-up from that grove.
  await page.evaluate(() => (window as any).__mg.store.getState().answerTreeQuestion('t1_1', 3, 'Very sure'));
  await expect.poll(() => page.evaluate(() => (window as any).__mg.store.getState().thoughtProcessRecords.length)).toBe(1);
  const mixUp = await page.evaluate(() => (window as any).__mg.store.getState().thoughtProcessRecords[0].misconceptionLabel);
  await page.evaluate(() => (window as any).__mg.store.getState().dismissFeedback());

  await page.getByTestId('teacher-btn').click();
  await page.getByTestId('rundown-btn').click();

  // The report used to see a class of nobody; now the kid appears under their own mix-up.
  const report = page.getByRole('dialog');
  await expect(report).toContainText(mixUp);
  await expect(report.getByText(/Affects: .*You \(playing now\)/).first()).toBeVisible();
});
