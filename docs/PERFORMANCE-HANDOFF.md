# Performance investigation — OPEN

Updated 2026-09-10. **Do not treat the Godot performance problem as resolved.**

The development laptop experienced severe system-wide slowdowns, initially
near the first fab and later near the second. The user still reported excessive
resource use after the audio fix and requested shutdown. All project servers
and test browsers were stopped. Do not restart local servers, browsers, Godot,
or local performance runs on that machine without a new explicit instruction.
Remote GitHub Actions builds/tests and deployment are authorized.

## What is established

- Kernel logs recorded memory-allocation failures during the reported episodes.
- The original frame loop assigned `ambience.stream_paused = false` every frame.
  The Godot 4.7.2 web sample backend restarts an audio source on that assignment.
  A guarded Firefox reproduction with sound crossed 1.6 GB almost immediately;
  the muted comparison stayed around 800 MB. These are test-process-group
  measurements, not an isolated game heap measurement.
- The assignment now occurs only on a real sound toggle. Chromium and Firefox
  passed the two-fab audio regression, including multiple ambient loops and
  repeated mute/unmute. The isolated final Firefox test remained around
  1.1 GB for approximately 55 seconds.
- A combined browser suite reached its conservative memory guard between test
  cases; the final Firefox case was run separately. Browser sessions, test
  instrumentation, file cache, and the game must be measured separately before
  interpreting aggregate memory growth.
- Machines/effects are prepared and pooled. Rendering is capped at 30 fps and
  1440 × 900 internally. MSAA and full-screen bloom are disabled. These changes
  reduce work; they are not proof that the remaining problem is fixed.

## Hosted-session observation — 2026-09-10

The user reports that the GitHub Pages version is playing much more smoothly.
It is not yet established whether this was on another machine, with the same
browser/settings, or past the previously troublesome expansion milestones.
This is encouraging evidence, not a controlled comparison: local workloads,
browser state, and the deployed fixes remain possible contributors. The
cross-machine check and the local shutdown instruction remain in force.

## Next investigation

1. **Test the deployed site from another machine.** Record OS, browser/version,
   GPU, available RAM, display resolution/scaling, and whether hardware
   acceleration is enabled. Compare Firefox and Chromium where practical.
2. Start one game tab from a fresh run. Record baseline CPU, GPU, process memory,
   swap, and frame rate; then compare manual etching, one fab, two fabs, and later
   expansion. Record elapsed time as well as which purchase preceded a dip.
3. Compare sound on/off, background vs foreground, and reload vs a fresh browser
   process. Watch beyond the short regression-test window. Stop the test if
   system responsiveness or memory availability deteriorates.
4. Distinguish the game tab from browser GPU/audio processes, test harnesses,
   desktop shell, other tabs, and unrelated workloads. Avoid concurrent browser
   test suites on the affected laptop. Use an isolated process memory limit for
   intentional reproductions.
5. Keep the landing page's experimental/performance notice until sustained
   cross-machine evidence supports removing it. Do not close this investigation
   solely because CI, simulation tests, or audio allocation checks pass.

## Resuming development elsewhere

Clone `https://github.com/TechLuddite/Universal-AI`, check out `main`, and read
`CLAUDE.md`, `docs/ARCHITECTURE.md`, this file, and `godot/README.md`. The site
chooser is `/`, the full React game is `/classic/`, and the Godot prototype is
`/seed/`. Development source, original procedural assets, tests, and the Pages
workflow are tracked; generated engine binaries and web exports are not.

The games have separate browser-local saves. Changing browser, machine, or
origin does not transfer progress automatically. Git transfers the project,
not a running game's browser storage.
