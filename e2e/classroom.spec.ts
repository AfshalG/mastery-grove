import { expect, test, type Browser, type Page } from '@playwright/test';

// A class room over Socket.IO: a teacher and two students, each in their own browser.
async function openPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto('/?debug=1');
  return page;
}

const trees = (page: Page) => page.evaluate(() => (window as any).__mg.store.getState().trees.filter((t: any) => t.isTeacherDeployed).length);
const session = (page: Page) => page.evaluate(() => (window as any).__mg.store.getState().session);

test('two students in one class see each other move, and the teacher’s quest and next session reach both', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'Three windows at once, checked on desktop.');

  const teacher = await openPage(browser);
  await teacher.getByTestId('play-sample-btn').click();
  await teacher.getByTestId('teacher-btn').click();
  await teacher.getByTestId('open-room-btn').click();
  await expect(teacher.getByTestId('room-code')).toHaveText(/^[A-Z0-9]{4}$/);
  const code = (await teacher.getByTestId('room-code').textContent())!.trim();

  const join = async (name: string) => {
    const page = await openPage(browser);
    await page.getByTestId('class-code-input').fill(code.toLowerCase());
    await page.getByTestId('class-name-input').fill(name);
    await page.getByTestId('join-class-btn').click();
    await expect(page.locator('canvas').first()).toBeVisible();
    await expect(page.getByTestId('room-chip')).toContainText(code);
    return page;
  };
  const aisha = await join('Aisha');
  const wei = await join('Wei Jie');
  await expect(teacher.getByTestId('room-students')).toHaveText('2 students here');

  // Aisha walks somewhere; Wei Jie's game sees her there.
  const aishaId = await aisha.evaluate(() => (window as any).__mg.store.getState().room.playerId);
  await aisha.evaluate(() => (window as any).__mg.store.getState().setAvatarPosition([3, 0, -6]));
  await expect
    .poll(() => wei.evaluate((id) => {
      const p = (window as any).__mg.players.get(id);
      return p ? [p.x, p.z] : null;
    }, aishaId))
    .toEqual([3, -6]);

  // Aisha answers; the teacher's roster shows her, live.
  await aisha.evaluate(() => (window as any).__mg.store.getState().answerTreeQuestion('t1_1', 3, 'Very sure'));
  await expect(teacher.getByText('Aisha').first()).toBeVisible({ timeout: 15_000 });

  // The teacher sends a quest: both students get the new trees.
  await teacher.getByTestId('deploy-quest-m2').click();
  await expect.poll(() => trees(aisha), { timeout: 20_000 }).toBeGreaterThan(0);
  await expect.poll(() => trees(wei), { timeout: 20_000 }).toBe(await trees(aisha));
  await expect(wei.getByText(/Your teacher sent \d+ new trees/)).toBeVisible();

  // And the next session starts for both.
  const before = await session(wei);
  await teacher.getByTestId('next-session-btn').click();
  await expect.poll(() => session(wei)).toBe(before + 1);
  await expect.poll(() => session(aisha)).toBeGreaterThan(1);
});

test('a wrong code says so', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'Checked on desktop.');
  await page.goto('/?debug=1');
  await page.getByTestId('class-code-input').fill('QQQQ');
  await page.getByTestId('class-name-input').fill('Zoe');
  await page.getByTestId('join-class-btn').click();
  await expect(page.getByTestId('join-error')).toHaveText('No class with that code. Check it with your teacher.');
});
