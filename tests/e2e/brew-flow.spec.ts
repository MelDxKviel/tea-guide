import { expect, test } from '@playwright/test';

test('da hong pao brewing critical path and refresh recovery', async ({ page }) => {
  await page.goto('tea/da-hong-pao/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Да Хун Пао');
  await expect(page.locator('body')).toContainText('8 г / 110 мл');

  await page.getByTestId('open-brew').click();
  await page.getByRole('button', { name: '120' }).click();
  await expect(page.locator('[data-preview]')).toContainText('г');
  await page.getByTestId('start-session').click();

  await expect(page).toHaveURL(/\/session\/$/);
  await expect(page.locator('.timer-name, .timer-top')).toContainText('Да Хун Пао');

  await page.getByTestId('start-stage').click();
  await page.locator('summary').filter({ hasText: 'Ещё' }).click();
  await page.getByRole('button', { name: 'Завершить пролив сейчас' }).click();
  await expect(page.getByTestId('advance')).toBeVisible();
  await page.getByTestId('advance').click();

  await expect(page.getByTestId('start-stage')).toBeVisible();
  await expect(page.locator('.timer-stage')).toContainText('Пролив 1');

  await page.reload();
  await expect(page.locator('.timer-stage')).toContainText('Пролив 1');
  await expect(page.getByTestId('start-stage')).toBeVisible();
});

test('another tea cannot silently replace a paused brewing session', async ({ page }) => {
  await page.goto('tea/da-hong-pao/');
  await page.getByTestId('open-brew').click();
  await page.getByRole('button', { name: '120', exact: true }).click();
  await page.getByTestId('start-session').click();
  await page.getByTestId('skip-rinse').click();
  await page.getByTestId('start-stage').click();
  await page.getByTestId('pause').click();
  const saved = await page.evaluate(() => localStorage.getItem('tea-guide:session:v1'));

  await page.goto('tea/tie-guan-yin/');
  await page.locator('[data-recovery-dismiss]').click();
  await page.getByTestId('open-brew').click();
  await page.getByRole('button', { name: '150', exact: true }).click();
  await page.getByRole('button', { name: 'Крепче', exact: true }).click();
  await page.getByTestId('start-session').click();
  const prompt = page.locator('[data-replace-session]');
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText('Да Хун Пао');
  await expect(prompt).toContainText('Пролив 1');
  await expect(prompt).toContainText('120 мл');
  await expect(prompt.getByRole('link', { name: 'Продолжить текущее' })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('tea-guide:session:v1'))).toBe(saved);

  await prompt.getByRole('button', { name: 'Назад к настройкам' }).click();
  await expect(page.getByRole('button', { name: '150', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Крепче', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('start-session')).toBeFocused();
  await page.getByTestId('start-session').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('open-brew')).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('tea-guide:session:v1'))).toBe(saved);

  await page.getByTestId('open-brew').click();
  await expect(prompt).toBeHidden();
  await page.getByTestId('start-session').click();
  await prompt.getByRole('link', { name: 'Продолжить текущее' }).click();
  await expect(page).toHaveURL(/\/session\/$/);
  await expect(page.locator('.timer-top')).toContainText('Да Хун Пао');
  await expect(page.getByTestId('resume')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('resume')).toBeVisible();

  await page.goto('tea/tie-guan-yin/');
  await page.getByTestId('open-brew').click();
  await page.getByRole('button', { name: '150', exact: true }).click();
  await page.getByRole('button', { name: 'Крепче', exact: true }).click();
  await page.getByTestId('start-session').click();
  await prompt.getByRole('button', { name: 'Заменить новым' }).click();
  await expect(page).toHaveURL(/\/session\/$/);
  await expect(page.locator('.timer-top')).toContainText('Те Гуань Инь');
  await expect(page.getByTestId('start-stage')).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('tea-guide:session:v1')!)),
  ).toMatchObject({
    teaId: 'tie-guan-yin',
    volumeMl: 150,
    strength: 'strong',
    stage: 'rinse-ready',
  });
});

test('replacement asks again if another tab has started a different tea', async ({
  page,
  context,
}) => {
  await page.goto('tea/da-hong-pao/');
  await page.getByTestId('open-brew').click();
  await page.getByTestId('start-session').click();

  await page.goto('tea/tie-guan-yin/');
  await page.getByTestId('open-brew').click();
  await page.getByTestId('start-session').click();
  const prompt = page.locator('[data-replace-session]');
  await expect(prompt).toContainText('Да Хун Пао');

  const otherTab = await context.newPage();
  await otherTab.goto('tea/shu-puer/');
  await otherTab.getByTestId('open-brew').click();
  await otherTab.getByTestId('start-session').click();
  await otherTab.getByRole('button', { name: 'Заменить новым' }).click();
  await expect(otherTab).toHaveURL(/\/session\/$/);
  await otherTab.close();
  const saved = await page.evaluate(() => localStorage.getItem('tea-guide:session:v1'));

  await prompt.getByRole('button', { name: 'Заменить новым' }).click();
  await expect(prompt).toContainText('Шу пуэр');
  await expect(prompt.getByRole('link', { name: 'Продолжить текущее' })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('tea-guide:session:v1'))).toBe(saved);
  await prompt.getByRole('button', { name: 'Заменить новым' }).click();
  await expect(page).toHaveURL(/\/session\/$/);
  await expect(page.locator('.timer-top')).toContainText('Те Гуань Инь');
  await expect(page.getByTestId('start-stage')).toBeVisible();
});
