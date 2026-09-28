import { expect, test, type Page } from '@playwright/test';

// Streams between groves, bridges built by learning, and the mission panel, in the running game.
const state = (page: Page) => page.evaluate(() => (window as any).__mg.store.getState());
const call = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([name, a]) => (window as any).__mg.store.getState()[name as string](...(a as unknown[])), [fn, args] as const);
const avatarZ = (page: Page) => page.evaluate(() => (window as any).__mg.store.getState().avatarPosition[2]);

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

test.describe('bridges and missions', () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name === 'phone', 'Walking rules are the same on every screen.'));

  test('an unfinished bridge can’t be crossed, by walking or by clicking past it', async ({ page }) => {
    await start(page);
    const s0 = (await state(page)).layout.streams[0];
    await call(page, 'setAvatarPosition', [s0.bridge.x, 0, s0.z + s0.bridge.halfLength + 1]);
    await page.waitForTimeout(300);

    // Walk straight up the bridge for two seconds: the water stops the kid at the bank.
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowUp');
    await expect.poll(() => avatarZ(page)).toBeGreaterThan(s0.z + s0.halfWidth);
    await expect(page.getByText(/The bridge to The Fraction Bridge isn’t finished. Grow 3 more trees in The Simplest Spring/)).toBeVisible();

    // A click on the far side walks only as far as the near end of the bridge.
    const far = (await state(page)).layout.groves[1].centre;
    expect(await call(page, 'moveTo', [far.x, 0, far.z])).toBe(false);
    await page.waitForTimeout(2500);
    expect(await avatarZ(page)).toBeGreaterThan(s0.z + s0.halfWidth);
  });

  test('growing 3 trees builds the bridge; the missions and the beam move on to Mia, then over the bridge', async ({ page }) => {
    await start(page);
    await expect(page.getByTestId('mission-grow')).toContainText('Grow 3 trees to build the bridge');
    await expect(page.getByTestId('mission-grow')).toContainText('0 of 3');
    expect((await state(page)).objective).toMatchObject({ kind: 'tree' });

    for (const id of ['t1_1', 't1_2', 't1_3']) await answerRight(page, id);

    await expect(page.getByTestId('mission-grow')).toHaveAttribute('data-done', 'true');
    expect((await state(page)).objective).toEqual({ kind: 'mia', conceptId: 'c1' });

    // The bridge is open: tapping the mission walks over it into the next grove.
    await page.getByTestId('mission-cross').click();
    await expect.poll(async () => (await state(page)).visitedGroves, { timeout: 30_000 }).toContain('c2');
    const s0 = (await state(page)).layout.streams[0];
    expect(await avatarZ(page)).toBeLessThan(s0.z - s0.halfWidth);
    await expect(page.getByTestId('mission-cross')).toHaveAttribute('data-done', 'true');
  });

  test('a grove that has opened stays open, even if a tree in the grove before it wilts', async ({ page }) => {
    await start(page);
    for (const id of ['t1_1', 't1_2', 't1_3']) await answerRight(page, id);
    expect(await call(page, 'getUnlockedConcepts')).toContain('c2');

    // Session 2: a memory check on t1_1, answered wrong.
    await call(page, 'startNextSession');
    await call(page, 'answerTreeQuestion', 't1_1', 1, 'Very sure');
    await expect.poll(async () => (await state(page)).isDiagnosing).toBe(false);

    expect((await state(page)).trees.find((t: any) => t.id === 't1_1').state).toBe('withered');
    expect(await call(page, 'getUnlockedConcepts')).toContain('c2');
  });
});

test('on a phone the missions fold into one line that opens up', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone only.');
  await start(page);
  const panel = page.getByTestId('mission-panel').filter({ visible: true });
  await expect(panel).toContainText('Next: Grow 3 trees to build the bridge');
  await panel.getByRole('button').first().click();
  await expect(panel.getByTestId('mission-mia')).toBeVisible();
});
