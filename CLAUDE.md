# @sudobility/music_sample_engine (RN MP3 sample fallback)

> **Git policy — never auto-commit or auto-push.** Leave work in the working
> tree. Commit/push only when the user explicitly asks in that turn.

The MP3 sample-based FluidR3 playback engine for ScoreSmith on React Native —
the **fallback** used only when no native synth is available. It decodes
per-note recordings of FluidR3 and schedules them through
`react-native-audio-api`, where `@sudobility/music_synth_rn` drives libfluidsynth
live.

## Why it is its own package

So its use can be **monitored** and it can be **retired** without ceremony. The
native backend (`music_synth_rn`) is the primary path on every platform now;
this engine exists for devices/builds where the native module is missing. It is
split out so that:

- **Usage is observable** — `createSamplePlayer` calls `onUse` (default: a
  tagged `console.info`) exactly when the fallback is instantiated, which only
  happens when the app couldn't build a native backend.
- **Retiring is a delete** — remove this package, remove the app's fallback
  branch and its dependency line. Nothing else breaks, because **nothing
  depends on this package except that branch.**

## The dependency direction is the whole trick

This package depends **down** on `@sudobility/music_player` (it reuses the
`PlaybackEngine` contract from `music_player/core`, and `MusicPlayer` /
`renderScoreWith` from its main entry). `music_player` never imports *this*, so
deleting this package leaves `music_player` untouched — that one-way arrow is
what makes it retire-safe. Contrast `music_synth_rn`, which depends only on
`music_types`: that one is a permanent `SynthBackend`; this is a disposable
`PlaybackEngine`.

`src/shared/` holds **frozen copies** of the few small scheduler helpers it
reuses (`NoteQueue`, `SoundingSet`, `pump-window`, `visual-sync`, `midi`, and
the `test-plan` test helper). They are copies, not imports, on purpose: a
retire-candidate should be self-contained rather than keep `music_player`'s
internals public, and a frozen fallback does not need to track core changes.

## Public surface (`src/index.ts`)

- `createSamplePlayer({ packBase?, percussionBase?, fetchPack?, onUse? })` →
  `MusicPlayer`. Instantiating it *is* the fallback; `onUse` is the usage hook.
- `renderSamples(options)` / `renderScoreAudio(score, options)` — sample-based
  audio export, through the same packs, so a file is a recording of what was
  heard.
- `RNSamplePlaybackEngine`, `createRNSoundfontRenderer`, `MEASURED_FROM_SHA256`.

## Deep notes (the hard-won ones)

The packs play FluidR3 **pre-rendered per note** (Benjamin Gleitzman's packs,
from the same `FluidR3_GM.sf2` the web plays as `FluidR3Mono_GM.sf3`), because
React Native has no `AudioWorklet` or WebAssembly to run libfluidsynth. Every
key of all 128 melodic programs is a real recording, so nothing is
pitch-shifted in range; what is lost is SF2's live per-zone filters and
envelopes — measured back in below.

- **Pack names are not GM slugs.** Punctuation is *removed*, not turned into a
  separator: `Honky-tonk Piano` → `honkytonk_piano`, `Lead 8 (bass + lead)`
  keeps the double underscore where `+` was. 127 of 128; program 54 is a real
  naming disagreement. `gm-pack-name.test.ts` checks all 128 against a vendored
  manifest — a wrong name is a 404, which parses to zero samples, an instrument
  that plays nothing with no error.
- **Drum kits are rendered, not fetched** (`scripts/build-percussion-packs.mjs`):
  no CDN publishes usably-licensed GM percussion. The eight GM kits are rendered
  from the same SF3 into the melodic packs' format. `percussionBase` has **no
  default** — the melodic packs have a CDN, the kits are app-hosted, so there is
  nowhere to point; an app that ships drums and never sets it gets a sentence
  naming the build script rather than silent percussion.
- **A drum note is never bent** (`exactSample`, not `nearestSample`). In a kit a
  note number names a *different instrument* (38 snare, 42 closed hi-hat), so
  the nearest slot answers a missing cowbell with a detuned tom. A slot the kit
  does not define plays nothing, as real hardware does.
- **The expression a recording cannot carry is measured back in**
  (`playback/expression.ts`, `scripts/measure-expression.mjs`). Packs are taken
  at full velocity, so softer is just the loud recording turned down — where
  fluidsynth darkens it, shapes release per instrument, and sustains while held.
  Three fixes: **velocity is (v/127)², not v/127** (SF2's concave modulator — the
  linear curve was 12dB too loud on soft passages); a **per-instrument low-pass**
  whose corner falls with velocity (only 57/128 darken); a **per-instrument
  release** (median 0.56s measured, vs a flat 80ms that chopped released chords).
  **The table is measured, not extracted**: reading `initialFilterFc` out of the
  `pdta` gave the piano a 300Hz low-pass because FluidR3's piano preset layers
  two instruments — generators cannot be read off a layered preset, so the
  script renders all 128 at five velocities and finds the 3dB corner **after
  normalising both to the fundamental**.
- **Notes longer than 3.13s used to go silent** — every pack entry is exactly
  that long. `sustain-loop.ts` loops a window inside the steady portion
  **spanning a whole number of periods of the sampled note** (known, since it is
  the entry being played — no pitch detection); zero-crossing alignment alone
  left a phase discontinuity audible as a once-a-second buzz. Only for the 79
  instruments measured as holding their level — looping a piano would sustain a
  note meant to die away.
- **Generated assets are pinned to the soundfont by hash.** `expression-table.ts`
  and the percussion packs are derived from `FluidR3Mono_GM.sf3` and regenerated
  by nobody; each records the font's SHA-256, and `music_app` asserts the match
  via the dependency-free `@sudobility/music_sample_engine/expression-table`
  subpath (reaching it through the package root would drag in `music_player` +
  RN peers a web app does not install). Without it, swapping the font leaves RN
  playing old kits and curves silently.
- **Export is rendered offline, not played into a file** (`audio/offline-render.ts`):
  the renderer schedules the whole plan up front against an `OfflineAudioContext`,
  sharing `PackLibrary` and `planVoice` with the engine so the file is a
  recording of what was heard. `RenderEvent.velocity` is 0..1 and `planVoice`
  normalizes 0..127 — getting that backwards renders ~127× too quiet (its own
  test guards it).

## Commands

- `bun install` — deps (then overlay local `@sudobility/music_player` and
  `music_types` builds in cross-repo work; `bun install` reinstalls from the
  registry).
- `bun run verify` — format, typecheck, lint, test, build. Before any push.
- `bun run test` — vitest (node; `react-native-audio-api` is faked per suite).

## Related

`music_types` · `music_player` · `music_synth_rn` · `music_synth` ·
`music_app_rn` · `music_player_app_rn`
