# @sudobility/music_sample_engine (RN MP3 sample fallback)

> **Git policy — never auto-commit or auto-push.** Leave work in the working
> tree. Commit/push only when the user explicitly asks in that turn.

The MP3 sample-based FluidR3 playback engine for ScoreSmith on React Native —
the **fallback** used only when no native synth is available. It decodes
per-note recordings of FluidR3 and schedules them through
`react-native-audio-api`, where `@sudobility/music_synth_rn` drives libfluidsynth
live. (RN has no `AudioWorklet`/WebAssembly to run libfluidsynth, so the packs
are pre-rendered per note — Benjamin Gleitzman's packs from the same font.)

## Why it is its own package (and retire-safe)

So its use can be **monitored** and it can be **retired by deletion**.

- **Usage is observable** — `createSamplePlayer` calls `onUse` (default: a tagged
  `console.info`) exactly when the fallback is instantiated.
- **Retiring is a delete** — nothing depends on this package except the app's
  fallback branch. It depends **down** on `music_player` (reuses the
  `PlaybackEngine` contract from `music_player/core`, and `MusicPlayer` /
  `renderScoreWith`); `music_player` never imports this, so that one-way arrow is
  what makes it disposable. (Contrast `music_synth_rn`: a permanent
  `SynthBackend` depending only on `music_types`.)
- `src/shared/` holds **frozen copies** of the small scheduler helpers it reuses
  (`NoteQueue`, `SoundingSet`, `pump-window`, `visual-sync`, `midi`, `test-plan`).
  Copies, not imports, on purpose: a retire-candidate stays self-contained.

## Public surface (`src/index.ts`)

- `createSamplePlayer({ packBase?, percussionBase?, fetchPack?, onUse? })` →
  `MusicPlayer`. Instantiating it *is* the fallback.
- `renderSamples(options)` / `renderScoreAudio(score, options)` — sample-based
  audio export through the same packs (a file is a recording of what was heard).
- `RNSamplePlaybackEngine`, `createRNSoundfontRenderer`, `MEASURED_FROM_SHA256`.

## Gotchas (hard-won)

- **Pack names are not GM slugs** — punctuation is *removed*, not separated:
  `Honky-tonk Piano` → `honkytonk_piano`. 127/128 (program 54 disagrees).
  `gm-pack-name.test.ts` checks all 128; a wrong name is a 404 → zero samples →
  an instrument that plays nothing with no error.
- **Drum kits are rendered, not fetched** (`music_io/scripts/build-percussion-packs.mjs`):
  no CDN publishes usably-licensed GM percussion. `percussionBase` has **no
  default** (kits are app-hosted); unset, an app gets a sentence naming the build
  script rather than silent percussion.
- **A drum note is never bent** (`exactSample`, not `nearestSample`): a kit note
  number names a different instrument, so a missing slot plays nothing (as real
  hardware does), not a detuned neighbour.
- **Expression a recording can't carry is measured back in**
  (`playback/expression.ts`, `music_io/scripts/measure-expression.mjs`): packs are at full
  velocity. Three fixes — velocity is `(v/127)²` (SF2 concave modulator); a
  per-instrument low-pass whose corner falls with velocity (57/128 darken); a
  per-instrument release (median 0.56s). The table is **measured, not extracted**
  (generators can't be read off FluidR3's layered presets): the script renders
  all 128 at five velocities and finds the 3dB corner after normalising to the
  fundamental.
- **Notes longer than 3.13s** (every entry's length) **used to go silent.**
  `sustain-loop.ts` loops a window inside the steady portion spanning a whole
  number of periods (known — it is the entry being played), only for the 79
  instruments measured as holding level (looping a piano would sustain a note
  meant to decay).
- **Generated assets are pinned to the soundfont by SHA-256.**
  `expression-table.ts` and the percussion packs derive from
  `FluidR3Mono_GM.sf3`; each records the font hash, and `music_app` asserts the
  match via the dependency-free `.../expression-table` subpath (the package root
  would drag in `music_player` + RN peers a web app does not install). Without
  it, swapping the font leaves RN playing old kits and curves silently.
- **Export is rendered offline, not played into a file**
  (`audio/offline-render.ts`): schedules the whole plan against an
  `OfflineAudioContext`, sharing `PackLibrary`/`planVoice` with the engine.
  `RenderEvent.velocity` is 0..1 and `planVoice` normalizes 0..127 — reversing
  it renders ~127× too quiet (its own test guards it).

## Commands

- `bun install` — deps. In cross-repo work, overlay local `music_player` and
  `music_types` builds afterward (`bun install` reinstalls from the registry).
- `bun run verify` — format:check, typecheck, lint, test:unit, build. Before any push.
- `bun run test:unit` — vitest run (node; `react-native-audio-api` is faked per
  suite). `bun run test:watch` for watch mode. There is no `test` script.

## Related

`music_types` · `music_player` · `music_synth_rn` · `music_synth` ·
`music_app_rn` · `music_player_app_rn`
