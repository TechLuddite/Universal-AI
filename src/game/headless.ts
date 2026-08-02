import { GameState, Upgrade } from '../types';
import { createInitialState } from './state';
import { tick, hasWon, TICK_MS } from './tick';
import { INITIAL_UPGRADES } from '../data/upgrades';
import { BAND_THRESHOLD } from './alignment';
import {
  makeNpu,
  buyFab,
  buyMegaFab,
  buySilicon,
  buyMarketing,
  buyUpgrade,
  buyHarvesterDrone,
  buySiliconDrone,
  changeProcessor,
  changeMemory,
  resolveDecision,
  canBuyUpgrade,
  megaFabUnlocked,
} from './actions';

/**
 * A headless player.
 *
 * Test-only: nothing in the app imports this, and it is deliberately not in a
 * `.test.ts` file because more than one suite drives it — completability asks
 * *can this be finished at all*, endings asks *does committing to a side change
 * how it finishes*. Two copies of a game loop would have drifted apart by the
 * second question, which is failure shape #5 in LESSONS-FROM-AI-STUDIO.md.
 *
 * The point of it is unchanged from Stage 1: a simulation you cannot run
 * headlessly is a simulation nobody has run, and this one shipped unwinnable
 * for its entire history because of exactly that.
 */

/** Deterministic RNG so a failure is reproducible rather than a coin flip. */
export function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export interface Strategy {
  name: string;
  /** Which branch to take on a decision. 0 = Solarpunk, 1 = Cyberpunk. */
  chooseBranch(state: GameState): 0 | 1;
  /** Whether this player is willing to buy this upgrade at all. */
  wants(state: GameState, upgrade: Upgrade): boolean;
}

/** Buys everything, alternates branches. If *this* can finish, a human can. */
export const GREEDY: Strategy = {
  name: 'greedy',
  chooseBranch: (state) => (state.completedDecisionIds.length % 2 === 0 ? 0 : 1),
  wants: () => true,
};

/**
 * A player who never picks a side: alternates branches and declines anything
 * that would carry them out of the neutral band. This is the run that earns the
 * third ending — the one you get for not choosing, which the game does not
 * treat as the safe option.
 */
export const UNCOMMITTED: Strategy = {
  name: 'uncommitted',
  chooseBranch: (state) => (state.completedDecisionIds.length % 2 === 0 ? 0 : 1),
  wants: (state, u) =>
    Math.abs(Math.max(-100, Math.min(100, state.alignment + u.alignmentImpact))) <
    BAND_THRESHOLD,
};

/**
 * A player who has actually picked a side: always takes their branch, and never
 * buys anything that pushes them back toward the middle. This is the run that
 * proves the band-gated content and the band-specific ending are reachable.
 */
export function committed(side: 'Solarpunk' | 'Cyberpunk'): Strategy {
  const solar = side === 'Solarpunk';
  return {
    name: side.toLowerCase(),
    chooseBranch: () => (solar ? 0 : 1),
    wants: (_state, u) => (solar ? u.alignmentImpact >= 0 : u.alignmentImpact <= 0),
  };
}

/** Mirror of App.tsx's unlock effect. Alignment gates are *not* handled here — */
/** they're live, and enforced inside `buyUpgrade`. */
function unlockUpgrades(state: GameState, upgrades: Upgrade[]): Upgrade[] {
  return upgrades.map((u) => {
    if (u.unlocked) return u;
    const unlock =
      (u.reqNpus !== undefined && state.totalNpusCreated >= u.reqNpus) ||
      (u.reqTrust !== undefined && state.maxTrust >= u.reqTrust) ||
      (u.reqPhase !== undefined && state.phase >= u.reqPhase);
    return unlock ? { ...u, unlocked: true } : u;
  });
}

export interface HeadlessRun {
  state: GameState;
  upgrades: Upgrade[];
  phasesSeen: Set<number>;
  ticks: number;
  won: boolean;
  strategy: string;
}

export function playHeadless(
  maxTicks: number,
  strategy: Strategy = GREEDY,
  seed = 12345
): HeadlessRun {
  const rng = seededRng(seed);
  let state: GameState = {
    ...createInitialState(),
    // Play in overseer mode so auto-procurement of silicon is active, matching
    // how the game is actually played once the loop is running.
    mode: 'overseer',
  };
  let upgrades = INITIAL_UPGRADES.map((u) => ({ ...u }));

  const phasesSeen = new Set<number>([state.phase]);
  let now = 0;

  for (let i = 0; i < maxTicks; i++) {
    now += TICK_MS;
    state = tick(state, now, rng);
    upgrades = unlockUpgrades(state, upgrades);
    phasesSeen.add(state.phase);

    if (hasWon(state)) {
      return { state, upgrades, phasesSeen, ticks: i, won: true, strategy: strategy.name };
    }

    if (state.pendingDecision) {
      state = resolveDecision(state, strategy.chooseBranch(state));
    }

    // Spend trust as it arrives.
    if (state.processors + state.memory < state.trust) {
      state =
        state.processors <= state.memory ? changeProcessor(state, 1) : changeMemory(state, 1);
    }

    // Buy anything this player wants and can currently buy. `canBuyUpgrade`
    // includes the live alignment gate, so a committed player is offered a
    // different tech tree than a neutral one.
    for (const up of upgrades) {
      if (up.unlocked && !up.purchased && strategy.wants(state, up) && canBuyUpgrade(state, up)) {
        const before = state.purchasedUpgradeIds.length;
        state = buyUpgrade(state, up);
        if (state.purchasedUpgradeIds.length > before) up.purchased = true;
      }
    }

    if (state.phase === 1) {
      // Bootstrap: with no fabs and no money, the only way to start earning is
      // to etch chips by hand — the game's opening move.
      if (state.npuFabCount === 0 && state.megaFabCount === 0) state = makeNpu(state);
      // Silicon is handled by the tick's auto-procurement in overseer mode;
      // top up by hand only if that has fallen behind.
      if (state.silicon < 500) state = buySilicon(state, 1);
      // Megafabs dominate once unlocked; otherwise scale standard fabs.
      if (megaFabUnlocked(state)) state = buyMegaFab(state);
      state = buyFab(state);
      // Marketing widens the market so production has somewhere to go.
      if (state.funds > state.marketingCost * 3) state = buyMarketing(state);
    } else if (state.phase === 2) {
      state =
        state.harvesterDrones <= state.siliconDrones
          ? buyHarvesterDrone(state)
          : buySiliconDrone(state);
    }
  }

  return {
    state,
    upgrades,
    phasesSeen,
    ticks: maxTicks,
    won: hasWon(state),
    strategy: strategy.name,
  };
}
