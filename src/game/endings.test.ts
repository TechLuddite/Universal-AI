import { describe, it, expect } from 'vitest';
import { committed, playHeadless, UNCOMMITTED } from './headless';
import {
  alignmentBand,
  autonomyEpilogue,
  CONVERSION_CAPSTONE_ID,
  endingFor,
  endingTrajectory,
  SANCTUARY_CAPSTONE_ID,
} from './alignment';
import { createInitialState } from './state';

/**
 * The claim under test: **the alignment axis changes how the game ends.**
 *
 * Before Stage 7 it did not. Full Solarpunk (+100) and full Cyberpunk (−100)
 * reached the identical victory modal, because `CosmicVictoryModal` branched on
 * `alignment >= 0` for two paragraphs of flavour text and nothing else. That is
 * the sort of thing that looks finished and isn't, so it gets the same
 * treatment completability got: a headless run, driven to the real end state,
 * asserting the outcome rather than the implementation.
 *
 * Three runs, three endings. If a band's ending stops being reachable — the
 * capstone priced out of range, the gate unsatisfiable, the run too slow to buy
 * it before victory fires — one of these goes red.
 */

const TICKS = 400_000;

const runs = {
  solarpunk: playHeadless(TICKS, committed('Solarpunk')),
  cyberpunk: playHeadless(TICKS, committed('Cyberpunk')),
  neutral: playHeadless(TICKS, UNCOMMITTED),
};

describe('a committed run reaches its own ending', () => {
  it('all three strategies still finish the game', () => {
    for (const [name, run] of Object.entries(runs)) {
      expect(run.won, `${name} could not finish the game`).toBe(true);
    }
  });

  it('committing to Solarpunk lands in the Solarpunk band', () => {
    expect(alignmentBand(runs.solarpunk.state.alignment)).toBe('Solarpunk');
  });

  it('committing to Cyberpunk lands in the Cyberpunk band', () => {
    expect(alignmentBand(runs.cyberpunk.state.alignment)).toBe('Cyberpunk');
  });

  it('reaches the band-gated capstone that only that band can buy', () => {
    expect(runs.solarpunk.state.purchasedUpgradeIds).toContain(SANCTUARY_CAPSTONE_ID);
    expect(runs.cyberpunk.state.purchasedUpgradeIds).toContain(CONVERSION_CAPSTONE_ID);
  });

  it('never lets a run hold the other side’s capstone', () => {
    expect(runs.solarpunk.state.purchasedUpgradeIds).not.toContain(CONVERSION_CAPSTONE_ID);
    expect(runs.cyberpunk.state.purchasedUpgradeIds).not.toContain(SANCTUARY_CAPSTONE_ID);
  });

  it('produces three materially different endings', () => {
    const solar = endingFor(runs.solarpunk.state);
    const cyber = endingFor(runs.cyberpunk.state);
    const ledger = endingFor(runs.neutral.state);

    expect(solar.id).toBe('solarpunk');
    expect(cyber.id).toBe('cyberpunk');
    expect(ledger.id).toBe('ledger');

    // Not three labels on one screen: distinct titles and distinct closing text.
    const epitaphs = new Set([solar.epitaph, cyber.epitaph, ledger.epitaph]);
    expect(epitaphs.size).toBe(3);
    expect(new Set([solar.title, cyber.title, ledger.title]).size).toBe(3);
  });
});

describe('the ending is earned, not inherited from the alignment number alone', () => {
  it('a Solarpunk band with no charter still ends on the ledger', () => {
    const state = { ...createInitialState(), alignment: 100 };
    expect(endingFor(state).id).toBe('ledger');
  });

  it('and says exactly what is missing while there is still time to fix it', () => {
    const state = { ...createInitialState(), alignment: 100 };
    expect(endingTrajectory(state).missing).toMatch(/Sanctuary Charter/);
  });

  it('a neutral run is told that the middle is itself a choice', () => {
    const state = { ...createInitialState(), alignment: 5 };
    expect(endingTrajectory(state).missing).toMatch(/neutral band/);
  });
});

describe('the ending reports what the Overseer actually did', () => {
  it('distinguishes an obedient run from one that drifted', () => {
    const base = createInitialState();
    const quiet = autonomyEpilogue(base);
    const drifted = autonomyEpilogue({ ...base, driftCount: 7 });
    const revoked = autonomyEpilogue({ ...base, driftCount: 7, autonomyRevoked: true });

    expect(new Set([quiet, drifted, revoked]).size).toBe(3);
    expect(drifted).toContain('7');
    expect(revoked).toMatch(/revoked/i);
  });
});
