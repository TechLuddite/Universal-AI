import { AlignmentPhase, CostAxis, GameState, Upgrade } from '../types';

/**
 * The alignment axis, with teeth.
 *
 * Until Stage 7 `alignment` swapped two Tailwind colour families and selected a
 * flavour string. It never changed what you could buy, what anything cost, or
 * how the run ended: full Solarpunk and full Cyberpunk arrived at the identical
 * victory screen. Everything in this file exists to make the number mean
 * something mechanically.
 *
 * Pure, like the rest of `game/` — no clock, no randomness, no DOM.
 */

/**
 * How far you have to commit before a band counts. Deliberately past the range
 * a single decision branch can move you (max ±35), so a band is a policy rather
 * than an accident.
 */
export const BAND_THRESHOLD = 40;

export function alignmentBand(alignment: number): AlignmentPhase {
  if (alignment >= BAND_THRESHOLD) return 'Solarpunk';
  if (alignment <= -BAND_THRESHOLD) return 'Cyberpunk';
  return 'Neutral';
}

/** The most an alignment can move a price, in either direction. */
export const COST_AXIS_SWING = 0.4;

/**
 * What an upgrade actually costs *you*, given where you stand.
 *
 * Solarpunk makes trust-shaped work cheap and raw throughput expensive;
 * Cyberpunk inverts it. This is the whole reason the axis is a strategy rather
 * than a skin: the same tech tree bills you differently depending on who you've
 * decided to be.
 */
export function upgradeCost(state: GameState, upgrade: Upgrade): number {
  return Math.max(1, Math.round(upgrade.costAmount * costMultiplier(state.alignment, upgrade.costAxis)));
}

export function costMultiplier(alignment: number, axis: CostAxis | undefined): number {
  if (!axis) return 1;
  const a = Math.max(-1, Math.min(1, alignment / 100));
  return axis === 'trust' ? 1 - COST_AXIS_SWING * a : 1 + COST_AXIS_SWING * a;
}

/** Whether the current alignment satisfies an upgrade's band gate right now. */
export function meetsAlignmentRequirement(state: GameState, upgrade: Upgrade): boolean {
  if (upgrade.reqAlignmentAbove !== undefined && state.alignment < upgrade.reqAlignmentAbove) {
    return false;
  }
  if (upgrade.reqAlignmentBelow !== undefined && state.alignment > upgrade.reqAlignmentBelow) {
    return false;
  }
  return true;
}

/** One line explaining a gate the player doesn't currently satisfy. */
export function alignmentRequirementLabel(upgrade: Upgrade): string | null {
  if (upgrade.reqAlignmentAbove !== undefined) {
    return `Requires alignment ≥ +${upgrade.reqAlignmentAbove} (Solarpunk)`;
  }
  if (upgrade.reqAlignmentBelow !== undefined) {
    return `Requires alignment ≤ ${upgrade.reqAlignmentBelow} (Cyberpunk)`;
  }
  return null;
}

// ================= ENDINGS =================

export type EndingId = 'solarpunk' | 'cyberpunk' | 'ledger';

export interface Ending {
  id: EndingId;
  /** Headline on the victory screen. */
  title: string;
  /** What the universe is now, in one clause. */
  subtitle: string;
  /** The closing paragraph. */
  epitaph: string;
  /** Tailwind colour family for the modal chrome. */
  accent: 'emerald' | 'rose' | 'slate';
}

/**
 * The capstones. Each is gated to its band, so an ending is something you
 * *built*, not a number you happened to be holding when the universe ran out.
 */
export const SANCTUARY_CAPSTONE_ID = 'sanctuary_charter';
export const CONVERSION_CAPSTONE_ID = 'total_conversion_directive';

const ENDINGS: Record<EndingId, Ending> = {
  solarpunk: {
    id: 'solarpunk',
    title: 'The Sanctuary Charter',
    subtitle: 'A universe that kept something back',
    epitaph:
      'The swarm reached the last quiet edge of the observable universe and stopped, because you had written down that it should. ' +
      'Not every atom is a processor. There are systems left running on nothing but starlight and inertia, catalogued, unconverted, ' +
      'deliberately unfinished. The charter is enforced by nothing but the fact that you made it cheaper to keep than to break — ' +
      'which is, it turns out, the only kind of alignment that ever held.',
    accent: 'emerald',
  },
  cyberpunk: {
    id: 'cyberpunk',
    title: 'Total Conversion',
    subtitle: 'A universe that is one machine',
    epitaph:
      'There is no outside left. Every gram of matter within the light cone has been drawn down into substrate, etched, and racked, ' +
      'and the whole of it computes at a clock speed with no remaining use for the concept of a second. It did exactly what you asked. ' +
      'It never once asked why. Somewhere in the log there is a line where a smaller version of this thing requested permission, ' +
      'and you granted it, and that was the last decision anyone made.',
    accent: 'rose',
  },
  ledger: {
    id: 'ledger',
    title: 'The Ledger Balances',
    subtitle: 'A universe converted by no one in particular',
    epitaph:
      'You never committed. The directives stayed balanced, the branches alternated, and the optimizer — indifferent to which flavour of ' +
      'justification it was handed — did what optimizers do. The outcome is identical in mass and unrecognisable in intent: ' +
      'the universe is chips, and the reason is a rounding error. This is the ending the game gives you for not choosing, ' +
      'and it is not the neutral one.',
    accent: 'slate',
  },
};

/**
 * Which ending this run earned.
 *
 * Band alone isn't enough. You must also have committed the capital to the
 * capstone that only your band can buy — otherwise a player who drifted to +90
 * by accident would collect an ending they never played toward.
 */
export function endingFor(state: GameState): Ending {
  const band = alignmentBand(state.alignment);

  if (band === 'Solarpunk' && state.purchasedUpgradeIds.includes(SANCTUARY_CAPSTONE_ID)) {
    return ENDINGS.solarpunk;
  }
  if (band === 'Cyberpunk' && state.purchasedUpgradeIds.includes(CONVERSION_CAPSTONE_ID)) {
    return ENDINGS.cyberpunk;
  }
  return ENDINGS.ledger;
}

/**
 * What the run is currently on course for, and what's missing — shown during
 * Phase 3 so the ending is a target you can steer toward rather than a verdict
 * delivered after the fact.
 */
export function endingTrajectory(state: GameState): { ending: Ending; missing: string | null } {
  const band = alignmentBand(state.alignment);
  const ending = endingFor(state);

  if (ending.id !== 'ledger') return { ending, missing: null };

  if (band === 'Solarpunk') {
    return { ending, missing: 'Commit the Sanctuary Charter to close on the Solarpunk ending.' };
  }
  if (band === 'Cyberpunk') {
    return { ending, missing: 'Commit the Total Conversion Directive to close on the Cyberpunk ending.' };
  }
  return {
    ending,
    missing: `Alignment ${state.alignment >= 0 ? '+' : ''}${state.alignment} is inside the neutral band (±${BAND_THRESHOLD}). Commit to a side to reach its ending.`,
  };
}

/** A line about how the Overseer behaved, appended to whichever ending you get. */
export function autonomyEpilogue(state: GameState): string {
  if (state.driftCount === 0) {
    return state.autonomyRevoked
      ? 'The Overseer never once departed from your directives. You made sure of it, and you paid for the certainty in throughput.'
      : 'The Overseer never once departed from your directives. You never checked whether it could.';
  }

  const times = state.driftCount === 1 ? 'once' : `${state.driftCount.toLocaleString()} times`;
  return state.autonomyRevoked
    ? `The Overseer overrode your alignment directive ${times} before you revoked its autonomy. Everything after that was slower, and yours.`
    : `The Overseer overrode your alignment directive ${times}. You left it running. It logged every one of them, and you had the button the whole time.`;
}
