# @sudobility/music_sample_engine

MP3 sample-based FluidR3 playback engine for ScoreSmith on React Native — the
**fallback** used only when no native synth is available.

It decodes per-note MP3 recordings of the FluidR3 soundfont and schedules them
through [`react-native-audio-api`](https://www.npmjs.com/package/react-native-audio-api).
On platforms where `@sudobility/music_synth_rn` can drive libfluidsynth live,
that native backend is used instead; React Native has no `AudioWorklet` /
WebAssembly to run libfluidsynth in-process, so this package plays pre-rendered
per-note samples (Benjamin Gleitzman's packs, rendered from the same font).

It is a whole `PlaybackEngine` (not a `SynthBackend`). It is a separate package
on purpose, so that its use can be **monitored** (`createSamplePlayer` logs when
the fallback is instantiated) and the whole thing can be **retired by deletion**:
nothing depends on it except the app's fallback branch, and it depends only
*downward* on `@sudobility/music_player`, which never imports it back.

## Install

This package is published to the GitHub Packages registry under the
`@sudobility` scope. `.npmrc` already points `@sudobility:registry` at
`https://npm.pkg.github.com`; authenticate to that registry first (a GitHub
token with `read:packages`).

```sh
bun install @sudobility/music_sample_engine
```

Peer dependencies you must also have installed in the host app:

- `@sudobility/music_player` `^0.1.85`
- `@sudobility/music_types` `^0.13.65`
- `react-native-audio-api` `>=0.13.0` (optional peer — required at runtime for
  actual playback, faked in tests)

## Usage

```ts
import { createSamplePlayer } from '@sudobility/music_sample_engine';

// Instantiating the player *is* the fallback happening.
const player = createSamplePlayer({
  // packBase defaults to the gleitz midi-js-soundfonts FluidR3_GM CDN.
  // Ship to a store by copying the packs (CC-BY 3.0) and serving them
  // from your own bundle via fetchPack, so playback needs no network.
  packBase: 'https://your.cdn/FluidR3_GM/',
  // Required for drum kits — these are app-hosted (see Percussion below).
  percussionBase: 'https://your.cdn/percussion/',
  fetchPack: url => myBundledFetch(url),
  onUse: () => myTelemetry('sample-fallback'), // pass () => {} to silence
});
// Hand `player` to music_player's initializeMusicPlayer.
```

### Audio export

Render a score to PCM through the same packs, faster than realtime, so the
exported file is a recording of what was heard:

```ts
import { renderScoreAudio } from '@sudobility/music_sample_engine';

const decoded = await renderScoreAudio(score, { packBase, percussionBase, fetchPack });
// Hand `decoded` to io.saveAudio.
```

## Public API (`src/index.ts`)

- `createSamplePlayer(options)` → `MusicPlayer` — the RN sample player.
- `renderSamples(options)` — a render function over the packs.
- `renderScoreAudio(score, options)` → `Promise<DecodedAudio>` — a score
  rendered to PCM (the whole of an audio export short of encoding).
- `RNSamplePlaybackEngine` — the `PlaybackEngine` implementation.
- `createRNSoundfontRenderer` — the offline renderer.
- `MEASURED_FROM_SHA256` — SHA-256 of the soundfont the generated assets derive
  from; assert it matches your `FluidR3Mono_GM.sf3`.

`options` (`SampleEngineOptions`): `packBase?`, `percussionBase?`, `fetchPack?`,
`onUse?` — see the doc comments in `src/index.ts`.

The dependency-free subpath `@sudobility/music_sample_engine/expression-table`
exposes `MEASURED_FROM_SHA256` without dragging in `music_player` and the RN
peers, so a web app can assert the soundfont hash.

## Project layout

```
src/
  index.ts              Public surface
  playback/
    sample-engine.ts    RNSamplePlaybackEngine (the PlaybackEngine)
    pack-library.ts     Fetch / decode / cache packs; which sample sounds
    sample-pack.ts      Pack parsing + sample selection (nearest/exact)
    gm-pack-name.ts     GM program number -> pack name (punctuation removed)
    pack-names.json     The 128 canonical GM pack names
    voice-plan.ts       planVoice — per-note voicing
    expression.ts       Velocity/filter/release applied to full-velocity packs
    expression-table.ts Generated: measured expression curves + font SHA-256
    sustain-loop.ts     Looping a steady window for notes longer than a sample
    audio-api.ts        react-native-audio-api type shims
  audio/
    offline-render.ts   OfflineAudioContext render (export)
  shared/               Frozen copies of music_player scheduler helpers
                        (note-queue, sounding-set, pump-window, visual-sync,
                        midi, test-plan) — copies, not imports, on purpose
scripts/
  fix-esm-imports.mjs   Rewrites emitted imports to explicit .js specifiers
```

## Develop

Requires [Bun](https://bun.sh) (the repo uses `bun.lock`).

```sh
bun install          # install deps
bun run build        # tsc (tsconfig.esm.json) then scripts/fix-esm-imports.mjs -> dist/
bun run test:unit    # vitest run (node; react-native-audio-api is faked per suite)
bun run test:watch   # vitest in watch mode
bun run typecheck    # tsc --noEmit
bun run lint         # eslint src
bun run format       # prettier --write
bun run format:check # prettier --check
bun run clean        # remove dist/
bun run verify       # format:check + typecheck + lint + test:unit + build
```

Run `bun run verify` before pushing. `prepublishOnly` runs `clean` + `verify`.

> Generated assets (`expression-table.ts`, the percussion packs) are pinned to
> the soundfont by SHA-256 and are produced by scripts that live in the
> `music_io` repo (`music_io/scripts/measure-expression.mjs`,
> `music_io/scripts/build-percussion-packs.mjs`), not in this package.

## License

BUSL-1.1. The FluidR3 sample packs are CC-BY 3.0.

## Related packages

`@sudobility/music_types` · `@sudobility/music_player` ·
`@sudobility/music_synth_rn` · `@sudobility/music_synth` · `music_app_rn` ·
`music_player_app_rn`
