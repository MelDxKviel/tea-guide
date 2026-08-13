import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const dir = 'docs/screens';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch();
const sizes = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
  { name: '2560', width: 2560, height: 1440 },
];

for (const size of sizes) {
  const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
  await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${dir}/home-${size.name}.png`, fullPage: true });
  await page.goto('http://127.0.0.1:4321/tea/shu-puer/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${dir}/shu-${size.name}.png`, fullPage: true });
  if (size.name === '390' || size.name === '1440') {
    await page.getByTestId('open-brew').click();
    await page.screenshot({ path: `${dir}/modal-${size.name}.png` });
  }
  await page.close();
}
await browser.close();
console.log('screenshots written');
