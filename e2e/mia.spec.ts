import { expect, test, type Page } from '@playwright/test';

// Mia's teach-back in the running game, with the mock Gemini (it marks typed explanations by keywords).
const state = (page: Page) => page.evaluate(() => (window as any).__mg.store.getState());
const call = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, a]) => (window as any).__mg.store.getState()[name as string](...(a as unknown[])), [fn, args] as const);

async function answerRight(page: Page, treeId: string) {
  const tree = (await state(page)).trees.find((t: any) => t.id === treeId);
  if (tree.kind === 'serve') {
    const { targetNumerator, targetDenominator, totalSlices } = tree.serveConfig;
    await call(page, 'answerServeQuestion', treeId, (targetNumerator / targetDenominator) * totalSlices, 'Fairly sure');
  } else {
    await call(page, 'answerTreeQuestion', treeId, tree.answerIndex, 'Fairly sure');
  }
  await expect.poll(async () => (await state(page)).isDiagnosing).toBe(false);
  await call(page, 'dismissFeedback');
}

async function start(page: Page) {
  await page.goto('/?debug=1');
  await page.getByTestId('play-sample-btn').click();
  await expect(page.locator('canvas').first()).toBeVisible();
}

async function walkToMia(page: Page) {
  if (!(await page.getByTestId('quest-mia-c1').isVisible())) await page.getByTestId('toggle-quest-list-btn').click();
  await page.getByTestId('quest-mia-c1').click();
  await expect(page.getByTestId('mia-card')).toBeVisible({ timeout: 20_000 });
}

const GOOD = 'You have to divide the top and the bottom by the same number. 4/8 is 1/2, and 2/8 is less than 4/8.';

test.describe('Mia', () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name === 'phone', 'The phone layout is checked in the last test.'));

  test('waits until the grove is 60% grown, then gets it once the kid explains it well', async ({ page }) => {
    await start(page);

    // Too early: she says how many trees to grow first.
    await walkToMia(page);
    await expect(page.getByTestId('mia-says')).toContainText('Grow 3 more trees');
    await expect(page.getByTestId('mia-text')).toHaveCount(0);
    await page.getByTestId('close-mia-btn').click();

    for (const id of ['t1_1', 't1_2', 't1_3']) await answerRight(page, id);
    await expect(page.getByText(/Mia needs your help in The Simplest Spring/)).toBeVisible();

    await walkToMia(page);
    await expect(page.getByTestId('mia-says')).toContainText('I halved the top and got 2/8');

    // A vague answer leaves her stuck, with a question back.
    await page.getByTestId('mia-text').fill('Just halve it again');
    await page.getByTestId('mia-send').click();
    await expect(page.getByTestId('mia-still-stuck')).toBeVisible();
    await expect(page.getByTestId('mia-says')).toContainText('?');

    // A real explanation helps her.
    await page.getByTestId('mia-try-again').click();
    await page.getByTestId('mia-text').fill(GOOD);
    await page.getByTestId('mia-send').click();
    await expect(page.getByTestId('mia-got-it')).toBeVisible();
    await expect(page.getByText('Divide the top and the bottom by the same number')).toBeVisible();
    await page.getByTestId('mia-done').click();
    await expect(page.getByTestId('mia-card')).toHaveCount(0);

    const s = await state(page);
    expect(s.teachBacks.map((r: any) => r.passed)).toEqual([true, false]);
    expect(s.teachBacks[0]).toMatchObject({ conceptId: 'c1', words: GOOD, spoken: false });

    // She stays helped after a reload, and the teacher sees the kid's own words.
    await page.reload();
    await page.getByTestId('play-sample-btn').click();
    await page.getByTestId('toggle-quest-list-btn').click();
    await expect(page.getByTestId('quest-mia-c1')).toContainText('Helped');
    await page.getByTestId('teacher-btn').click();
    await expect(page.getByTestId('own-words')).toContainText(GOOD);
    await expect(page.getByTestId('own-words')).toContainText('Mia got it');
  });

  test('a voice note goes to Mia as audio', async ({ page }) => {
    await start(page);
    for (const id of ['t1_1', 't1_2', 't1_3']) await answerRight(page, id);
    await walkToMia(page);

    await page.getByTestId('mia-record').click();
    await expect(page.getByTestId('mia-listening')).toBeVisible();
    await page.waitForTimeout(1500);
    const sent = page.waitForRequest('**/api/grade-teach-back');
    await page.getByTestId('mia-stop').click();

    const body = (await sent).postDataJSON();
    expect(body.audio.mimeType).toMatch(/^audio\//);
    expect(body.audio.base64.length).toBeGreaterThan(100);
    expect(body.explanation).toBeUndefined();
    // The mock can't listen, so Mia asks for it typed.
    await expect(page.getByTestId('mia-says')).toContainText('type it');
    await expect(page.getByText('Mia heard:')).toBeVisible();
  });

  test('walking away ends the conversation', async ({ page }) => {
    await start(page);
    await walkToMia(page);

    await call(page, 'setAvatarPosition', [0, 0, 4]);

    await expect(page.getByTestId('mia-card')).toHaveCount(0);
  });
});

test('on a phone, Mia’s card is a sheet and she stays in view above it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone only.');
  await start(page);
  for (const id of ['t1_1', 't1_2', 't1_3']) await answerRight(page, id);
  await walkToMia(page);

  const card = await page.getByTestId('mia-card').boundingBox();
  const viewport = page.viewportSize()!;
  expect(card!.y + card!.height).toBeGreaterThan(viewport.height - 20);
  await page.getByTestId('mia-text').fill(GOOD);
  await page.getByTestId('mia-send').click();
  await expect(page.getByTestId('mia-got-it')).toBeVisible();
});
