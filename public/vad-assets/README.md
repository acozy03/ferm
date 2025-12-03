This directory hosts the static assets required by @ricky0123/vad-web for voice activity detection. Files are copied from the installed packages so Next.js can serve them at predictable URLs:

- `silero_vad_legacy.onnx` and `silero_vad_v5.onnx`: model files bundled with `@ricky0123/vad-web`.
- `vad.worklet.bundle.min.js`: audio worklet used by the VAD runtime.
- `ort-wasm-simd-threaded.*`: ONNX Runtime Web WASM and loader modules used by the VAD library.
