export type CircularAudioWaveOptions = Record<string, unknown>;

type CircularAudioWaveConstructor = new (
    element: HTMLElement,
    options?: CircularAudioWaveOptions
) => unknown;

/**
 * Dynamically loads the circular-audio-wave library in the browser and binds it to the given element.
 *
 * The dist build is imported directly to avoid tree-shaking removing the asset.
 */
export async function createCircularAudioWave(
    element: HTMLElement,
    options: CircularAudioWaveOptions = {}
): Promise<unknown | null> {
    if (typeof window === 'undefined') {
        return null;
    }

    const waveModule = await import('circular-audio-wave/dist/circular-audio-wave.min.js');
    const CircularAudioWave = (waveModule as { default?: CircularAudioWaveConstructor }).default ?? waveModule;

    return new (CircularAudioWave as CircularAudioWaveConstructor)(element, options);
}
