# Roadmap

Stages 1–6 (repair, honesty pass, GitHub Pages) are done. What follows is the
creative work that was deliberately deferred — scoped here so it isn't lost.

Ordered by payoff.

---

## Stage 7 — Making it cooler

The repair made the game *work*. This makes it *good*. The two items at the top
are the ones that would change how the game feels most, and both are called out
as limitations in the README today.

### 7.1 Give alignment teeth

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

### 7.2 Let the interface enact the story

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

### 7.3 Overseer drift

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

### 7.4 Deliberation as a first-class panel

Promote the ranking from a strip in the thought terminal to its own panel: a
live ranked action list whose scores visibly reshuffle as you drag the directive
sliders, before you commit. With WebLLM active, show the model's rationale
alongside the utility engine's ranking for the same state, so you can watch the
two disagree.

### 7.5 Smaller wins

- **"While you were away" summary** — offline catch-up already computes this
  (`save.ts` returns `offlineNpus` / `offlineMs`); it currently renders as a
  single dismissible line. It could be a proper summary card.
- **Provenance panel** — `__COMMIT_SHA__` and `__BUILD_TIME__` are already
  injected by `vite.config.ts` and currently unused. Surface them with a "no
  network — here's how to check" note. Important: don't let the app draw itself
  a green "verified" badge; a page cannot prove its own integrity.
- **Mobile layout.** Functional, not designed.
- **Canvas polish.** `NpuCanvasComponent`'s effect lists values that change every
  100ms in its deps, so the rAF loop is torn down and rebuilt ~10×/second. No
  `devicePixelRatio` handling either, so it's blurry on retina displays.

---

## Not planned, but worth considering

- **Bring-your-own-key cloud model.** Deliberately dropped: it costs the
  absolute network guarantee that `connect-src` currently provides. If it ever
  returns, it should be a separate opt-in with its own honest labelling, and the
  CSP consequence stated plainly.
- **More WebLLM models.** `WEBLLM_MODELS` in `webllm.ts` is already a list; a
  picker is a small change. Larger models mean better narration and a much
  bigger download.
- **Achievements / stats screen.** `StatsPanel.tsx` exists and is wired in but
  under-used.

---

## Housekeeping

- The GitHub repo description still reads *"Hosted online at paperclips.ai.studio
  … works on just about anything thanks to Google Edge AI."* Both halves are now
  false. Repo metadata isn't in the tree, so it needs changing in Settings.
- Root `CNAME` and `public/CNAME` are duplicates. Only `public/` reaches the
  build artifact; the root one was created by GitHub's UI. Harmless while they
  agree — worth collapsing to one.
