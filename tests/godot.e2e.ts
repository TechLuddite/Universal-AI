import { test, expect, type Page } from '@playwright/test';

interface SeedSnapshot {
  nodes: number; fps: number; render_width: number; render_height: number;
  chips: number; capital: number; wafers: number; fabs: number;
  machines_visible: number; cinema: boolean; camera_focus: boolean;
  sound_enabled: boolean; manual_progress: number;
}
const state = (page: Page): Promise<SeedSnapshot> => page.evaluate(() => (window as unknown as { __seed: SeedSnapshot }).__seed);

async function ready(page: Page, query = '?test=1') {
  await page.goto('/' + query);
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __seed?: unknown }).__seed) ||
    Boolean(document.getElementById('error')?.textContent),
    undefined, { timeout: 90_000 });
  await expect(page.locator('#error')).toHaveText('');
  await expect(page.locator('#loading')).toHaveCount(0);
}

test('real WebGL fabrication finances and installs an autonomous machine', async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4180/')) external.push(request.url()); });
  await ready(page);
  expect((await state(page)).fabs).toBe(0);
  await page.keyboard.down('Space');
  await expect.poll(async () => (await state(page)).capital, { timeout: 60_000 }).toBeGreaterThanOrEqual(1200);
  await page.keyboard.up('Space');
  const nodesBeforeBuild = (await state(page)).nodes;
  await page.keyboard.press('b');
  await expect.poll(async () => (await state(page)).machines_visible).toBe(1);
  expect((await state(page)).fabs).toBe(1);
  const afterBuild = (await state(page)).chips;
  await expect.poll(async () => (await state(page)).chips, { timeout: 30_000 }).toBeGreaterThan(afterBuild + 1);
  // Purchases and repeated chip/spark output reuse the objects built at loading.
  expect((await state(page)).nodes).toBe(nodesBeforeBuild);
  expect((await state(page)).fps).toBeLessThanOrEqual(31);
  await page.keyboard.press('f');
  await expect.poll(async () => (await state(page)).cinema).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).cinema).toBe(false);
  expect((await state(page)).camera_focus).toBe(false);
  await page.keyboard.press('c');
  await expect.poll(async () => (await state(page)).camera_focus).toBe(true);
  await page.setViewportSize({ width: 2880, height: 1800 });
  await expect.poll(async () => (await state(page)).render_width).toBe(1440);
  expect((await state(page)).render_height).toBe(900);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('Godot local storage preserves a run through a browser reload', async ({ page }) => {
  await ready(page, '?test=1&persist=1');
  await page.keyboard.press('Space');
  await expect.poll(async () => (await state(page)).chips, { timeout: 15_000 }).toBe(1);
  await page.keyboard.press('m');
  await expect.poll(async () => (await state(page)).sound_enabled).toBe(false);
  // The scene saves every two seconds; allow the web filesystem to synchronize.
  await page.waitForTimeout(3500);
  await page.reload();
  await expect.poll(async () => (await state(page))?.chips, { timeout: 60_000 }).toBe(1);
  expect((await state(page)).sound_enabled).toBe(false);
  expect((await state(page)).wafers).toBe(59);
});

test('the portrait control dock can fabricate with a tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  // Six action cards reflow into two columns. This is the real Godot UI,
  // not an HTML control calling privileged simulation methods.
  await page.mouse.click(85, 551);
  await expect.poll(async () => (await state(page)).chips, { timeout: 20_000 }).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button', { name: 'Open game controls' }).click();
  await expect(page.locator('#controls')).toBeVisible();
  await page.getByRole('button', { name: 'Back to the factory' }).click();
});

test('ambient audio remains bounded through two fabs and repeated mute toggles', async ({ page }) => {
  await page.addInitScript(() => {
    const audioWindow = window as unknown as { seedAudioSources: number };
    audioWindow.seedAudioSources = 0;
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      audioWindow.seedAudioSources++;
      return create.call(this);
    };
  });
  const sources = () => page.evaluate(() => (window as unknown as { seedAudioSources: number }).seedAudioSources);
  await ready(page);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await state(page)).chips).toBe(1);
  await page.waitForTimeout(2000);
  // One etch, one chip, one ambient loop: assigning unpause every frame used
  // to restart the loop dozens of times here, invisible to scene-node checks.
  expect(await sources()).toBeGreaterThan(0);
  expect(await sources()).toBeLessThan(8);
  await page.keyboard.down('Space');
  await expect.poll(async () => (await state(page)).capital, { timeout: 30_000 }).toBeGreaterThanOrEqual(1200);
  await page.keyboard.press('b');
  await expect.poll(async () => (await state(page)).fabs).toBe(1);
  await expect.poll(async () => (await state(page)).capital, { timeout: 30_000 }).toBeGreaterThanOrEqual(1700);
  await page.keyboard.press('b');
  await page.keyboard.up('Space');
  await expect.poll(async () => (await state(page)).fabs).toBe(2);
  const chips = (await state(page)).chips;
  const before = await sources();
  // Cross multiple eight-second ambience loops with both fabs operating.
  await page.waitForTimeout(18_000);
  expect((await state(page)).chips).toBeGreaterThan(chips + 6);
  expect(await sources() - before).toBeLessThan(25);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('m');
    await expect.poll(async () => (await state(page)).sound_enabled).toBe(false);
    await page.waitForTimeout(300);
    await page.keyboard.press('m');
    await expect.poll(async () => (await state(page)).sound_enabled).toBe(true);
  }
  const resumed = await sources();
  await page.waitForTimeout(3000);
  expect(await sources() - resumed).toBeLessThan(10);
});
