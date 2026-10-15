import { expect, test } from '@playwright/test';

test('elapsed time survives rinse, pause, background time and refresh without starting the next infusion', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-16T09:00:00Z') });
  await page.goto('/tea/da-hong-pao/');
  await page.clock.pauseAt(new Date('2026-10-16T09:00:10Z'));
  await page.getByTestId('open-brew').click();
  await page.getByTestId('start-session').click();
  await expect(page.locator('[data-elapsed]')).toHaveCount(0);

  await page.getByTestId('start-stage').click();
  await page.clock.runFor(5_000);
  await page.clock.fastForward(23_000);
  await expect(page.locator('[data-elapsed]')).toHaveText('00:23');
  await expect(page.locator('.timer-stage')).toHaveText('Промывка');
  await expect(page.getByTestId('advance')).toBeVisible();

  await page.reload();
  await expect(page.locator('[data-elapsed]')).toHaveText('00:23');
  await page.getByTestId('advance').click();
  await expect(page.locator('[data-elapsed]')).toHaveCount(0);
  await page.getByTestId('start-stage').click();
  await page.clock.runFor(3_000);
  await page.getByTestId('pause').click();
  await page.clock.fastForward(60_000);
  await page.reload();
  await expect(page.getByTestId('resume')).toBeVisible();
  await expect(page.locator('[data-elapsed]')).toHaveCount(0);
  await page.getByTestId('resume').click();
  await page.clock.fastForward(22_000);
  await expect(page.locator('[data-elapsed]')).toHaveText('00:10');
  await page.reload();
  await expect(page.locator('[data-elapsed]')).toHaveText('00:10');
  await expect(page.locator('.timer-stage')).toContainText('Пролив 1');

  await page.getByTestId('advance').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.timer-stage')).toContainText('Пролив 2');
  await expect(page.getByTestId('start-stage')).toBeVisible();
  await expect(page.locator('[data-elapsed]')).toHaveCount(0);
});

for (const completedAt of [undefined, 'invalid', -1]) {
  test(`a saved complete stage with no usable completion time stays recoverable: ${completedAt}`, async ({
    page,
  }) => {
    await page.goto('/tea/da-hong-pao/');
    await page.getByTestId('open-brew').click();
    await page.getByTestId('start-session').click();
    await page.getByTestId('skip-rinse').click();
    await page.addInitScript((stamp) => {
      const key = 'tea-guide:session:v1';
      const session = JSON.parse(localStorage.getItem(key)!);
      session.stage = 'infusion-complete';
      session.timer.state = 'infusion-complete';
      session.timer.remainingMs = 0;
      session.timer.completedAt = stamp;
      localStorage.setItem(key, JSON.stringify(session));
    }, completedAt);
    await page.reload();
    await expect(page.getByTestId('advance')).toBeVisible();
    await expect(page.locator('[data-elapsed]')).toHaveCount(0);
    await page.getByTestId('advance').click();
    await expect(page.locator('.timer-stage')).toContainText('Пролив 2');
    await expect(page.getByTestId('start-stage')).toBeVisible();
  });
}

test('mobile offline reload keeps elapsed time and a manually started next stage', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.clock.install({ time: new Date('2026-10-16T10:00:00Z') });
  await page.goto('/tea/da-hong-pao/');
  await page.getByTestId('open-brew').click();
  await page.getByTestId('start-session').click();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const assets = [
          location.href,
          ...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'), (s) => s.src),
          ...Array.from(
            document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
            (l) => l.href,
          ),
        ];
        // Module requests carry an Origin header; preview responses vary on it.
        return (
          await Promise.all(assets.map((url) => caches.match(url, { ignoreVary: true })))
        ).every(Boolean);
      }),
    )
    .toBe(true);
  await page.clock.pauseAt(new Date('2026-10-16T10:00:10Z'));
  await page.getByTestId('start-stage').click();
  await page.clock.fastForward(65_000);
  await expect(page.locator('[data-elapsed]')).toHaveText('01:00');

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-elapsed]')).toHaveText('01:00');
  await page.clock.fastForward(3_600_000);
  await expect(page.locator('[data-elapsed]')).toHaveText('1:01:00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const advance = page.getByTestId('advance');
  const bounds = await advance.boundingBox();
  expect(bounds).toBeTruthy();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(667);
  await advance.focus();
  await expect(advance).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.timer-stage')).toContainText('Пролив 1');
  await expect(page.getByTestId('start-stage')).toBeVisible();
  await expect(page.locator('[data-elapsed]')).toHaveCount(0);
});
