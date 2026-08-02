export type VisualizerSource = MediaStream | HTMLAudioElement

export interface AudioVisualizer {
  connectSource: (source: VisualizerSource) => Promise<void>
  stop: () => void
}

const getAudioContext = () => {
  if (typeof window === "undefined") return null
  const AudioContextClass =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextClass) return null

  return new AudioContextClass()
}

export const createAudioVisualizer = async (container: HTMLElement): Promise<AudioVisualizer> => {
  const audioContext = getAudioContext()
  if (!audioContext) {
    throw new Error("AudioContext unavailable")
  }

  const canvas = document.createElement("canvas")
  canvas.style.position = "absolute"
  canvas.style.inset = "0"
  canvas.style.width = "100%"
  canvas.style.height = "100%"
  canvas.style.pointerEvents = "none"
  canvas.style.mixBlendMode = "screen"
  canvas.style.filter = "drop-shadow(0 0 12px rgba(52,211,153,0.25))"
  canvas.setAttribute("aria-hidden", "true")

  container.appendChild(canvas)

  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 256
  analyser.smoothingTimeConstant = 0.75
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)

  const context = canvas.getContext("2d")
  if (!context) {
    canvas.remove()
    analyser.disconnect()
    await audioContext.close()
    throw new Error("Canvas context unavailable")
  }

  let animationFrameId: number | null = null
  let sourceNode: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null
  let outputNode: GainNode | AudioDestinationNode | null = null
  let currentSource: VisualizerSource | null = null
  let mediaElementSource: MediaElementAudioSourceNode | null = null

  const render = () => {
    const { clientWidth, clientHeight } = container
    if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
      canvas.width = clientWidth
      canvas.height = clientHeight
    }

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 6

    context.clearRect(0, 0, canvas.width, canvas.height)
    analyser.getByteFrequencyData(dataArray)

    const bars = 48
    const step = Math.floor(bufferLength / bars)

    for (let index = 0; index < bars; index += 1) {
      const value = dataArray[index * step] / 255
      const barHeight = radius * 0.35 * value + 6
      const angle = (index / bars) * Math.PI * 2

      const startX = centerX + (radius - barHeight) * Math.cos(angle)
      const startY = centerY + (radius - barHeight) * Math.sin(angle)
      const endX = centerX + (radius + barHeight) * Math.cos(angle)
      const endY = centerY + (radius + barHeight) * Math.sin(angle)

      const gradient = context.createLinearGradient(startX, startY, endX, endY)
      gradient.addColorStop(0, "rgba(52,211,153,0.05)")
      gradient.addColorStop(1, "rgba(52,211,153,0.55)")

      context.strokeStyle = gradient
      context.lineWidth = 3
      context.lineCap = "round"
      context.beginPath()
      context.moveTo(startX, startY)
      context.lineTo(endX, endY)
      context.stroke()
    }

    animationFrameId = requestAnimationFrame(render)
  }

  const startRendering = () => {
    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(render)
    }
  }

  const stopRendering = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  const connectSource = async (source: VisualizerSource) => {
    stopRendering()

    if (audioContext.state === "closed") {
      throw new Error("AudioContext is closed. Visualization unavailable.")
    }

    if (audioContext.state === "suspended") {
      try {
        await audioContext.resume()
      } catch (error) {
        throw new Error(`Unable to resume audio context: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    analyser.disconnect()

    if (sourceNode) {
      sourceNode.disconnect()
    }

    if (outputNode && outputNode !== audioContext.destination) {
      outputNode.disconnect()
    }

    try {
      if (source instanceof MediaStream) {
        sourceNode = audioContext.createMediaStreamSource(source)
        const silentOutput = audioContext.createGain()
        silentOutput.gain.value = 0
        outputNode = silentOutput
        sourceNode.connect(analyser)
        analyser.connect(silentOutput)
        silentOutput.connect(audioContext.destination)
      } else {
        let elementSource: MediaElementAudioSourceNode
        if (mediaElementSource && currentSource === source) {
          elementSource = mediaElementSource
        } else {
          elementSource = audioContext.createMediaElementSource(source)
        }
        mediaElementSource = elementSource
        sourceNode = elementSource
        outputNode = audioContext.destination
        elementSource.connect(analyser)
        analyser.connect(audioContext.destination)
      }

      currentSource = source
    } catch (error) {
      sourceNode = null
      outputNode = null
      currentSource = null
      throw error instanceof Error ? error : new Error("Failed to connect audio source")
    }

    startRendering()
  }

  const stop = () => {
    stopRendering()
    analyser.disconnect()
    if (sourceNode) {
      sourceNode.disconnect()
      sourceNode = null
    }
    if (outputNode && outputNode !== audioContext.destination) {
      outputNode.disconnect()
    }
    canvas.remove()
    audioContext.close().catch(() => undefined)
  }

  return { connectSource, stop }
}
