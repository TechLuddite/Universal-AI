import { expect, test, type Page } from '@playwright/test';
import { createInitialState } from '../src/game/state';
import { exportSave } from '../src/game/save';
import { INITIAL_UPGRADES } from '../src/data/upgrades';
import { RECURRING_DECISION_BRANCHES } from '../src/data/decisionBranches';
import type { GameState } from '../src/types';

async function seed(page: Page, values: Partial<GameState> = {}) {
  const state = {
    ...createInitialState(),
    soundEnabled: false,
    completedDecisionIds: RECURRING_DECISION_BRANCHES.map((b) => b.id),
    ...values,
  };
  await page.addInitScript(
    (file) => {
      // Seed once: reloading must prove persistence, not reset the fixture.
      if (!sessionStorage.getItem('classic-fixture')) {
        const parsed = JSON.parse(file);
        parsed.savedAt = Date.now();
        localStorage.setItem('universal_ai_save_v1', JSON.stringify(parsed));
        sessionStorage.setItem('classic-fixture', '1');
      }
    },
    exportSave(state, INITIAL_UPGRADES),
  );
}


for (const phase of [1, 2, 3] as const) {
  test(`original phase ${phase} renders under production CSP`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await seed(page, { phase, totalNpusCreated: 5000, npuFabCount: 7 });
    await page.goto('/classic/');
    await expect(page.getByText(`PHASE ${phase}:`, { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Choose a Universal AI version' })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('.world-stage, .world-viewport, .chapter-track')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`original-phase-${phase}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test('original controls fabricate chips and buy a real fab', async ({ page }) => {
  await seed(page, { funds: 2000 });
  await page.goto('/classic/');
  await page.getByRole('button', { name: 'Etch NPU Chip', exact: true }).click();
  await page.getByRole('button', { name: /^NPU Fab/ }).click();
  await page.waitForTimeout(5500);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('universal_ai_save_v1')!));
  expect(stored.state.totalNpusCreated).toBeGreaterThan(0);
  expect(stored.state.npuFabCount).toBe(1);
});

test('saved phase survives development StrictMode and reload', async ({ page }) => {
  await seed(page, { phase: 2, alignment: 60, npuFabCount: 7, totalNpusCreated: 5000 });
  await page.goto('http://127.0.0.1:3000/classic/');
  await expect(page.getByText('PHASE 2: GRID', { exact: true })).toBeVisible();
  await expect(page.locator('.phase-banner')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('PHASE 2: GRID', { exact: true })).toBeVisible();
});

test('original app reloads offline without loading external models', async ({ page, context }) => {
  const external: string[] = [];
  page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith('http://127.0.0.1:4173/')) external.push(r.url()); });
  await seed(page);
  await page.goto('/classic/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Etch NPU Chip', exact: true })).toBeVisible();
  expect(external).toEqual([]);
});

test('app-shell updates preserve model caches owned by other systems', async ({
  page,
}) => {
  // Establish the origin without booting the app or its service worker.
  await page.goto('/icon.svg');
  await page.evaluate(async () => {
    for (const name of ['webllm-test-weights', 'universal-ai-obsolete']) {
      const cache = await caches.open(name);
      await cache.put('/test-cache-entry', new Response('retained model data'));
    }
  });
  await seed(page);
  await page.goto('/classic/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await caches.keys()).includes('universal-ai-obsolete'),
      ),
    )
    .toBe(false);
  expect(
    await page.evaluate(async () =>
      (await caches.keys()).includes('webllm-test-weights'),
    ),
  ).toBe(true);
});
