import { expect, test, type Page } from '@playwright/test';

// Uncaught errors and console errors, so each test can prove the page stayed healthy.
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function enterSampleWorld(page: Page) {
  await page.goto('/?debug=1');
  await page.getByTestId('play-sample-btn').click();
  await expect(page.locator('canvas').first()).toBeVisible();
}

test('the start screen offers the sample forest and growing your own', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?debug=1');

  await expect(page.getByTestId('play-sample-btn')).toBeVisible();
  await expect(page.getByTestId('grow-world-btn')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a wrong answer gets a guess at the thinking, a question back, and a teacher flag', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'The phone layout gets its own flow once the new controls land.');
  const errors = watchErrors(page);
  await enterSampleWorld(page);

  // Tree 1: "Simplify 4/8". 1/8 is the divide-only-the-top mistake.
  await page.getByTestId('toggle-quest-list-btn').click();
  await page.getByTestId('quest-tree-t1_1').click();
  // The tree list shows the same words, so wait for the question card itself.
  await expect(page.getByRole('dialog')).toContainText('Simplify the fraction 4/8');

  await page.getByTestId('confidence-very-sure').click();
  await page.getByTestId('choice-3').click();

  // Mock Gemini's guess at the thinking, in whole sentences, then its question back, question mark and all.
  await expect(page.getByText('My guess: you picked 1/8. I think you changed one part but not the other. Right?')).toBeVisible();
  await expect(page.getByText('What happens if you do the same thing to the top and the bottom?')).toBeVisible();
  await expect(page.getByRole('dialog')).not.toContainText('..');
  await page.getByTestId('confirm-thought-yes').click();
  // Once confirmed, the card stops asking.
  await expect(page.getByRole('dialog')).not.toContainText('Right?');
  await page.getByTestId('continue-btn').click();

  // The teacher sees the flag.
  await page.getByTestId('teacher-btn').click();
  await page.getByTestId('tab-flags').click();
  await expect(page.getByText(/changed one part/).first()).toBeVisible();

  // End-of-session rundown (plain-code report from the mock), then back to the forest.
  await page.getByTestId('rundown-btn').click();
  await expect(page.getByTestId('close-rundown-btn')).toBeVisible();
  await page.getByTestId('close-rundown-btn').click();
  await page.getByTestId('back-to-forest-btn').click();
  await expect(page.locator('canvas').first()).toBeVisible();

  expect(errors).toEqual([]);
});

test('the forest loads on a phone with the touch pad', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone only.');
  const errors = watchErrors(page);
  await enterSampleWorld(page);

  await expect(page.getByTestId('dpad-up')).toBeVisible();
  expect(errors).toEqual([]);
});
