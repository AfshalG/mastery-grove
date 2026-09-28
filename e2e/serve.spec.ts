import { expect, test, type Page } from '@playwright/test';

// Hands-on challenges: serve a fraction of a cake, or lay a fraction of a bridge's planks.
const state = (page: Page) => page.evaluate(() => (window as any).__mg.store.getState());
const call = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, a]) => (window as any).__mg.store.getState()[name as string](...(a as unknown[])), [fn, args] as const);

/** Where a point in the forest lands on screen, using the camera the debug hook shares. */
const toScreen = (page: Page, p: [number, number, number]) =>
  page.evaluate(([x, y, z]) => {
    const { camera, size } = (window as any).__mg.three;
    const v = new camera.position.constructor(x, y, z).project(camera);
    return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
  }, p);

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

async function openCake(page: Page) {
  await page.goto('/?debug=1');
  await page.getByTestId('play-sample-btn').click();
  await page.getByTestId('toggle-quest-list-btn').click();
  await page.getByTestId('quest-tree-t1_serve').click();
  await expect(page.getByRole('dialog')).toContainText('Serve the cake', { timeout: 20_000 });
}

test.describe('hands-on challenges', () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name === 'phone', 'The rules are the same on every screen.'));

  test('a wrong serve names the exact mistake', async ({ page }) => {
    await openCake(page); // 2/3 of a 6-slice cake
    await page.getByTestId('confidence-fairly-sure').click();
    await page.getByTestId('serve-slice-0').click();
    await page.getByTestId('serve-slice-1').click();
    await page.getByTestId('serve-submit-btn').click();

    await expect(page.getByText('You served 2 slices: the top number.', { exact: false })).toBeVisible();
    expect((await state(page)).lastAnswerResult).toMatchObject({ isCorrect: false, served: 2 });
  });

  test('tapping a slice of the 3D cake serves it, and the card counts it too', async ({ page }) => {
    await openCake(page);
    await page.waitForTimeout(1800); // let the camera settle
    const tree = (await state(page)).trees.find((t: any) => t.id === 't1_serve');
    // The slice facing the camera (index 4 of 6), on its top: the cake floats 4.7 up and leans back 0.25 rad.
    const at = await toScreen(page, [tree.position[0], tree.position[1] + 4.7 + 0.3, tree.position[2] + 0.64]);
    await page.mouse.click(at.x, at.y);

    await expect.poll(async () => (await state(page)).servedSlices).toEqual([4]);
    await expect(page.getByRole('dialog')).toContainText('1 of 6');
    await expect(page.getByTestId('serve-slice-4')).toHaveAttribute('aria-pressed', 'true');
  });

  test('laying 6 of the bridge’s 8 planks is 3/4', async ({ page }) => {
    await page.goto('/?debug=1');
    await page.getByTestId('play-sample-btn').click();
    for (const id of ['t1_1', 't1_2', 't1_3']) await answerRight(page, id);
    await page.evaluate(() => {
      const s = (window as any).__mg.store.getState();
      s.openTree(s.trees.find((t: any) => t.id === 't2_serve'));
    });

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Build the bridge');
    await page.getByTestId('confidence-very-sure').click();
    for (let i = 0; i < 6; i++) await page.getByTestId(`serve-slice-${i}`).click();
    await expect(page.getByTestId('serve-submit-btn')).toHaveText('Lay 6 planks');
    await page.getByTestId('serve-submit-btn').click();

    await expect(page.getByTestId('serve-result')).toHaveText('6 of 8 planks is 3/4. Just right!');
  });
});
