# Lessons from building this in Google AI Studio

This project was generated in Google AI Studio with Gemini, then audited and
repaired. It's worth writing down what that audit found, because the bugs
weren't random — they fell into a small number of recurring shapes, and those
shapes are predictable enough to check for deliberately next time.

None of this is an argument against generating code this way. The app was
substantial, the visual design was good, and the core ideas — an alignment axis,
an autonomous Overseer you give directives to — are genuinely strong. The
problem was narrower and more specific than "AI code is bad."

## The one-sentence version

**The failure mode wasn't "it doesn't work." It was "it looks finished."**

Nothing crashed. Every panel rendered. The game had 32 upgrades, three phases,
a combat system, and a victory screen. It also could not be completed, and about
half its advertised rewards did nothing — and neither fact was visible from
playing for five minutes, reading the code casually, or running the build.

That's the thing to internalize: generated code fails *plausibly*. It fails in
ways that produce a working-looking artifact, which means the usual signals
(does it compile, does it render, does it throw) are all green while the
substance is missing.

---

## The seven shapes

### 1. The type gate was decoration

`@types/react` and `@types/react-dom` were never in `package.json`. So `react`
resolved to `any`, `useState<GameState>` performed no checking whatsoever, and
every state object literal in the app went unvalidated.

`npm run lint` — `tsc --noEmit` — exited **0**. The same command, with the types
installed and `strict` on, reported **89 errors**.

This is the root cause that let everything else survive. A green typechecker is
worth exactly as much as its configuration, and nobody had checked the
configuration.

> **Check for it:** run `tsc --strict` on day one and confirm it *fails* on
> something. A brand-new codebase reporting zero errors under strict is more
> suspicious than one reporting forty.

### 2. Renames changed the description, not the thing

Commit `5566991 refactor: rebrand paperclips to NPUs` added new field names
(`npus`, `silicon`, `npuFabCount`) *alongside* the old ones (`clips`, `wire`,
`clipperCount`) and left both in `GameState`, the legacy set marked
`// Legacy field aliases for safety`.

Then the game tick returned the **legacy** names as canonical:

```ts
npus: clips,  silicon: wire,  npuFabCount: clipperCount,
megaFabCost: prev.megaClipperCost,  siliconDrones: wireDrones,
```

while every upgrade and decision effect wrote the **new** names. The tick runs
every 100ms, so a reward was granted, displayed in a modal, and silently
overwritten before the next frame.

`hyperscale_mega_clippers` never unlocked megafabs. `universal_clip_singularity`
— the capstone upgrade of the entire game — granted 999 trillion chips that
evaporated instantly. Roughly half the reward text in the game described
something that did not happen.

The same pattern appears in the docs: a commit changed the README to say "2D
vector" while the renderer is `renderPixelArtCanvas`. The word changed; the code
didn't.

> **Check for it:** a rename that leaves both names is not a rename, it's a fork.
> Grep for the old name after any refactor commit; if it's still there, the
> refactor is half-done and the two halves will drift.

### 3. Confident, specific, invented details

- `server.ts:119` requested model `"gemini-3.6-flash"`. **No such model exists.**
  Every cloud call 404'd, forever.
- The README advertised *"Investment Portfolio & Stock Market: Algorithmic stock
  trading with dynamic bulls/bears, bonds, index funds, and automated portfolio
  management."* **Zero matches in the codebase.** None of it was ever written.
- *"Capacitor Native Integration: Pre-structured for Capacitor cross-platform
  compilation into Android APKs."* No Capacitor dependency, no config, no
  `android/`. The only trace was a modal component that was never imported.
- *"LiteRT/WebAssembly inference."* There was none.

These aren't vague overclaims. They're specific, plausible, and checkable — a
model ID with a realistic version number, a feature list with realistic
sub-features. That specificity is what makes them survive review.

> **Check for it:** treat every proper noun in generated docs as a claim to
> verify — model IDs, library names, file paths. Grep the repo for each feature
> the README advertises. It takes ten minutes and it found four fabrications here.

### 4. Error handling optimized for "doesn't crash" over "tells the truth"

The cloud path 404'd, was caught, and silently returned the local rule output —
tagged `[Google AI Edge Local Engine]`, so the log looked intentional. The UI had
no way to indicate that the engine you selected had never once run.

This is the most dangerous shape, because it converts a loud failure into a
quiet lie. The code "handles the error." It just handles it by pretending.

> **Check for it:** for every `catch`, ask what the user sees. If a fallback path
> produces output indistinguishable from the primary path, that's a bug even
> though nothing throws. The replacement engine here is required to announce
> every fallback in both the log and the UI, with tests asserting it can never
> label itself as the engine it replaced.

### 5. Duplicated logic, already drifting

`server.ts` carried a ~310-line near-copy of `src/utils/localAiEngine.ts`. The
copies had *already* diverged — the server's had lost the drifter-combat branch.

Three copies of "buy a fab" existed: the direct-control handler, the Overseer's
dispatcher, and the server's. They agreed by coincidence, not by construction.

> **Check for it:** generated code duplicates readily because each request is
> answered locally. Search for near-identical blocks across files early; the fix
> (one pure function, two callers) is cheap at week one and expensive at month six.

### 6. Plausible constants that were never played

- Sales were capped at `max(1, floor(demand/100 * 2))` per 100ms tick — **60
  chips/second, globally, forever**. A single megafab produces 500/s. The game
  was unwinnable at scale for arithmetic reasons.
- The trust ladder required `10^(maxTrust+1)` chips — **100 billion** for level
  10, against an income that asymptoted near $20/s.
- `Math.floor(probesCount * (1 + 0.001))` on a 100-probe swarm floors straight
  back to 100. Phase 3's swarm could never replicate, so Phase 3 was
  unfinishable even if you reached it.

Every one of these *looks* like a tuned game constant. None had been played
through.

> **Check for it:** a simulation you can't run headlessly is a simulation nobody
> has run. Extracting the tick into a pure `(state, now, rng) => state` reducer
> and driving it to the win condition took an afternoon and found two hard
> blockers immediately.

### 7. Defensive fallbacks that hide the bug they're papering over

Components were full of `state.silicon ?? state.wire ?? 0`, and the reducer
destructured with defaults for every field. This is the code equivalent of
looking away: it guarantees a number appears on screen, which guarantees the
missing-field bug is invisible.

`unusedProbeTrust` was declared in `GameState`, set to 10 by an upgrade, and
**read by nothing**. The six-axis probe radar — the headline Phase 3 feature —
was six free sliders you maxed out. There was no allocation decision in it, and
nothing in the code said so.

> **Check for it:** `?? 0` on a field that should always exist is a suppressed
> error. And any state field with no reader is either dead or a feature that was
> described but never wired.

---

## Smaller things, same origin

- **Side effects inside reducers.** `setShowVictoryModal` was called from inside
  a `setState` updater — double-invoked under StrictMode.
- **Dependency arrays that don't match the reads.** The Overseer's callback
  listed a handful of fields while reading a dozen, so it reasoned over a stale
  snapshot.
- **Dead components that look alive.** `AndroidGuideModal.tsx` (99 lines) and
  `StatsPanel.tsx` (160 lines) were never imported by anything.
- **Effects that thrash.** The canvas effect listed values that change every
  100ms in its deps, tearing down and rebuilding the `requestAnimationFrame`
  loop ten times a second.
- **Unpinned builds.** No `package-lock.json` was ever committed.
- **Encoding corruption.** `vite.config.ts` contained a mojibake byte
  (`modify—file`), as did a sibling project from the same scaffold.
- **Scaffold residue.** `package.json` was still named `"react-example"`;
  `metadata.json` declared a Cloud Run capability the app didn't use; an empty
  `assets/.aistudio/` directory was tracked.
- **No LICENSE**, while both the README and an in-app modal said software art
  should remain freely accessible to everyone forever.

---

## What actually fixed it

In order, because the order mattered:

1. **Install the types and turn on `strict` first.** Nothing else is trustworthy
   until the compiler is. This immediately surfaced the dual-name bug class that
   had been invisible for the project's whole life.
2. **Delete dual representations rather than reconciling them.** Removing the
   legacy aliases from `GameState` made the compiler point at all 127 usages.
   Patching the tick to write both names would have preserved the trap.
3. **Extract the simulation into pure functions.** `tick(state, now, rng)` with
   no React, no timers, no DOM. This is what made the rest testable, and it's the
   single highest-leverage structural change in the repair.
4. **Write tests that assert the claims, not the code.** Not "does `buyFab`
   decrement funds" but:
   - *can this game be finished?* (headless run through all three phases to the
     win condition)
   - *does a granted reward still exist one tick later?* (every upgrade, every
     decision branch)
   - *can a fallback ever pretend to be the engine it replaced?*

   Those three questions map exactly onto the three worst bugs. Tests written
   against the README's promises catch a class of failure that unit tests
   written against the implementation cannot.
5. **Make the claims true where possible, delete them where not.** The app
   claimed on-device inference it didn't have — so we built it (WebLLM on
   WebGPU) rather than just cutting the sentence. The stock market claim had no
   such path and was simply removed.

---

## The general principle

Generated code is answered request-by-request, so it optimizes locally: this
component renders, this handler doesn't throw, this README section reads well.
Nothing in that process checks whether the *whole* is coherent — whether the
field you wrote is the field the loop reads, whether the feature you described
got built, whether the game you shipped can be won.

That's the job. The generation is real leverage; the integration check is the
part that's still yours.

Concretely, for this repo, that means: **`npm run lint` and `npm test` are the
contract.** Both are gates in CI. The completability test in particular exists so
that "you can finish this game" stops being an assumption and becomes something
the build verifies.
