import { expect, test } from '@playwright/test';

const sessionKey = 'tea-guide:session:v1';

for (const action of ['end', 'restart'] as const) {
  const actionLabel = action === 'end' ? 'Завершить чаепитие' : 'Начать сначала';

  test(`${action}: cancelling protects a paused session; confirmation applies only the chosen action`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-10-18T09:00:00Z') });
    await page.goto('tea/da-hong-pao/');
    await page.clock.pauseAt(new Date('2026-10-18T09:00:10Z'));
    await page.getByTestId('open-brew').click();
    await page.getByRole('button', { name: '120', exact: true }).click();
    await page.getByRole('button', { name: 'Крепче', exact: true }).click();
    await page.getByTestId('start-session').click();
    await page.getByTestId('skip-rinse').click();
    await page.getByTestId('skip-infusion').click();
    await page.getByRole('button', { name: '+5 сек', exact: true }).click();
    await page.getByTestId('start-stage').click();
    await page.clock.runFor(3_000);
    await page.getByTestId('pause').click();
    await expect(page.getByTestId('clock')).toHaveText('00:14');
    const saved = await page.evaluate((key) => localStorage.getItem(key), sessionKey);

    await page.getByText('Ещё', { exact: true }).click();
    const opener = page.getByRole('button', { name: actionLabel, exact: true });
    await opener.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Да Хун Пао');
    await expect(dialog).toContainText('Пролив 2');
    const cancel = dialog.getByRole('button', { name: 'Продолжить чаепитие', exact: true });
    await expect(cancel).toBeFocused();
    await page.clock.fastForward(60_000);
    await cancel.click();
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    expect(await page.evaluate((key) => localStorage.getItem(key), sessionKey)).toBe(saved);

    await opener.click();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await page.reload();
    await expect(page.getByTestId('resume')).toBeVisible();
    await expect(page.getByTestId('clock')).toHaveText('00:14');
    await expect(page.locator('.timer-stage')).toContainText('Пролив 2');

    await page.getByText('Ещё', { exact: true }).click();
    await opener.click();
    await dialog.getByRole('button', { name: actionLabel, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    if (action === 'end') {
      await expect(page.locator('.timer-stage')).toHaveText('Чаепитие завершено');
      expect(await page.evaluate((key) => localStorage.getItem(key), sessionKey)).toBeNull();
      await page.reload();
      await expect(page.locator('#timer-root')).toContainText('Нет активного чаепития');
    } else {
      await expect(page.locator('.timer-stage')).toHaveText('Промывка');
      await expect(page.getByTestId('start-stage')).toBeVisible();
      await expect(page.getByTestId('start-stage')).toBeFocused();
      const restarted = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        sessionKey,
      );
      expect(restarted).toMatchObject({
        volumeMl: 120,
        strength: 'strong',
        currentInfusionIndex: 0,
        modifiedInfusionDurations: {},
        stage: 'rinse-ready',
      });
      expect(restarted.createdAt).toBeGreaterThan(JSON.parse(saved!).createdAt);
      await page.reload();
      await expect(page.locator('.timer-stage')).toHaveText('Промывка');
      await expect(page.getByTestId('start-stage')).toBeVisible();
    }
  });

  test(`${action}: the running rinse can expire behind the dialog without losing focus or handling timer shortcuts`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-10-18T10:00:00Z') });
    await page.goto('tea/da-hong-pao/');
    await page.clock.pauseAt(new Date('2026-10-18T10:00:10Z'));
    await page.getByTestId('open-brew').click();
    await page.getByTestId('start-session').click();
    await page.getByTestId('start-stage').click();
    await page.getByText('Ещё', { exact: true }).click();
    const opener = page.getByRole('button', { name: actionLabel, exact: true });
    await opener.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Таймер продолжает отсчёт');
    await page.keyboard.press('+');
    await page.keyboard.press('-');
    await page.keyboard.press('ArrowRight');
    await page.clock.fastForward(8_000);
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Промывка завершена');
    await expect(dialog).not.toContainText('Таймер продолжает отсчёт');
    const cancel = dialog.getByRole('button', { name: 'Продолжить чаепитие', exact: true });
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Space');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(page.locator('.timer-stage')).toHaveText('Промывка');
    await expect(page.locator('[data-elapsed]')).toHaveText('00:03');
    await expect(page.getByTestId('advance')).toBeVisible();
    await page.reload();
    await page.getByTestId('advance').click();
    await expect(page.getByTestId('start-stage')).toBeVisible();
    await page.getByTestId('start-stage').click();
    await page.getByTestId('pause').click();
    await page.reload();
    await page.getByTestId('resume').click();
    await page.clock.fastForward(15_000);
    await page.getByTestId('advance').click();
    await expect(page.locator('.timer-stage')).toContainText('Пролив 2');
    await expect(page.getByTestId('start-stage')).toBeVisible();
  });
}

test('brewing again after the last infusion needs no destructive confirmation', async ({
  page,
}) => {
  await page.goto('tea/da-hong-pao/');
  await page.getByTestId('open-brew').click();
  await page.getByTestId('start-session').click();
  await page.getByTestId('skip-rinse').click();
  for (let infusion = 0; infusion < 8; infusion += 1) {
    await page.getByTestId('skip-infusion').click();
  }
  await expect(page.locator('.timer-stage')).toHaveText('Чаепитие завершено');
  await page.getByRole('button', { name: 'Заварить ещё раз', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.timer-stage')).toHaveText('Промывка');
  await expect(page.getByTestId('start-stage')).toBeVisible();
});

test('mobile offline reload dismisses an unconfirmed restart and preserves the active tea', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('tea/da-hong-pao/');
  await page.getByTestId('open-brew').click();
  await page.getByTestId('start-session').click();
  await page.getByTestId('skip-rinse').click();
  await page.getByTestId('start-stage').click();
  await page.getByTestId('pause').click();
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
        return (
          await Promise.all(assets.map((url) => caches.match(url, { ignoreVary: true })))
        ).every(Boolean);
      }),
    )
    .toBe(true);

  const saved = await page.evaluate((key) => localStorage.getItem(key), sessionKey);
  await context.setOffline(true);
  await page.getByText('Ещё', { exact: true }).click();
  await page.getByRole('button', { name: 'Начать сначала', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const button of await dialog.getByRole('button').all()) {
    const bounds = await button.boundingBox();
    expect(bounds).toBeTruthy();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(667);
  }
  await page.reload();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('resume')).toBeVisible();
  await expect(page.locator('.timer-stage')).toContainText('Пролив 1');
  expect(await page.evaluate((key) => localStorage.getItem(key), sessionKey)).toBe(saved);
});
