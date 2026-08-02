declare module "circular-audio-wave/dist/circular-audio-wave.min.js" {
  type CircularAudioWaveConstructor = new (element: HTMLElement, options?: Record<string, unknown>) => unknown

  const CircularAudioWave: CircularAudioWaveConstructor
  export default CircularAudioWave
}
