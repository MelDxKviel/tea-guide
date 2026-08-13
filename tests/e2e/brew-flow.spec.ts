import { expect, test } from '@playwright/test';

test('da hong pao brewing critical path and refresh recovery', async ({ page }) => {
  await page.goto('/tea/da-hong-pao/');
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
