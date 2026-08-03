import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from '../types';
import { createInitialState } from './state';
import { INITIAL_UPGRADES } from '../data/upgrades';
import { save, load, clearSave, hasSave, exportSave, importSave, applyOfflineProgress } from './save';

/** Minimal localStorage stand-in — these tests run in node, not a browser. */
function installMemoryStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  return store;
}

function playedState(): GameState {
  return {
    ...createInitialState(),
    funds: 4242.42,
    silicon: 31337,
    npus: 987654,
    totalNpusCreated: 1234567,
    npuFabCount: 42,
    megaFabCount: 7,
    megaFabCost: 1500,
    trust: 12,
    maxTrust: 12,
    alignment: -35,
    marketingLevel: 6,
    purchasedUpgradeIds: ['crowdfund_scrap', 'creativity_engine'],
  };
}

describe('saves round-trip', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it('restores a saved run', () => {
    const before = playedState();
    const upgrades = INITIAL_UPGRADES.map((u, i) => ({
      ...u,
      unlocked: i < 5,
      purchased: i < 2,
    }));

    save(before, upgrades);
    const restored = load();

    expect(restored).not.toBeNull();
    expect(restored!.state.funds).toBeCloseTo(before.funds, 5);
    expect(restored!.state.totalNpusCreated).toBe(before.totalNpusCreated);
    expect(restored!.state.npuFabCount).toBe(before.npuFabCount);
    expect(restored!.state.alignment).toBe(before.alignment);
    expect(restored!.state.purchasedUpgradeIds).toEqual(before.purchasedUpgradeIds);
  });

  it('restores which upgrades were unlocked and purchased', () => {
    const upgrades = INITIAL_UPGRADES.map((u, i) => ({
      ...u,
      unlocked: i < 5,
      purchased: i < 2,
    }));

    save(playedState(), upgrades);
    const restored = load()!;

    expect(restored.upgrades.filter((u) => u.purchased).map((u) => u.id)).toEqual(
      upgrades.filter((u) => u.purchased).map((u) => u.id)
    );
    expect(restored.upgrades.filter((u) => u.unlocked).length).toBeGreaterThanOrEqual(5);
  });

  it('reports no save when storage is empty', () => {
    expect(hasSave()).toBe(false);
    expect(load()).toBeNull();
  });

  it('clears a save', () => {
    save(playedState(), INITIAL_UPGRADES);
    expect(hasSave()).toBe(true);
    clearSave();
    expect(hasSave()).toBe(false);
  });

  it('ignores corrupt save data rather than throwing', () => {
    localStorage.setItem('universal_ai_save_v1', '{not json');
    expect(load()).toBeNull();
  });

  it('ignores a save from an incompatible version', () => {
    localStorage.setItem(
      'universal_ai_save_v1',
      JSON.stringify({ version: 999, savedAt: Date.now(), state: playedState() })
    );
    expect(load()).toBeNull();
  });

  it('fills in fields missing from an older save', () => {
    const partial = playedState() as Partial<GameState>;
    delete partial.probeTrustEarned;
    delete partial.siliconPerNpu;

    localStorage.setItem(
      'universal_ai_save_v1',
      JSON.stringify({
        version: 2,
        savedAt: Date.now(),
        state: partial,
        unlockedUpgradeIds: [],
        purchasedUpgradeIds: [],
      })
    );

    const restored = load();
    expect(restored).not.toBeNull();
    expect(restored!.state.probeTrustEarned).toBe(0);
    expect(restored!.state.siliconPerNpu).toBe(1.0);
  });

  it('exports and re-imports a run', () => {
    const before = playedState();
    const json = exportSave(before, INITIAL_UPGRADES);
    const imported = importSave(json);

    expect(imported).not.toBeNull();
    expect(imported!.state.totalNpusCreated).toBe(before.totalNpusCreated);
    expect(imported!.state.funds).toBeCloseTo(before.funds, 5);
  });

  it('rejects a file that is not a save', () => {
    expect(importSave('{"hello":"world"}')).toBeNull();
    expect(importSave('nonsense')).toBeNull();
  });
});

describe('offline progress', () => {
  it('advances production for time spent away', () => {
    const state = { ...playedState(), silicon: 10_000_000 };
    const { state: after, offlineNpus } = applyOfflineProgress(state, 10 * 60 * 1000);

    expect(offlineNpus).toBeGreaterThan(0);
    expect(after.totalNpusCreated).toBeGreaterThan(state.totalNpusCreated);
  });

  it('does nothing for a negligible gap', () => {
    const state = playedState();
    const { offlineNpus } = applyOfflineProgress(state, 50);
    expect(offlineNpus).toBe(0);
  });

  it('caps how much a long absence is worth', () => {
    const state = { ...playedState(), silicon: 1e12 };
    const day = applyOfflineProgress(state, 24 * 60 * 60 * 1000);
    const month = applyOfflineProgress(state, 30 * 24 * 60 * 60 * 1000);

    // Both exceed the cap, so a month away is worth no more than a day.
    expect(month.offlineNpus).toBe(day.offlineNpus);
  });
});
