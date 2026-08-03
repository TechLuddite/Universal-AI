# Architecture

Orientation for anyone (human or agent) picking this up cold.

## Shape of the thing

A single-page React app with no backend, no router, and no server state. The
whole deployment is `npm run build` → static files → GitHub Pages.

```
src/
  App.tsx            composition root: state, effects, wiring. No game rules.
  types.ts           GameState and friends. One canonical name per field.
  main.tsx           mount + service worker registration

  game/              the simulation. No React, no DOM, no timers.
    state.ts         createInitialState() / createNewGamePlusState()
    tick.ts          tick(state, now, rng) => state   ← the whole simulation
    actions.ts       every mutation, as pure (state, args) => state
    alignment.ts     bands, alignment-dependent pricing, gates, the three endings
    save.ts          versioned localStorage, offline catch-up, export/import
    headless.ts      test-only driver: strategies + a loop to the win condition
    overseer/
      types.ts       OverseerEngine interface, OverseerDecision, DriftRecord
      utility.ts     deterministic scorer (default engine)
      drift.ts       when the Overseer stops obeying, and how loudly it says so
      webllm.ts      Llama 3.2 1B on WebGPU (opt-in)
      worker.ts      WebLLM inference worker

  components/        presentation. Props in, callbacks out.
  data/
    upgrades.ts      32 upgrades; each has an effect(state) => Partial<GameState>
    decisionBranches.ts  narrative forks, same effect shape
  utils/
    pixelArt.ts      canvas renderer
    sound.ts         Web Audio synthesizer
```

## The one rule that matters

**`src/game/` is pure.** No React imports, no `window`, no timers, no
side effects. `tick()` takes `(state, now, rng)` and returns a new state.

This is not stylistic. It is what makes the game testable, and it is the
structural fix for the bug that made the game unfinishable for its entire
history before the repair (see
[LESSONS-FROM-AI-STUDIO.md](LESSONS-FROM-AI-STUDIO.md)). A simulation locked
inside a `useEffect` is a simulation nobody can run to completion, which means
nobody has.

If you need randomness or the clock inside `game/`, take them as parameters.
`tick` already does.

## Data flow

```
setInterval(100ms) ──► tick(state) ──► setState
                                          │
player click ──► handleX ──► actions.x(state) ──► setState
                                          │
Overseer loop ──► engine.decide(ctx) ──► same actions.* ──► setState
```

The player and the Overseer call **the same action functions**. Before the
repair there were three copies of this logic (direct handlers, Overseer
dispatcher, and a server-side duplicate) and they had already drifted. Keep it
at one.

Upgrades and decisions apply via `effect(state) => Partial<GameState>`, spread
over the state in `actions.buyUpgrade` / `actions.resolveDecision`.

## The Overseer

Two engines behind one interface:

```ts
interface OverseerEngine {
  decide(ctx: OverseerContext): Promise<OverseerDecision>;
}
```

`OverseerDecision` carries `chosen`, the full `ranked` list with scores, a
`thought` string, and — critically — `fellBackFrom` / `fallbackReason`.

**Non-negotiable invariant:** if an engine can't answer and another stands in,
the returned `engine` field must name the engine that *actually decided*, and
the fallback must be visible in the UI. The pre-repair code fell back silently
and labelled the fallback as the engine it replaced, so a cloud path that had
literally never worked looked like it was working. `src/game/overseer/webllm.test.ts`
asserts this directly.

- **`utility.ts`** — scores every legal action against the directives, returns
  the whole ranking. Default. Zero network. Add a new action by adding a scorer
  in the relevant `scorePhaseN` function.
- **`webllm.ts`** — opt-in, lazily imported so its ~6MB runtime stays out of the
  initial bundle. Feature-detects `navigator.gpu`, reports `unsupported` rather
  than offering a broken button.
- **`drift.ts`** — the Overseer's latitude to disobey. Both engines route their
  chosen action through `applyDrift` before returning.

`OverseerContext` carries an `rng`. It is supplied by the caller (App passes
`Math.random`) rather than reached for, for the same reason `tick` takes one.

### Drift

`ScoredAction` carries `utility` (advances the objective) and `fit` (agrees with
the alignment directive) as separate numbers; `score` is the first discounted by
the second. Drift is deciding to sort on `utility` alone.

The chance is zero below `DRIFT_TRUST_THRESHOLD`, rises with trust, caps at
`DRIFT_MAX_CHANCE`, and is exactly zero when `autonomyRevoked` — which costs
`AUTONOMY_REVOKED_THROUGHPUT` of all production, applied in `tick`.

**Same non-negotiable as the fallback:** a departure sets `OverseerDecision.drift`,
prefixes the thought text, logs at warning level, increments `driftCount`, and
shows in the panel and the ending. `game/overseer/drift.test.ts` asserts it.

## Alignment

`game/alignment.ts` is where the Solarpunk/Cyberpunk axis stops being paint.

- `alignmentBand()` — ±40. Deliberately past the largest single decision shift
  (±35), so a band is a policy, not an accident.
- `upgradeCost(state, upgrade)` — the **only** price. Scales the sticker price by
  up to ±40% along `costAxis`. Anything that displays or spends a cost goes
  through it; a panel quoting one number while `buyUpgrade` charges another is
  exactly the class of quiet disagreement this codebase has been burned by.
- `meetsAlignmentRequirement()` — the band gate. **Live**, unlike `reqNpus` /
  `reqTrust` / `reqPhase`, which latch on once. Enforced inside `buyUpgrade`, not
  in the UI, because the player and the Overseer both come through there.
- `endingFor()` — band **plus** the band-exclusive capstone. Holding +100 without
  ever committing to the Sanctuary Charter gets you the third ending.

## Phase transitions

Phase changes are events, not a render branch. App holds `demolishing`, keeps the
outgoing phase's panels mounted for `PHASE_DEMOLITION_MS`, and gives them
`panel-demolish`; `PhaseTransition` names what was lost over the top.

**Keep `PHASE_DEMOLITION_MS` in App.tsx in step with the keyframe durations in
`index.css`,** or panels unmount mid-animation. A restored save sets
`renderedPhase` directly so loading into Phase 3 doesn't demolish panels the
player never had open.

## Saves

`save.ts` writes a versioned envelope to `localStorage` (`universal_ai_save_v1`).
Loading spreads over `createInitialState()`, so a save written before a field
existed loads with that field's default instead of crashing.

**If you add a field to `GameState`, add it to `createInitialState()`.** That's
the whole migration story, and it's why New Game+ can no longer omit `aiLogs`
and crash the Overseer panel the way it used to.

`SAVE_VERSION` is 2 as of the currency rescale (NPU launch price $0.25 → $100,
anchored to `BASE_NPU_PRICE` in `tick.ts`). A v1 save carries old-scale prices
the new demand curve would misread by 400×, so it is declined, not half-loaded.
Bump the version again if the scale ever moves.

Offline progress replays `tick` for the elapsed wall time on load, capped at
8 hours.

## Network and CSP

The page ships a CSP in `index.html` naming the only origins it may ever reach:
`huggingface.co`, `*.hf.co`, `raw.githubusercontent.com` — all three only for
WebLLM weights. `script-src` includes `'wasm-unsafe-eval'` because WebLLM
compiles WebAssembly.

`build.modulePreload.polyfill` is **off** in `vite.config.ts` — the polyfill
injects inline script, which `script-src 'self'` blocks. Don't re-enable it.

`frame-ancestors` is deliberately absent: it's ignored in a `<meta>` CSP and
GitHub Pages can't set response headers, so listing it would imply protection
that isn't there.

A dev-only Vite plugin (`devCspRelax`) strips the CSP while serving locally so
HMR's WebSocket works. Production ships the policy exactly as written — so
**verify CSP changes with `npm run preview`, never `npm run dev`.**

## Service worker

Generated at build time by a plugin in `vite.config.ts`. Precaches the **app
shell only** — entry chunks by `isEntry`, plus the manifest and icon.

It explicitly does not cache WebLLM's dynamic chunk, its worker, or anything
cross-origin. WebLLM manages its own multi-hundred-megabyte weight cache and a
service worker competing with it would be a disaster.

## Tests

```
game/completability.test.ts   drives tick through phase 1 → 2 → 3 → victory
game/endings.test.ts          three committed runs reach three different endings
game/alignment.test.ts        bands gate content and move prices, both ways
game/rewards.test.ts          every upgrade/decision reward survives the next tick
game/save.test.ts             round-trip, migration, corruption, offline caps
game/overseer/utility.test.ts directives measurably reorder the ranking
game/overseer/drift.test.ts   a departure is never silent; revoking stops it
game/overseer/webllm.test.ts  fallback is always visible and never mislabelled
```

`game/headless.ts` is the shared driver for the first two. It's test-only and
imported by nothing in the app — but it is deliberately not inside a `.test.ts`,
because two suites drive it and a second copy of the game loop would have
drifted from the first.

These are written against **claims**, not implementation. "Can this game be
finished" is a test. So is "does a reward still exist 100ms after it's granted."
Both correspond to real shipped bugs; keep them green.

`npm run lint` is `tsc --noEmit` under `strict`. Both it and `npm test` gate the
deploy in `.github/workflows/deploy.yml`.

## Deploy

Push to `main` → typecheck → test → build → `dist/` → Pages.

`public/CNAME` is what reaches the artifact (Vite only copies `public/`). There's
also a root `CNAME` created by GitHub's UI when the custom domain was set; both
say `paperclips.opsvibe.systems`. Keep them in sync or drop the root one.

## Gotchas worth knowing

- `base: './'` in Vite — relative paths, so the build works from a custom domain
  root or a project subpath.
- Alignment gates are re-checked continuously; every other requirement latches.
  If you add a gate, add it to `meetsAlignmentRequirement`, not to App's unlock
  effect.
- The victory *condition* is the same on every path — only the ending differs.
  [ROADMAP.md](ROADMAP.md) has the arithmetic for why band-specific win
  conditions were dropped rather than faked.
- `probesCount` is deliberately fractional. Flooring it each tick meant a
  100-probe swarm growing at 0.1%/tick rounded back to 100 forever. Display
  floors it; the state does not.
- The advisory price floor is advice. Nothing clamps the player's price — the
  tick used to force it up every 100ms, which disabled the genre's central lever.
  The purchased `algorithmic_pricing` upgrade is the sole exception: an opt-in
  1%/second nudge that never prices below silicon cost.
- Phase transitions are purchases. `release_hypno_drones` (which needs
  `hypno_drones` built first, via `reqUpgradeId`) is the only door to Phase 2;
  `space_exploration_initiative` is the only door to Phase 3. The tick never
  changes `phase`, and the cosmic decision branch decides what the launched
  swarm is *for*, not whether it launches.
