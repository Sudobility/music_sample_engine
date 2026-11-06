/**
 * `@sudobility/music_sample_engine` — the MP3 sample-based FluidR3 player for
 * React Native, the **fallback** when no native synth is available.
 *
 * This is a whole `PlaybackEngine` (not a `SynthBackend`): it decodes per-note
 * MP3 recordings of FluidR3 and schedules them through `react-native-audio-api`,
 * where `music_synth_rn`'s `NativeSynthBackend` drives libfluidsynth live. It
 * is kept as its own package on purpose, so its use can be **monitored** (see
 * `createSamplePlayer`'s log) and the whole thing **retired** by deleting this
 * package and the app's fallback branch — nothing depends on it but that branch.
 *
 * The dependency points *down* at `music_player` (it reuses the scheduler
 * contract and the player shell), which is what keeps it retire-safe: deleting
 * it touches nothing in `music_player`, because `music_player` never imports it.
 * The small scheduler helpers it reuses (`NoteQueue`, `SoundingSet`, …) are
 * frozen copies under `src/shared/`, so this package stays self-contained.
 */
import { MusicPlayer, renderScoreWith } from '@sudobility/music_player';
import type { DecodedAudio, Score } from '@sudobility/music_types';
import { RNSamplePlaybackEngine } from './playback/sample-engine.js';
import { createRNSoundfontRenderer } from './audio/offline-render.js';

export { RNSamplePlaybackEngine } from './playback/sample-engine.js';
export { createRNSoundfontRenderer } from './audio/offline-render.js';
export { MEASURED_FROM_SHA256 } from './playback/expression-table.js';

export type SampleEngineOptions = {
  /**
   * Where the instrument packs are served from. An app shipping to a store
   * should copy them (CC-BY 3.0) and point this at its own bundle via
   * `fetchPack`, so playback needs no network.
   */
  packBase?: string;
  /** Reads a pack body given the URL `packBase`/`percussionBase` produced. */
  fetchPack?: (url: string) => Promise<string>;
  /** Where the drum-kit packs are served from. **Required for percussion.** */
  percussionBase?: string;
  /**
   * Called once when the sample engine is instantiated, so an app can log how
   * often it falls back here. Defaults to a tagged `console.info` an app's log
   * pipeline can pick up; pass `() => {}` to silence it.
   */
  onUse?: () => void;
};

/**
 * The React Native sample player, built fresh. Hand it to
 * `initializeMusicPlayer`. Instantiating it *is* the fallback happening, so
 * this is where usage is signalled.
 */
export function createSamplePlayer(
  options: SampleEngineOptions = {}
): MusicPlayer {
  (options.onUse ??
    (() =>
      console.info(
        '[music_sample_engine] MP3 sample fallback engine in use (no native synth)'
      )))();
  return new MusicPlayer(
    new RNSamplePlaybackEngine({
      packBase: options.packBase,
      percussionBase: options.percussionBase,
      ...(options.fetchPack ? { fetchPack: options.fetchPack } : {}),
    })
  );
}

/**
 * Renders a plan to PCM, faster than realtime, through the same packs the
 * sample engine plays — so an exported file is a recording of what was heard.
 * Pair with `music_player`'s `renderEvents` (via `renderScoreAudio`).
 */
export function renderSamples(options: SampleEngineOptions = {}) {
  return createRNSoundfontRenderer({
    packBase: options.packBase,
    percussionBase: options.percussionBase,
    ...(options.fetchPack ? { fetchPack: options.fetchPack } : {}),
  }).render;
}

/**
 * A score rendered to PCM through the sample packs — the whole of an audio
 * export short of encoding it. Hand the result to `io.saveAudio`.
 */
export function renderScoreAudio(
  score: Score,
  options: SampleEngineOptions = {}
): Promise<DecodedAudio> {
  return renderScoreWith(score, renderSamples(options));
}
