import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`chooser offers both games without starting either at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const engineRequests: string[] = [];
    page.on('request', request => {
      if (/\.(?:wasm|pck)(?:\?|$)/.test(request.url())) engineRequests.push(request.url());
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'One obsession. Two machines.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Enter Universal AI' })).toHaveAttribute('href', './classic/');
    await expect(page.getByRole('link', { name: 'Enter the experimental factory' })).toHaveAttribute('href', './seed/');
    await expect(page.getByText('Performance investigation open.')).toBeVisible();
    expect(await page.locator('canvas').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    expect(engineRequests).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('chooser.png'), fullPage: true });
    await page.getByRole('link', { name: 'Enter Universal AI' }).click();
    await expect(page).toHaveURL(/\/classic\/$/);
    await expect(page.getByRole('link', { name: 'Choose a Universal AI version' })).toBeVisible();
    await page.getByRole('link', { name: 'Choose a Universal AI version' }).click();
    await expect(page.getByRole('heading', { name: 'One obsession. Two machines.' })).toBeVisible();
  });
}
