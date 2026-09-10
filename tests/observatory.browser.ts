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
      if (!sessionStorage.getItem('observatory-fixture')) {
        const parsed = JSON.parse(file);
        parsed.savedAt = Date.now();
        localStorage.setItem('universal_ai_save_v1', JSON.stringify(parsed));
        sessionStorage.setItem('observatory-fixture', '1');
      }
    },
    exportSave(state, INITIAL_UPGRADES),
  );
}

test('fabrication funds a real fab, and instruments observe the result', async ({
  page,
}) => {
  await seed(page);
  await page.goto('/classic/');
  for (let i = 0; i < 20; i++)
    await page.getByRole('button', { name: 'Fabricate a chip' }).click();
  await expect(page.locator('.world-total > strong')).toHaveText('20');
  await expect(
    page.getByRole('button', { name: 'Build fab', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Build fab', exact: true }).click();
  await expect(page.locator('.world-total small')).toHaveText(
    '1 fabs connected',
  );
  await expect(page.getByRole('log')).toContainText('First fab online');
  await expect
    .poll(async () =>
      Number(await page.locator('.production-rate strong').innerText()),
    )
    .toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator('.world-total small')).toHaveText(
    '1 fabs connected',
  );
});

test('saved phase survives development StrictMode without playing a transition', async ({
  page,
}) => {
  await seed(page, {
    phase: 2,
    alignment: 60,
    npuFabCount: 7,
    totalNpusCreated: 5000,
  });
  await page.goto('http://127.0.0.1:3000/classic/');
  await expect(page.locator('h1')).toContainText('No more customers.');
  await expect(page.locator('.world-total small')).toHaveText(
    '7 fabs connected',
  );
  await expect(page.locator('.phase-banner')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('h1')).toContainText('No more customers.');
});

for (const phase of [1, 2, 3] as const) {
  test(`phase ${phase} renders on mobile under the production CSP`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, {
      phase,
      alignment: phase === 3 ? -80 : 50,
      probesCount: phase === 3 ? 1e12 : 0,
      spaceExploredPct: 2,
      probeAllocation: {
        ...createInitialState().probeAllocation,
        speed: 0,
        nav: 0,
      },
    });
    await page.goto('/classic/');
    await expect(page.locator('.chapter-track .current')).toContainText(
      `0${phase}`,
    );
    await expect
      .poll(() =>
        page
          .locator('.world-viewport canvas')
          .evaluate((canvas: HTMLCanvasElement) => canvas.width),
      )
      .toBeGreaterThan(0);
    await expect
      .poll(() =>
        page
          .locator('.world-viewport canvas')
          .evaluate((canvas: HTMLCanvasElement) =>
            canvas
              .getContext('2d')!
              .getImageData(0, 0, canvas.width, canvas.height)
              .data.some((v) => v > 0),
          ),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Expand observatory view' }).click();
    await expect(page.locator('.world-cinema')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.world-cinema')).toHaveCount(0);
    await page.getByRole('button', { name: 'Overseer', exact: true }).click();
    await expect(page.getByLabel('Overseer engine')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('the Overseer can start and stop from the observatory', async ({
  page,
}) => {
  await seed(page);
  await page.goto('/classic/');
  await page.getByRole('button', { name: 'Overseer', exact: true }).click();
  await page.getByRole('button', { name: 'Release the Overseer' }).click();
  await expect
    .poll(
      async () =>
        Number(await page.locator('.world-total > strong').innerText()),
      { timeout: 10000 },
    )
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause the Overseer' }).click();
  await expect(
    page.getByRole('button', { name: 'Release the Overseer' }),
  ).toBeVisible();
});

test('visual pause freezes the observatory without pausing simulation', async ({
  page,
}) => {
  await seed(page);
  await page.goto('/classic/');
  await page.getByRole('button', { name: 'Pause visual animation' }).click();
  await expect(
    page.getByRole('button', { name: 'Resume visual animation' }),
  ).toBeVisible();
  const canvas = page.locator('.world-viewport canvas');
  await expect
    .poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width))
    .toBeGreaterThan(0);
  // Let the first stationary frame replace the last animated frame.
  await page.waitForTimeout(650);
  const paused = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.waitForTimeout(650);
  expect(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    paused,
  );
  await page.getByRole('button', { name: 'Fabricate a chip' }).click();
  await expect(page.locator('.world-total > strong')).toHaveText('1');
});

test('reduced motion stops animation while retaining working controls', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page);
  await page.goto('/classic/');
  await expect(
    page.getByRole('button', { name: 'Pause visual animation' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Fabricate a chip' }).click();
  await expect(page.locator('.world-total > strong')).toHaveText('1');
});

test('the production app reloads offline and makes no external requests', async ({
  page,
  context,
}) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (
      !r.url().startsWith('http://127.0.0.1:4173/') &&
      /^https?:/.test(r.url())
    )
      external.push(r.url());
  });
  await seed(page);
  await page.goto('/classic/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toContainText('First, a chip.');
  await page.getByRole('button', { name: 'Fabricate a chip' }).click();
  await expect(page.locator('.world-total > strong')).toHaveText('1');
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
