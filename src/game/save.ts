import { GameState, Upgrade } from '../types';
import { createInitialState } from './state';
import { INITIAL_UPGRADES } from '../data/upgrades';
import { tick, TICK_MS } from './tick';

const STORAGE_KEY = 'universal_ai_save_v1';
/**
 * v2: the currency rescale (NPU launch price $0.25 → $100). A v1 save carries
 * old-scale prices and costs that the new demand curve and sticker prices would
 * misread by a factor of 400, so it's declined rather than half-loaded.
 */
const SAVE_VERSION = 2;

/** Cap offline catch-up so a laptop left closed for a month isn't an instant win. */
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000; // 8 hours

/** Ticks simulated per batch when catching up, to bound the work on load. */
const MAX_CATCHUP_TICKS = 20_000;

interface SaveFile {
  version: number;
  savedAt: number;
  state: GameState;
  /** Only the ids matter — the rest of each upgrade is static data. */
  unlockedUpgradeIds: string[];
  purchasedUpgradeIds: string[];
}

export interface LoadResult {
  state: GameState;
  upgrades: Upgrade[];
  /** Milliseconds of real time that elapsed while the tab was closed. */
  offlineMs: number;
  /** Chips produced during offline catch-up, for the "while you were away" note. */
  offlineNpus: number;
}

function isBrowser(): boolean {
  return typeof localStorage !== 'undefined';
}

export function save(state: GameState, upgrades: Upgrade[]): void {
  if (!isBrowser()) return;

  const file: SaveFile = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    state,
    unlockedUpgradeIds: upgrades.filter((u) => u.unlocked).map((u) => u.id),
    purchasedUpgradeIds: upgrades.filter((u) => u.purchased).map((u) => u.id),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
  } catch {
    // Quota exceeded or storage disabled — the game keeps running unsaved.
  }
}

/**
 * Rebuild state from a save file.
 *
 * Unknown or missing fields fall back to their initial values, so a save from
 * an older build loads rather than crashing on a field added since.
 */
function hydrate(file: SaveFile): { state: GameState; upgrades: Upgrade[] } {
  const state: GameState = {
    ...createInitialState(),
    ...file.state,
    // Never restore a modal-ish transient from disk.
    pendingDecision: file.state.pendingDecision ?? null,
  };

  const unlocked = new Set(file.unlockedUpgradeIds ?? []);
  const purchased = new Set(file.purchasedUpgradeIds ?? []);

  const upgrades = INITIAL_UPGRADES.map((u) => ({
    ...u,
    unlocked: unlocked.has(u.id) || u.unlocked,
    purchased: purchased.has(u.id),
  }));

  return { state, upgrades };
}

/**
 * Advance a loaded state by the time the tab was closed.
 *
 * Idle games are largely played while you aren't looking; without this, closing
 * the tab discards all progress made in the meantime.
 */
export function applyOfflineProgress(
  state: GameState,
  elapsedMs: number
): { state: GameState; offlineNpus: number } {
  const capped = Math.min(elapsedMs, MAX_OFFLINE_MS);
  const ticks = Math.min(Math.floor(capped / TICK_MS), MAX_CATCHUP_TICKS);
  if (ticks <= 0) return { state, offlineNpus: 0 };

  const startingNpus = state.totalNpusCreated;
  let now = Date.now() - capped;
  let next = state;

  for (let i = 0; i < ticks; i++) {
    now += TICK_MS;
    next = tick(next, now);
  }

  return { state: next, offlineNpus: next.totalNpusCreated - startingNpus };
}

export function load(): LoadResult | null {
  if (!isBrowser()) return null;

  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let file: SaveFile;
  try {
    file = JSON.parse(raw);
  } catch {
    return null;
  }

  if (file?.version !== SAVE_VERSION || !file.state) return null;

  const { state, upgrades } = hydrate(file);
  const offlineMs = Math.max(0, Date.now() - (file.savedAt ?? Date.now()));
  const caught = applyOfflineProgress(state, offlineMs);

  return {
    state: caught.state,
    upgrades,
    offlineMs: Math.min(offlineMs, MAX_OFFLINE_MS),
    offlineNpus: caught.offlineNpus,
  };
}

export function clearSave(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do.
  }
}

export function hasSave(): boolean {
  if (!isBrowser()) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Serialise the current run for download, so a save isn't trapped in one browser. */
export function exportSave(state: GameState, upgrades: Upgrade[]): string {
  return JSON.stringify(
    {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      state,
      unlockedUpgradeIds: upgrades.filter((u) => u.unlocked).map((u) => u.id),
      purchasedUpgradeIds: upgrades.filter((u) => u.purchased).map((u) => u.id),
    },
    null,
    2
  );
}

/** Parse a save file produced by `exportSave`. Returns null if it isn't one. */
export function importSave(json: string): { state: GameState; upgrades: Upgrade[] } | null {
  try {
    const file: SaveFile = JSON.parse(json);
    if (file?.version !== SAVE_VERSION || !file.state) return null;
    return hydrate(file);
  } catch {
    return null;
  }
}
