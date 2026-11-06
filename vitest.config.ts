import { defineConfig } from 'vitest/config';

/**
 * Node, not a React Native preset. The only thing tested here is
 * `NativeSynthBackend`, which is driven through an injected `NativeSynthApi` —
 * a plain object — so it needs no native module and no RN runtime. The native
 * synth itself (Obj-C++/JNI/WinRT) is not unit-tested from JavaScript.
 */
export default defineConfig({
  test: { environment: 'node', globals: false },
});
