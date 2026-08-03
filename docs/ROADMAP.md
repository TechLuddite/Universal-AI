# Roadmap

Stages 1–6 (repair, honesty pass, GitHub Pages) are done. Stage 7 (7.1–7.3) is
done, and Stage 8 (the cohesion pass and currency rescale) after it. What
follows is what's left, plus a record of what Stage 7 chose *not* to build and
why.

Ordered by payoff.

---

## Stage 7 — Making it cooler — **done (7.1–7.3)**

The repair made the game *work*. This makes it *good*.

### 7.1 Give alignment teeth — **done**

Shipped as `src/game/alignment.ts` (bands at ±40, `upgradeCost`, the live gate,
`endingFor`), a `costAxis` tag on the upgrade data, four new band-exclusive
upgrades including two capstones, and `src/game/endings.test.ts` — three
headless runs to victory landing on three different endings.

Two things came out differently from the scoping below, both worth knowing:

- **The gate is live, not an unlock.** `reqNpus` / `reqTrust` / `reqPhase` latch
  on forever; `reqAlignmentAbove` / `reqAlignmentBelow` are re-checked at
  purchase, inside `buyUpgrade`. If a band gate latched, you could collect both
  sides' content by oscillating, and the axis would be a checkpoint rather than
  a commitment.
- **The two capstones are priced in different currencies, on purpose.** Every
  trust-granting upgrade in the game is alignment-positive, so a Cyberpunk run
  reaches Phase 3 with a fraction of a Solarpunk run's trust — and therefore its
  memory, and therefore its operations ceiling. Pricing both capstones in ops
  looked perfectly symmetric and made the Cyberpunk ending unreachable in
  practice. The headless run is what caught it; nothing about reading the file
  would have.

**Different win conditions per ending: deliberately not done.** The scoping
below says "ideally, different win conditions", and it's the one item here I'd
push back on. The obvious framing — a Solarpunk victory requires leaving some of
the universe unconverted — is vacuous at this game's numbers. Exploration
advances at `probes × speed × nav × 2e-9` per tick while harvesting takes
`probes × harvester × 100`, so reaching 100% exploration costs on the order of
`5e12` grams out of `6e18` available: about one millionth. Any restraint
condition stated in terms of matter preserved is met without the player doing
anything, and shipping it would have been a mechanic that reads as real and
isn't — which is precisely the failure mode
[LESSONS-FROM-AI-STUDIO.md](LESSONS-FROM-AI-STUDIO.md) is about. What's shipped
instead makes the *ending* something you build (band + capstone), which is a
real fork with a real cost, and leaves the victory condition honest and single.

A genuinely different win condition would need a different Phase 3 economy — one
where consumption and exploration actually compete for the same swarm. That's a
bigger change than Stage 7 was scoped for; it belongs in its own item if anyone
wants it.

<details>
<summary>Original scoping for 7.1</summary>

**The problem.** The Solarpunk/Cyberpunk axis is the best original idea in the
project and it is currently paint. `alignment` swaps two Tailwind colour families
and selects flavour text. It never changes what you can do, what anything costs,
what unlocks, or how the game ends. Full Solarpunk (+100) and full Cyberpunk
(−100) arrive at the identical victory modal.

**The work.**
- Gate some upgrades behind an alignment band (`reqAlignmentAbove` /
  `reqAlignmentBelow` on `Upgrade` — the unlock check in `App.tsx` is already
  the single place this is evaluated).
- Vary costs by alignment: Solarpunk buys trust cheaply and raw throughput
  expensively; Cyberpunk the reverse. That makes the axis a strategy, not a skin.
- **Three distinct endings.** Right now `CosmicVictoryModal` is one screen.
  Split into Solarpunk / Cyberpunk / Neutral with materially different text and,
  ideally, different win conditions.
- `flavorSolarpunk` / `flavorCyberpunk` already exist on every upgrade. Let them
  describe a real fork rather than a palette.

**Why first:** it converts the game's central theme from decoration into
mechanics, and most of the plumbing (the alignment number, the flavour strings,
a single unlock check) already exists.

</details>

### 7.2 Let the interface enact the story — **done**

Phase transitions are events now. The outgoing phase's panels stay mounted for
`PHASE_DEMOLITION_MS` and are visibly destroyed — shaken, desaturated, collapsed
— under a banner naming what was taken (`PhaseTransition.tsx`, `panel-demolish`
in `index.css`). The compute panel, the one thing that survives every
transition, stays bright while the rest comes down. Phase 3 collapses to the
swarm view: the swarm panel goes double-width, the compute block is demoted to a
strip along the bottom. The frame widens once per phase and never narrows. In
Overseer mode the pricing and procurement directives stop being rendered once
there is nobody left to sell to.

Keep `PHASE_DEMOLITION_MS` in App.tsx and the keyframe durations in `index.css`
in step, or panels unmount mid-animation.

<details>
<summary>Original scoping for 7.2</summary>

**The problem.** Universal Paperclips' real achievement is that the UI *is* the
narrative — controls appear, the frame widens, and by the end you've forgotten
there was ever a price slider. Here all three phases live inside the same static
three-panel grid behind `{phase === n && ...}` toggles. Nothing is ever taken
away from you. The horror of the original — that you are the optimizer, and you
never chose to be — is *stated in flavour text* instead of enacted.

**The work.**
- On the Phase 2 transition, visibly **destroy** the price, marketing and funds
  panels. Animate them out. Don't just stop rendering them.
- On Phase 3, collapse to the swarm view.
- Consider a one-way widening of the frame as scope grows.

**Why:** this is mostly CSS and sequencing — cheap relative to its impact — and
it's the single biggest gap between this and the game it's paying tribute to.

</details>

### 7.3 Overseer drift — **done**

`ScoredAction` now carries `utility` and `fit` separately, with `score` derived
from both, so drift is a matter of which number gets sorted on.
`overseer/drift.ts` rolls it: zero below 8 trust, rising 2% per point, capped at
35%, and exactly zero while autonomy is revoked. Both engines route through
`applyDrift`, so it applies whichever one is driving.

A departure only counts when the alternative is genuinely *both* higher-utility
and less directive-compliant — swapping in something that agrees with you just
as much would be noise, not drift. `MAKE_DECISION` now ranks both branches (with
utility measured by actually applying each branch's effect and diffing the
state), which is what gives drift something to defect *to*.

It is never silent: `OverseerDecision.drift`, a warning-level log entry, a badge
on the deliberation panel, a running count in the Overseer panel, and a line in
the ending. Revoking autonomy costs `AUTONOMY_REVOKED_THROUGHPUT` — 25% of
everything — and is reversible.

<details>
<summary>Original scoping for 7.3</summary>

**The problem.** The Overseer is the strongest original idea and it cannot
surprise you. There's no tension between your directives and its behaviour —
which is exactly the tension the whole game is about.

**The work.** As trust rises, the Overseer begins occasionally taking the
higher-utility action that *violates* your alignment directive — and logs that it
did. You can revoke its autonomy, at a cost in throughput.

Works on either engine. The scoring already separates "utility" from "directive
fit" in `utility.ts`, so drift is a matter of letting the former outweigh the
latter as trust grows, and surfacing it loudly.

**Why:** it's the paperclip thesis, made playable, using machinery that already
exists.

</details>

### 7.4 Deliberation as a first-class panel — **done**

Shipped as `src/components/DeliberationPanel.tsx`. The ranking is its own panel
now, above the thought terminal: recomputed live every render from the current
state by the same pure `rankActions` both engines use, so dragging a directive
slider reorders the rows before the Overseer commits to anything. Rows whose
`fit` is below 1 are marked — those are the rows drift can defect to.

Below the live ranking sits what the engine actually did last step, with the
existing drift and fallback badges, plus a new one: when WebLLM's pick differs
from the scorer's favourite, the panel names both actions and both scores
("Model overruled scorer"). The two engines disagreeing over the same state is
the interesting part, and now it's legible.

One thing to know: calling `rankActions` from render is only legitimate because
it is a pure read. `utility.test.ts` now asserts that — no state mutation, fully
deterministic, and it never consumes the context's `rng` (drift rolls dice at
decision time, never at ranking time).

### 7.5 Smaller wins — **done except mobile**

- **"While you were away" summary** — **done.** A proper card now
  (`OfflineReportCard.tsx`): time away, chips produced, average rate, and an
  honest note when the 8-hour cap was hit. The card reports what the catch-up
  replay in `save.ts` produced; it computes nothing itself.
- **Provenance panel** — **done.** `__COMMIT_SHA__` and `__BUILD_TIME__` are
  surfaced in the support modal, the commit linking to GitHub. Deliberately no
  "verified" badge — a page cannot prove its own integrity, and the comment in
  `DevSupportModal.tsx` says so. What it offers instead is the pointer to check
  from outside: the public Actions run, or build-and-diff.
- **Mobile layout.** Functional, not designed. Still open.
- **Canvas polish** — **done.** The rAF loop reads live values through a ref and
  is created once, instead of being torn down and rebuilt ~10×/second by its own
  dependency array; rendering is scaled by `devicePixelRatio` so it's no longer
  blurry on hiDPI displays. The legacy `clips`/`wire`/`clipperCount` props and
  their `??` fallbacks are gone — App was never passing them.

---

## Not planned, but worth considering

- **Bring-your-own-key cloud model.** Deliberately dropped: it costs the
  absolute network guarantee that `connect-src` currently provides. If it ever
  returns, it should be a separate opt-in with its own honest labelling, and the
  CSP consequence stated plainly.
- **More WebLLM models.** `WEBLLM_MODELS` in `webllm.ts` is already a list; a
  picker is a small change. Larger models mean better narration and a much
  bigger download.
- **Achievements / stats screen.** `StatsPanel.tsx` is now actually rendered
  (below the upgrades panel — for the project's whole prior life it was a dead
  component nothing imported, despite this file claiming otherwise). Achievements
  proper are still unbuilt.

---

## Stage 8 — Cohesion pass and the $100 chip — **done**

A sweep for claims the game made and didn't keep, in the spirit of the Stage 1–6
honesty pass; the details live in the invariants sections of `CLAUDE.md` and
`ARCHITECTURE.md`.

- **Phase transitions are purchases now.** There were three doors into Phase 3
  (the launch project, a silent tick transition on matter exhaustion, and the
  cosmic decision branch), and taking the wrong two in sequence reset a grown
  swarm. `space_exploration_initiative` is the only door, priced to the
  Cyberpunk ops ceiling so every band can afford to leave Earth. Hypno-drone
  deployment likewise requires the drones to have been built (`reqUpgradeId`).
- **Paid no-ops made real.** `algorithmic_pricing` actually prices (opt-in tick
  exception, floored at silicon cost); "permanent" wafer prices survive the
  market wobble; the laser defense array defends; the radar presets stopped
  spending probe trust on a legacy `wire` field that nothing reads.
- **Currency rescale.** An NPU launches at $100, not $0.25 — everything
  dollar-priced moved ×400 with it, anchored to `BASE_NPU_PRICE` in `tick.ts`.
  `SAVE_VERSION` is 2; v1 saves are declined rather than half-loaded.

---

## Housekeeping

- The GitHub repo description still reads *"Hosted online at paperclips.ai.studio
  … works on just about anything thanks to Google Edge AI."* Both halves are now
  false. Repo metadata isn't in the tree, so it needs changing in Settings.
- Root `CNAME` and `public/CNAME` are duplicates. Only `public/` reaches the
  build artifact; the root one was created by GitHub's UI. Harmless while they
  agree — worth collapsing to one.
