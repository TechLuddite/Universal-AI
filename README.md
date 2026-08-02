# Universal AI

An idle game about optimization, and about what happens when you stop being the
one doing it.

**Play it: [paperclips.opsvibe.systems](https://paperclips.opsvibe.systems)**

You start by etching NPU chips one at a time. You buy a fab, then fifty. You set
a price, chase demand, and earn trust. Then you hand the wheel to an autonomous
Overseer, give it directives, and watch it play better than you did — through
the end of the human market, the conversion of the planet, and out into a
self-replicating swarm.

It's a tribute to Frank Lantz's [Universal Paperclips](https://www.decisionproblem.com/paperclips/),
which remains the best argument ever made that a spreadsheet can be a horror
story. Play the original first.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run lint     # tsc --noEmit, strict
npm test         # vitest
npm run build    # static files in dist/
npm run preview  # serve the real build with the real CSP
```

No API keys. No `.env`. No backend. `npm run build` emits static files and
that's the entire deployment.

---

## The Overseer

You can play the whole game by hand. But the interesting part is Overseer mode,
where you set directives — alignment target, pricing strategy, expansion pace —
and something else executes them.

There are **two engines**, and both are real.

### Utility Engine (default)

A deterministic scorer. It enumerates every legal action, scores each against
your directives, and takes the highest. It is not a neural network and doesn't
pretend to be one.

What makes it worth watching is that it shows its work:

```
0.82  BUY_MEGA_FAB   megafab = 500x a standard fab, 12% of capital   ← chosen
0.61  BUY_SILICON    8s of wafers buffered
0.44  ADJUST_PRICE   Max Revenue wants $0.31, currently $0.25
0.12  BUY_MARKETING  demand at 240%
```

Drag the expansion pace slider and the ranking visibly reorders. That loop — you
tune the objective, you watch the objective change the behaviour — is what the
game is about, so it happens in front of you rather than inside a black box.

Instant, works in every browser, makes no network requests at all.

### WebLLM (opt-in)

An actual language model — Llama 3.2 1B, 4-bit quantized — running on your GPU
via WebGPU, in a Web Worker so generation never stutters the game loop.

It gets the game state, your directives, and the utility engine's ranking as
advice. It can disagree, and when it does it explains itself in its own words.
The disagreement is the interesting part.

- ~900 MB of weights, downloaded once from HuggingFace and cached. Offline after
  that.
- Downloads nothing until you press the button.
- Needs WebGPU: Chrome or Edge 113+.

**If it can't answer, it says so.** No WebGPU, model not loaded, malformed
response — the Utility Engine takes that step, and both the log and the
deliberation panel are marked as a fallback. You will always know which engine
actually decided. There are tests asserting a fallback can never label itself as
WebLLM, because the version that shipped before this one did exactly that.

---

## Where your data goes

Nowhere.

No backend, no analytics, no telemetry, no accounts, no cookies. Your save lives
in `localStorage`, and you can export it to a file.

The page ships a Content Security Policy naming the only origins it may contact,
ever:

| Origin | What for |
| --- | --- |
| `huggingface.co`, `*.hf.co` | WebLLM model weights |
| `raw.githubusercontent.com` | WebLLM's compiled model libraries |

Those are touched only if you opt into WebLLM and press download. On a default
game the Utility Engine has no network code at all, so nothing leaves your
machine. Don't take our word for it — open DevTools, play, and watch the Network
tab stay empty. Then switch on airplane mode and reload: a service worker caches
the app shell, so it keeps working.

To be precise about the limits of that: a document gets one CSP, so the policy
above applies to the whole page rather than only to the WebLLM engine. What CSP
enforces is that this page cannot reach anywhere *else*, whatever happens. What
keeps the default engine silent is that it contains no network code — which you
can confirm by watching, and by reading
[`src/game/overseer/utility.ts`](src/game/overseer/utility.ts).

---

## Limitations worth knowing

- **WebLLM needs WebGPU**, so Firefox and Safari get the Utility Engine only.
  The app detects this and says so instead of offering a button that can't work.
- **A 1B model is small.** You get an Overseer that reasons and narrates, not one
  that plays optimally — the Utility Engine is the stronger player. That
  tradeoff is the point.
- **The alignment axis is mostly cosmetic.** Solarpunk and Cyberpunk change the
  palette, the flavour text, and which branches you take, but not yet what
  unlocks, what things cost, or how the game ends. Making that axis mechanically
  real is the biggest thing still on the list.
- **The interface doesn't dismantle itself.** In Universal Paperclips the UI *is*
  the narrative — controls appear and vanish as the story moves. Here all three
  phases live in the same three-panel grid, and nothing is ever taken away from
  you, which costs the ending a lot of its weight.
- **Offline progress is capped at 8 hours**, so a laptop left shut for a month
  isn't an instant win.
- **The mobile layout is functional, not designed.** It works; it isn't nice.

---

## How it's built

React 19 + TypeScript + Vite + Tailwind 4. Canvas pixel-art renderer, SVG radar,
Web Audio synthesizer. Deployed to GitHub Pages from `main` by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which typechecks
and tests before it builds.

The simulation is a pure reducer:

```
src/game/
  state.ts      createInitialState() — one source of truth for a fresh run
  tick.ts       tick(state, now, rng) => state. No React, no timers, no DOM.
  actions.ts    every mutation a player or the Overseer can make, as pure functions
  save.ts       versioned saves, offline catch-up, export/import
  overseer/     the two engines behind one interface
```

Keeping the tick pure is what makes the tests possible: a headless run drives it
through all three phases to the victory condition in about half a second. That's
the regression guard for "this game can actually be finished" — which it
couldn't, until recently. A one-word field mismatch (`reqClips` against upgrades
that all define `reqNpus`) made two thirds of the content unreachable.

`npm run lint` runs `tsc --noEmit` under `strict`, and it's a real gate. It
wasn't always: `@types/react` was missing, so `react` resolved to `any`, every
state object went unchecked, and the typechecker reported zero errors on a
codebase carrying eighty-nine.

---

## Credits

Built by [TechLuddite](https://github.com/TechLuddite).

**Frank Lantz and Everybody House Games**, for *Universal Paperclips* — one of
the great thought experiments in AI philosophy, disguised as a game about
stationery.

**[Halo MSP](https://halomsp.com)**, for helping businesses with safe and
sensible AI and software implementation, and parent company
**[Tech 2U](https://tech2u.com)** for expert IT support and services.

And the incremental game community, who keep proving that numbers going up can
mean something.

MIT licensed — software art should stay freely accessible.
