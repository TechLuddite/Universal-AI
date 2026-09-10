# Universal AI: The Seed

**Performance investigation remains open.** The affected development laptop
was shut down from testing at the user’s request. Further testing from another
machine is pending; see [the handoff](../docs/PERFORMANCE-HANDOFF.md). Do not
interpret the audio regression fix or passing tests as a complete resolution.


A playable Godot 4.7.2 prototype of Universal AI's opening: turn one silicon
wafer into a chip, install the first autonomous fab, fill six bays, research
faster production, automate procurement, and connect the surrounding district.
The opening leads into **The Chorus**, a playable district chapter. Nine places,
a permanent charter, an autonomous builder with visible departures, and four
possible first transmissions turn the factory into a question about purpose.
Existing opening saves migrate automatically; production continues in both views.

This is a standalone economy and save, not yet a port of the original game's
three phases, alignment system, market, or optional local language model. The
supply controller uses explicit deterministic rules; it is not an LLM.

## Play locally

From the repository root, with Python 3.11+:

```sh
npm run godot:setup
npm run godot:build
npm run godot:serve
```

Open http://localhost:4180. For native editing, use `npm run godot:editor` or
import `godot/project.godot` into Godot 4.7.2. The Linux x86-64 helper downloads
the official editor and export templates, verifies their SHA-256 checksums,
and caches them outside the repository. The first template download is about
1.3 GB because Godot distributes all platforms together; only web templates
are retained. On other platforms, install the matching editor and set
`GODOT_BIN` to its executable.

## Controls

| Input | Action |
| --- | --- |
| Space (hold to repeat), click the central machine, or Etch button | Fabricate and sell a chip |
| B / R | Build a fab / order wafers |
| Tab / 1 / 2 / 3 | Switch factory/district after uplink / build garden, archive, foundry in district |
| O / A / U | Research overclock / toggle supply controller / district uplink |
| Drag / mouse wheel | Orbit / zoom |
| Click a fab / C | Inspect machine / toggle close-up |
| Click the highlighted empty bay | Build the next fab |
| F / Escape | Toggle cinema view / leave cinema view |
| M / Home | Toggle sound / reset camera |
| New Run | Confirm and reset this prototype's save |

Touch users can use the action dock and drag the scene. Each etch consumes one
wafer and pays $100 when finished. Twelve chips finance the first fab. Reserve
$600 for a shipment of 30 wafers. If you run out of both silicon and money,
procurement offers three reclaimed wafers so the run cannot become stranded.

Progress saves automatically to Godot's browser storage, separately from the
React game. Clearing site data removes it. There is no offline catch-up;
suspended tabs pause production. Sound begins after player interaction.

## What moves

Each machine has a rotating iridescent wafer, traversing etch head, timed laser,
loader arm, sparks, and a belt that carries each finished chip out. New machines
rise into their bays. The camera opens on the manual workstation, pulls back
with the first fab, and reveals a surrounding district at the uplink. Geometry,
shaders, and synthesized WAV sound effects are original procedural assets.
Static geometry is batched by material, with floor tiles instanced separately.
All six machines and fixed pools of chips and sparks are prepared during loading;
purchasing and production reuse those objects. Machine monitors show cycle state
instead of rebuilding percentage text throughout every cycle.

Rendering is capped at 30 fps and at a 1440 × 900 internal viewport (preserving
aspect ratio on smaller or portrait screens). MSAA and the full-screen mipmap
bloom pass are disabled to reduce GPU load. This trades some edge sharpness and
glow for a lower rendering budget on laptops. The simulation still advances by
elapsed time; the cap does not halve production speed.

## Build and verification

```sh
npm run godot:test          # 23 economy checks plus a headless scene smoke test
npm run godot:test:browser  # export, then Chromium and Firefox integration tests
npm run build              # existing React application
npm run godot:stage        # copy the previously exported game into dist/seed/
```

Install test browsers with `npx playwright install chromium firefox` if needed.
For a system browser, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. On this Linux
machine, `GODOT_BROWSER_ANGLE=gl` enables the hardware renderer in headless QA.
Software WebGL rendering can be much slower than normal browser GPU rendering.
GitHub CI uses a virtual display with Mesa and `GODOT_BROWSER_HEADED=1`, plus
the GL backend, because headless Firefox lacks WebGL 2 on that runner and its
default Chromium software backend misses the interactive timing budgets.

The browser tests exercise actual fabrication, purchasing, automatic production,
camera controls, reload persistence, and portrait touch controls. They also check
that building and producing do not grow the scene node count, the frame-rate
cap is applied, and large browser windows respect the internal resolution limit.
Both Chromium and Firefox run an audio regression through two working fabs,
multiple ambience loops, and repeated mute toggles. It counts actual Web Audio
sources: scene node counts alone cannot detect browser audio allocations.

Ambient pause state must only be assigned when the player toggles sound. In the
4.7.2 web sample backend, repeatedly assigning `stream_paused = false` restarts
the audio source even when already playing. The previous per-frame assignment
created runaway sources and reproduced rapid memory growth in Firefox. The
fix removes that assignment from the frame loop; it does not disable sound. The simulation
test completes the entire economy from a fresh state without free resources.
A separate manual browser playthrough also reached six fabs and the uplink.

`?test=1` exposes a read-only `window.__seed` snapshot for browser assertions and
disables saving. `?test=1&persist=1` enables saving for the reload test. There are
no browser resource-grant or arbitrary game-action debug hooks.

The Pages workflow builds both applications and publishes this prototype at
`/seed/`, linked from the React header. The export uses single-threaded
WebAssembly and WebGL 2 Compatibility rendering, so it needs no special
cross-origin isolation headers or backend. All runtime assets are same-origin.
The initial export is approximately 39 MB before transport compression.
Godot and third-party engine notices ship in `licenses/`.

## Source map

- `scripts/simulation.gd`: independent state, actions, fixed-time production, saves.
- `scripts/factory.gd`: input, fixed-step driver, camera, sound, persistence.
- `scripts/machine.gd`: animated fabrication machinery and emitted chips.
- `scripts/chamber.gd`: room, six bays, district reveal.
- `scripts/geometry.gd`: procedural mesh helpers and static batching.
- `scripts/interface.gd`: responsive Godot HUD and action availability.
- `shaders/`: wafer surface and subtle screen finish.
- `web/`: accessible loading/error screen, control reference, CSP-safe boot.

The next substantial step is porting the original simulation's systems into
this presentation, with explicit save migration and visual designs for each
later phase. This prototype establishes the room and production loop first.

## The Chorus

Every chip shipped after the uplink earns one signal. A district place costs
$2,500 + $750 per existing place and 20 + 10 signal per existing place. There
are exactly nine places. Gardens generate 1 resonance/s, archives 1.5, foundries
2. Manual district control applies a 25% resonance penalty; granting autonomy
restores the full rate. This is a deterministic utility controller, not an LLM.

The controller checks every eight seconds, uses the same purchase method as
the player, and reserves $600 for silicon. Its first six places follow your
directive. From six onward, it prefers foundries for higher output; departures
are explicitly recorded. Revoke autonomy to stop automatic construction. It
never chooses your charter or broadcasts on your behalf.

At three places choose a permanent charter. At nine places, spend $12,000 and
240 resonance to send first light. Four or more places matching the charter
produce The Open Hand, The Many, or The Unfinished Sun. A district whose
infrastructure diverges from its promise produces The Common Ground.

The atlas is a native vector drawing, limited to nine nodes and 27 travelling
signals, refreshed at 10 Hz while visible. Factory geometry is hidden and
machine/chamber animation is suspended in this view; the same simulation keeps
producing. No new audio assets, lights, particles, or external model downloads.
The performance investigation remains open.

Version 2 saves keep the original `the-seed-v1.json` location and accept version
1 factory saves. The browser regression fixture is enabled only by
`?test=1&scenario=chorus`; normal play exposes no state setter.
