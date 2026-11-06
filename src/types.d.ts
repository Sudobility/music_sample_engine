/**
 * Type stub for the one native module this package uses.
 *
 * Declared here rather than installed, the same convention `music_player`'s
 * `rn/types.d.ts` followed: pulling in `react-native-audio-api` for its types
 * would drag `react-native` into this package's dev tree for no benefit, since
 * it cannot run outside a device anyway. It is an optional peer; a React Native
 * app supplies the real one. Only the members the engine actually calls are
 * declared — widening this would invite use of members not thought about on
 * this side of the boundary.
 */
declare module 'react-native-audio-api' {
  /**
   * The shape `decodeAudioData` resolves with: `AudioBuffer`-compatible, which
   * is what lets the mp3 mixdown take it and the browser's `AudioBuffer` alike.
   */
  export interface AudioBuffer {
    readonly length: number;
    readonly numberOfChannels: number;
    readonly sampleRate: number;
    readonly duration: number;
    getChannelData(channel: number): Float32Array;
  }

  export function decodeAudioData(
    input: ArrayBuffer,
    sampleRate?: number
  ): Promise<AudioBuffer>;

  /**
   * The nodes `playback/sample-engine.ts` builds a voice out of. Still only
   * what is actually touched: the engine talks to the module through
   * `playback/audio-api.ts`'s structural types, so this exists to let the lazy
   * `import('react-native-audio-api')` typecheck, not to describe the library.
   */
  export class AudioContext {
    readonly currentTime: number;
    readonly destination: unknown;
    readonly sampleRate: number;
    createGain(): unknown;
    createBufferSource(): unknown;
    createOscillator(): unknown;
    resume(): Promise<void>;
    close(): Promise<void>;
  }
}
