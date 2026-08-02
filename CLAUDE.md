# Working in this repo

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) first. Read
[`docs/LESSONS-FROM-AI-STUDIO.md`](docs/LESSONS-FROM-AI-STUDIO.md) before
trusting anything that looks finished — this codebase was generated in Google AI
Studio and then audited, and the audit found that its failure mode was
*plausibility*, not breakage.

## Commands

```bash
npm run dev      # localhost:3000 — CSP is relaxed here for HMR
npm run lint     # tsc --noEmit, strict. A real gate.
npm test         # vitest
npm run build    # static output in dist/
npm run preview  # localhost:4173 — the REAL CSP. Verify CSP changes here.
```

`lint` and `test` both gate the deploy. Don't push red.

## Invariants

**`src/game/` is pure.** No React, no DOM, no timers, no `Math.random()` or
`Date.now()` reached for directly — `tick(state, now, rng)` takes them as
parameters. This is what makes the simulation testable, and testability is what
caught the bugs that made this game unfinishable for its entire history.

**One canonical name per state field.** The original code carried duplicate
names (`clips`/`npus`, `wire`/`silicon`, `clipperCount`/`npuFabCount`) and the
tick wrote the legacy set while every upgrade wrote the new set, so about half
the game's rewards were silently discarded within 100ms. If a rename leaves both
names in place, it isn't a rename.

**The player and the Overseer call the same actions.** `src/game/actions.ts` is
the only place a mutation is defined. There used to be three drifting copies.

**Fallbacks announce themselves.** If an Overseer engine can't answer and another
stands in, `OverseerDecision.engine` must name the engine that *actually
decided*, and the UI must show it. The pre-repair code fell back silently and
labelled the fallback as the engine it replaced, which is how a cloud path that
had never once worked looked healthy for the project's whole life.
`src/game/overseer/webllm.test.ts` asserts this.

**New `GameState` field → add it to `createInitialState()`.** That's the save
migration story: `save.ts` spreads loaded data over the initial state, so old
saves get defaults instead of `undefined`.

**Drift announces itself.** When the Overseer takes the higher-utility action
over the one your alignment directive asked for, `OverseerDecision.drift` is
set, the thought text says so, the log entry is a warning, and `driftCount` goes
up. Same rule as the fallback, for the same reason.
`src/game/overseer/drift.test.ts` asserts it.

**`upgradeCost(state, upgrade)` is the only price.** Alignment moves it by up to
±40%. Anything that displays or spends a cost goes through that function — a
panel quoting the sticker while the ledger charges something else is the exact
shape of bug this repo keeps finding.

**Alignment gates are live.** `reqNpus` / `reqTrust` / `reqPhase` latch on once;
`reqAlignmentAbove` / `reqAlignmentBelow` are re-checked at purchase, inside
`buyUpgrade`. Drifting back to the middle takes band content away again. Don't
move that check into the UI — the Overseer buys upgrades too.

## Testing philosophy

Tests here assert **claims**, not implementation:

- *Can this game be finished?* — `game/completability.test.ts` drives the pure
  tick through all three phases to the win condition.
- *Does picking a side change how it ends?* — `game/endings.test.ts` plays three
  committed runs to victory and asserts three different endings.
- *Does a granted reward still exist one tick later?* — `game/rewards.test.ts`,
  every upgrade and decision branch.
- *Can a fallback pretend to be the engine it replaced?* —
  `game/overseer/webllm.test.ts`.

Each maps onto a real shipped bug. When adding a feature the README advertises,
add a test that the README is telling the truth.

## Things that will bite you

- **Verify CSP with `preview`, not `dev`.** Dev strips the policy for HMR.
- **Don't re-enable `build.modulePreload.polyfill`.** It injects inline script,
  which `script-src 'self'` blocks.
- **Don't precache WebLLM's chunk or worker** in the service worker. They're
  ~6MB each and WebLLM owns its own weight cache.
- **Keep WebLLM's import lazy.** `await import('@mlc-ai/web-llm')` keeps 6MB out
  of the initial bundle, which stays ~101KB gzipped. Check the build output if
  you touch it.
- **`probesCount` is fractional on purpose.** Flooring it each tick meant a
  100-probe swarm at 0.1%/tick growth rounded back to 100 forever.
- **`PHASE_DEMOLITION_MS` (App.tsx) must match the `panel-demolish` /
  `phase-banner` keyframes in `index.css`.** They're the same event, timed in two
  places; if they diverge, panels unmount mid-animation.
- **The two ending capstones are priced in different currencies deliberately.**
  Every trust-granting upgrade is alignment-positive, so a Cyberpunk run reaches
  Phase 3 with far less trust — and so far less memory and far fewer operations.
  Symmetric ops pricing made the Cyberpunk ending unreachable in practice, and
  only the headless run caught it.
- **The price floor is advice.** Nothing clamps it. The tick used to force the
  price up every 100ms, disabling the genre's central lever.

## Style

Match the surrounding code. Comments explain *why*, especially where a line
looks wrong but isn't (the fractional probe count, the missing `frame-ancestors`,
the advisory-not-enforced price floor). Several comments in `src/game/` record
what a piece of code used to do wrong — those are load-bearing; don't strip them.

## Deploy

Push to `main` → Actions → GitHub Pages at `paperclips.opsvibe.systems`. No
backend, no secrets, no API keys.
