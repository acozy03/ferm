"use client"

import { MicVAD, utils } from "@ricky0123/vad-web"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bot, Loader2, Mic, Send, Sparkles, Square, StopCircle, Volume2 } from "lucide-react"

import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { createAudioVisualizer, type AudioVisualizer } from "@/lib/audio-visualizer"
import { useJobApplications } from "@/lib/hooks/use-job-applications"
import { cn } from "@/lib/utils"

interface ChatMessage {
  role: "assistant" | "user"
  content: string
  tone?: "behavioral" | "technical" | "coach"
}

export default function PrepPage() {
  const { applications, isLoading } = useJobApplications({ limit: 50, include_interviews: true })
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isSessionEnded, setIsSessionEnded] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState("")
  const [voiceReplyUrl, setVoiceReplyUrl] = useState<string | null>(null)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [isVoiceReplyEnabled, setIsVoiceReplyEnabled] = useState(true)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [visualizerNotice, setVisualizerNotice] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const chatRef = useRef<HTMLDivElement | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recordingStartedAtRef = useRef<number | null>(null)
  const vadRef = useRef<MicVAD | null>(null)
  const streamingMessageIndexRef = useRef<number | null>(null)
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const voicePlaybackRef = useRef<HTMLAudioElement | null>(null)
  const isVoiceProcessingRef = useRef(false)
  const visualizerContainerRef = useRef<HTMLDivElement | null>(null)
  const visualizerInstanceRef = useRef<AudioVisualizer | null>(null)
  const micVisualizationStreamRef = useRef<MediaStream | null>(null)

  const jobOptions = useMemo(
    () =>
      applications.map((job) => ({
        id: job.id,
        label: `${job.position_title ?? "Untitled role"} @ ${job.company_name ?? "Company"}`,
      })),
    [applications],
  )

  useEffect(() => {
    if (!selectedApplicationId && applications.length > 0) {
      setSelectedApplicationId(applications[0].id)
    }
  }, [applications, selectedApplicationId])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (typeof document === "undefined") return

    const previousOverflow = document.body.style.overflow

    if (isFocusMode) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = previousOverflow
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isFocusMode])

  const teardownVisualizer = useCallback(() => {
    visualizerInstanceRef.current?.stop()
    visualizerInstanceRef.current = null
  }, [])

  const stopMicVisualizationStream = useCallback(() => {
    if (micVisualizationStreamRef.current) {
      micVisualizationStreamRef.current.getTracks().forEach((track) => track.stop())
      micVisualizationStreamRef.current = null
    }
  }, [])

  const handleVisualizerFailure = useCallback(
    (error: unknown) => {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Audio visualization is unavailable. Playing audio without visuals."

      setVisualizerNotice(message)

      if (isFocusMode) {
        // Focus mode regression check: surface a warning when we fall back to audio-only playback.
        console.warn(
          "[Prep focus mode] Visualizer setup failed; continuing with audio-only playback.",
          error,
        )
      }
    },
    [isFocusMode],
  )

  const initializeVisualizer = useCallback(
    async (source: MediaStream | HTMLAudioElement | null) => {
      if (!isFocusMode || !source || !visualizerContainerRef.current) return

      try {
        if (!visualizerInstanceRef.current) {
          visualizerInstanceRef.current = await createAudioVisualizer(visualizerContainerRef.current)
        }

        await visualizerInstanceRef.current.connectSource(source)
        setVisualizerNotice(null)
      } catch (error) {
        teardownVisualizer()
        throw error instanceof Error ? error : new Error("Unable to start visualizer")
      }
    },
    [isFocusMode, teardownVisualizer],
  )

  const startMicVisualization = useCallback(async () => {
    if (!isFocusMode) return null

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micVisualizationStreamRef.current = stream
      await initializeVisualizer(stream)
      return stream
    } catch (error) {
      stopMicVisualizationStream()
      teardownVisualizer()
      handleVisualizerFailure(error)
      return null
    }
  }, [handleVisualizerFailure, initializeVisualizer, isFocusMode, stopMicVisualizationStream, teardownVisualizer])

  useEffect(
    () => () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current)
      }
      if (vadRef.current) {
        vadRef.current.pause()
        vadRef.current = null
      }
      if (voiceReplyUrl) {
        URL.revokeObjectURL(voiceReplyUrl)
      }
      stopMicVisualizationStream()
      teardownVisualizer()
    },
    [stopMicVisualizationStream, teardownVisualizer, voiceReplyUrl],
  )

  useEffect(() => {
    if (!isFocusMode) {
      stopMicVisualizationStream()
      teardownVisualizer()
      setVisualizerNotice(null)
    }
  }, [isFocusMode, stopMicVisualizationStream, teardownVisualizer])

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedApplicationId),
    [applications, selectedApplicationId],
  )

  const interviewCount = selectedApplication?.interviews?.length ?? 0
  const firstInterview = selectedApplication?.interviews?.[0]

  const latestAssistantMessage = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "assistant") return messages[index]
    }
    return null
  }, [messages])

  const startTypewriterStream = useCallback(
    (targetIndex: number, fullText: string, tone: ChatMessage["tone"] = "technical") => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current)
      }

      const sanitized = fullText.trim()
      if (!sanitized) {
        streamingMessageIndexRef.current = null
        setMessages((previous) => {
          const next = [...previous]
          const target = next[targetIndex]
          if (target) {
            next[targetIndex] = { ...target, content: "", tone }
          }
          return next
        })
        return
      }

      let currentLength = 0
      const chunkSize = 6
      const tickInterval = 28

      typewriterIntervalRef.current = setInterval(() => {
        currentLength = Math.min(sanitized.length, currentLength + chunkSize)
        const nextSlice = sanitized.slice(0, currentLength)

        setMessages((previous) => {
          const next = [...previous]
          const target = next[targetIndex]
          if (target) {
            next[targetIndex] = { ...target, content: nextSlice, tone }
          }
          return next
        })

        if (currentLength >= sanitized.length) {
          if (typewriterIntervalRef.current) {
            clearInterval(typewriterIntervalRef.current)
            typewriterIntervalRef.current = null
          }
          streamingMessageIndexRef.current = null
        }
      }, tickInterval)
    },
    [],
  )

  const handleSend = async () => {
    if (!input.trim() || isGenerating || isSessionEnded) return
    const trimmed = input.trim()
    const userMessage: ChatMessage = { role: "user", content: trimmed }
    const history = [...messages, userMessage]

    setInput("")
    setIsSessionEnded(false)
    setIsGenerating(true)
    streamingMessageIndexRef.current = null

    setMessages((previous) => {
      const nextMessages = [...previous, userMessage, { role: "assistant", tone: "technical", content: "" }]
      streamingMessageIndexRef.current = nextMessages.length - 1
      return nextMessages
    })

    try {
      const response = await fetch("/api/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedApplication?.id ?? null,
          messages: history.map((message) => ({ role: message.role, content: message.content })),
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error("The assistant couldn't respond right now.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })

        if (streamingMessageIndexRef.current !== null) {
          setMessages((previous) => {
            const next = [...previous]
            const target = next[streamingMessageIndexRef.current!]
            if (target) {
              next[streamingMessageIndexRef.current!] = { ...target, content: accumulated }
            }
            return next
          })
        }
      }
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : "We hit a snag fetching a response. Please try again."
      if (streamingMessageIndexRef.current !== null) {
        setMessages((previous) => {
          const next = [...previous]
          const target = next[streamingMessageIndexRef.current!]
          if (target) {
            next[streamingMessageIndexRef.current!] = { ...target, content: fallbackMessage, tone: "coach" }
          }
          return next
        })
      }
    } finally {
      setIsGenerating(false)
      streamingMessageIndexRef.current = null
    }
  }

  const handleEndSession = () => {
    stopRecordingTimer()
    if (vadRef.current) {
      vadRef.current.pause()
      vadRef.current = null
    }
    if (voicePlaybackRef.current) {
      voicePlaybackRef.current.pause()
      voicePlaybackRef.current.currentTime = 0
      voicePlaybackRef.current = null
    }
    stopMicVisualizationStream()
    teardownVisualizer()
    setIsRecording(false)
    setIsProcessingVoice(false)
    setIsSessionEnded(true)
    setVisualizerNotice(null)
  }

  const handleRestart = () => {
    stopRecordingTimer()
    if (vadRef.current) {
      vadRef.current.pause()
      vadRef.current = null
    }
    if (voicePlaybackRef.current) {
      voicePlaybackRef.current.pause()
      voicePlaybackRef.current.currentTime = 0
      voicePlaybackRef.current = null
    }
    stopMicVisualizationStream()
    teardownVisualizer()
    setIsSessionEnded(false)
    setMessages([])
    setVoiceTranscript("")
    setVoiceError(null)
    setVoiceReplyUrl(null)
    setVisualizerNotice(null)
  }

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    recordingStartedAtRef.current = null
  }

  const playProcessingTone = () => {
    if (typeof window === "undefined") return

    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      const audioContext = new AudioContextClass()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.frequency.value = 660
      gainNode.gain.value = 0.05

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      const now = audioContext.currentTime
      oscillator.start(now)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.25)
      oscillator.stop(now + 0.25)
      oscillator.onended = () => {
        audioContext.close().catch(() => undefined)
      }
    } catch {
      // Best-effort UX enhancement; ignore audio errors
    }
  }

  const handleStartRecording = async () => {
    if (isProcessingVoice || isRecording || isSessionEnded || isGenerating) return
    setVoiceError(null)

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError("This browser doesn't support microphone recording.")
      return
    }

    try {
      void startMicVisualization()

      if (!vadRef.current) {
        vadRef.current = await MicVAD.new({
          baseAssetPath: "/vad-assets/",
          onnxWASMBasePath: "/vad-assets/",
          startOnLoad: false,
          onSpeechStart: () => {
            setIsRecording(true)
            setRecordingSeconds(0)
            recordingStartedAtRef.current = Date.now()
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current)
            }
            recordingTimerRef.current = setInterval(() => {
              const start = recordingStartedAtRef.current
              if (!start) return
              const elapsedSeconds = Math.floor((Date.now() - start) / 1000)
              setRecordingSeconds(elapsedSeconds)
            }, 1000)
          },
          onSpeechEnd: (audio) => {
            vadRef.current?.pause()
            stopRecordingTimer()
            setIsRecording(false)
            setIsProcessingVoice(true)
            setRecordingSeconds(0)
            stopMicVisualizationStream()
            teardownVisualizer()

            void (async () => {
              try {
                const wavBuffer = utils.encodeWAV(audio)
                const audioBlob = new Blob([wavBuffer], { type: "audio/wav" })
                await sendVoiceMessage(audioBlob)
              } catch (error) {
                setVoiceError(error instanceof Error ? error.message : "Voice processing failed.")
              } finally {
                setIsProcessingVoice(false)
              }
            })()
          },
        })
      }

      await vadRef.current.start()
      setIsRecording(true)
      setRecordingSeconds(0)
    } catch {
      stopMicVisualizationStream()
      teardownVisualizer()
      setVoiceError("Microphone access was blocked. Please enable permissions and try again.")
    }
  }

  const handleStopRecording = () => {
    if (vadRef.current) {
      vadRef.current.pause()
      vadRef.current = null
    }
    stopRecordingTimer()
    stopMicVisualizationStream()
    teardownVisualizer()
    setIsRecording(false)
  }

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (isSessionEnded) return
    if (isVoiceProcessingRef.current) return
    if (audioBlob.size === 0) {
      setVoiceError("We couldn't capture any audio. Try again.")
      setIsProcessingVoice(false)
      return
    }

    setVoiceError(null)
    setVoiceTranscript("")
    setIsProcessingVoice(true)
    isVoiceProcessingRef.current = true
    playProcessingTone()

    try {
      const recentMessages = messages.slice(-6)
      const formData = new FormData()
      formData.append("audio", audioBlob, "voice-input.wav")
      formData.append("messages", JSON.stringify(recentMessages))
      formData.append("voiceReplies", isVoiceReplyEnabled ? "true" : "false")

      if (selectedApplication?.id) {
        formData.append("applicationId", selectedApplication.id)
      }

      if (selectedApplication) {
        formData.append(
          "jobContext",
          JSON.stringify({
            role: selectedApplication.position_title ?? "the role",
            company: selectedApplication.company_name ?? "the company",
            latestNote: selectedApplication.notes ?? "",
          }),
        )
      }

      const response = await fetch("/api/prep/voice", { method: "POST", body: formData })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: "Unable to process voice input." }))
        throw new Error(errorPayload.error)
      }

      const data = (await response.json()) as { transcript?: string; reply?: string; audioBase64?: string }

      setMessages((previous) => {
        const nextMessages = [...previous]

        if (data.transcript) {
          nextMessages.push({ role: "user", content: data.transcript })
          setVoiceTranscript(data.transcript)
        }

        if (data.reply) {
          nextMessages.push({ role: "assistant", tone: "technical", content: "" })
          streamingMessageIndexRef.current = nextMessages.length - 1
          const messageIndex = streamingMessageIndexRef.current
          if (messageIndex !== null) {
            setTimeout(() => startTypewriterStream(messageIndex, data.reply ?? "", "technical"), 0)
          }
        }

        return nextMessages
      })

      if (voiceReplyUrl) {
        URL.revokeObjectURL(voiceReplyUrl)
      }

      if (data.audioBase64) {
        const byteCharacters = atob(data.audioBase64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let index = 0; index < byteCharacters.length; index += 1) {
          byteNumbers[index] = byteCharacters.charCodeAt(index)
        }
        const audioResponse = new Blob([new Uint8Array(byteNumbers)], { type: "audio/wav" })
        const objectUrl = URL.createObjectURL(audioResponse)
        setVoiceReplyUrl(objectUrl)

        if (isVoiceReplyEnabled) {
          const audioElement = new Audio(objectUrl)
          voicePlaybackRef.current = audioElement
          audioElement.addEventListener("ended", () => {
            voicePlaybackRef.current = null
            if (!isSessionEnded) {
              void handleStartRecording()
            }
          })
          audioElement.addEventListener("pause", () => {
            if (voicePlaybackRef.current === audioElement) {
              voicePlaybackRef.current = null
            }
          })

          try {
            await audioElement.play()
          } catch (playbackError) {
            setVoiceError(
              playbackError instanceof Error ? playbackError.message : "Unable to play the audio reply.",
            )
            return
          }

          try {
            await initializeVisualizer(audioElement)
          } catch (error) {
            handleVisualizerFailure(error)
          }
        }
      } else {
        setVoiceReplyUrl(null)
      }
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : "Voice mode is unavailable right now.")
    } finally {
      setIsProcessingVoice(false)
      isVoiceProcessingRef.current = false
      setRecordingSeconds(0)
    }
  }


  const voiceStatus = (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative h-20 w-20 sm:h-24 sm:w-24">
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-primary/15 transition-all duration-500",
            isRecording ? "animate-ping" : "opacity-50",
          )}
        />
        <div
          className={cn(
            "absolute inset-2 rounded-full border transition-all duration-500",
            isRecording ? "border-primary shadow-[0_0_0_8px_rgba(99,102,241,0.15)]" : "border-border",
          )}
        />
        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-background shadow-inner">
          {isProcessingVoice ? (
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          ) : isRecording ? (
            <Mic className="h-6 w-6 text-primary" />
          ) : (
            <Volume2 className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-[200px] space-y-1">
        <p className="text-sm font-semibold text-foreground">Your mic</p>
        <p className="text-xs text-muted-foreground">
          {isRecording
            ? `Listening • ${recordingSeconds}s`
            : isProcessingVoice
              ? "Processing your reply"
              : "Tap start or wait for Prep to finish to respond automatically."}
        </p>
        {voiceTranscript && !isRecording && (
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Transcript:</span> {voiceTranscript}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_35%),_radial-gradient(circle_at_20%_20%,_rgba(34,197,94,0.05),_transparent_25%)]">
      <Header />
      <main className="max-w-[83rem] mx-auto px-3 sm:px-6 pt-24 pb-10 flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm">
              <Switch checked={isFocusMode} onCheckedChange={setIsFocusMode} id="focus-toggle" />
              <Label htmlFor="focus-toggle" className="text-muted-foreground cursor-pointer">
                Focus mode
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={handleRestart} disabled={messages.length === 0}>
              Restart
            </Button>
            <Button variant="destructive" size="sm" onClick={handleEndSession} disabled={isSessionEnded}>
              <StopCircle className="h-4 w-4 mr-1" />
              End
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "grid flex-1 gap-4 overflow-hidden",
            isFocusMode ? "grid-cols-1 min-h-[70vh]" : "lg:grid-cols-[360px_1fr]",
          )}
        >
          {!isFocusMode && (
            <Card className="shadow-sm border-border/60 flex flex-col overflow-hidden">
              <CardContent className="flex flex-col gap-4 p-4">
                <div className="space-y-2">
                  <Label htmlFor="role-select">Job application</Label>
                  <Select
                    value={selectedApplicationId}
                    onValueChange={(value) => setSelectedApplicationId(value)}
                    disabled={isLoading || jobOptions.length === 0}
                  >
                    <SelectTrigger id="role-select" className="bg-background/70">
                      <SelectValue placeholder={isLoading ? "Loading roles..." : "Pick a role"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {jobOptions.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Fetching applications...
                    </div>
                  )}
                  {!isLoading && jobOptions.length === 0 && (
                    <p className="text-sm text-muted-foreground">No roles found yet. Add one from the dashboard to get started.</p>
                  )}
                </div>

                {selectedApplication && (
                  <div className="rounded-lg border border-border/60 bg-background p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">{selectedApplication.position_title ?? "Role"}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedApplication.company_name ?? "Company"}
                      {firstInterview?.scheduled_date && (
                        <span className="ml-1">• Next: {new Date(firstInterview.scheduled_date).toLocaleDateString()}</span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="border-border/60">
                        {selectedApplication.status ?? "Draft"}
                      </Badge>
                      {selectedApplication.priority && (
                        <Badge variant="secondary" className="gap-1">
                          Priority
                          <span className="font-semibold">{selectedApplication.priority}</span>
                        </Badge>
                      )}
                      <span>Interviews: {interviewCount}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Volume2 className="h-4 w-4" />
                    Voice replies
                  </div>
                  <Switch
                    checked={isVoiceReplyEnabled}
                    onCheckedChange={setIsVoiceReplyEnabled}
                    aria-label="Toggle voice replies"
                  />
                </div>

                {voiceStatus}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "default"}
                    size="sm"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    disabled={isProcessingVoice}
                  >
                    {isRecording ? <Square className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                    {isRecording ? "Stop recording" : "Start speaking"}
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isRecording && <span className="text-destructive font-semibold">Recording</span>}
                    {isRecording && <span>• {recordingSeconds}s</span>}
                    {isProcessingVoice && (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Processing...
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!voiceReplyUrl) return

                      const audioElement = new Audio(voiceReplyUrl)
                      voicePlaybackRef.current = audioElement

                      audioElement.addEventListener("ended", () => {
                        if (voicePlaybackRef.current === audioElement) {
                          voicePlaybackRef.current = null
                        }
                      })

                      audioElement.addEventListener("pause", () => {
                        if (voicePlaybackRef.current === audioElement) {
                          voicePlaybackRef.current = null
                        }
                      })

                      try {
                        await audioElement.play()
                      } catch (playbackError) {
                        setVoiceError(
                          playbackError instanceof Error
                            ? playbackError.message
                            : "Unable to replay the audio reply.",
                        )
                        return
                      }

                      try {
                        await initializeVisualizer(audioElement)
                      } catch (error) {
                        handleVisualizerFailure(error)
                      }
                    }}
                    disabled={!voiceReplyUrl}
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    Replay
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Recording will end automatically after a moment of silence.
                </p>

                {voiceError && <p className="text-xs text-destructive">{voiceError}</p>}

                {visualizerNotice && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {visualizerNotice}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card
            className={cn(
              "shadow-sm border-border/60 flex flex-col overflow-hidden",
              isFocusMode && "bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70",
            )}
          >
            <CardContent className="flex-1 flex flex-col gap-4 p-4 lg:p-6 overflow-hidden">
              {isFocusMode && (
                <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Focus mode</p>
                      <p className="text-sm text-muted-foreground">Immersive view with Prep narrating and listening back.</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {isVoiceReplyEnabled ? "Voice replies on" : "Voice replies muted"}
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_6px_rgba(99,102,241,0.25)]" />
                    </div>
                  </div>
                  {voiceStatus}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={isRecording ? "destructive" : "default"}
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      disabled={isProcessingVoice}
                    >
                      {isRecording ? <Square className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                      {isRecording ? "Stop recording" : "Start speaking"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (voiceReplyUrl) {
                          const audioElement = new Audio(voiceReplyUrl)
                          voicePlaybackRef.current = audioElement
                          void initializeVisualizer(audioElement)
                          void audioElement.play().catch(() => undefined)
                        }
                      }}
                      disabled={!voiceReplyUrl}
                    >
                      <Volume2 className="mr-2 h-4 w-4" />
                      Replay last reply
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      {isSessionEnded ? "Session ended" : "Prep will auto-listen after it speaks"}
                    </div>
                  </div>
                </div>
              )}

              <ScrollArea className="flex-1 overflow-y-auto" ref={chatRef}>
                <div className="space-y-4 pr-2 pb-4">
                  {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className="flex gap-3">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center border",
                          message.role === "assistant" ? "bg-primary/10 border-primary/30" : "bg-muted",
                        )}
                      >
                        {message.role === "assistant" ? <Bot className="h-5 w-5 text-primary" /> : <Sparkles className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{message.role === "assistant" ? "Prep" : "You"}</span>
                          {message.tone && <Badge variant="outline" className="text-[10px] h-5">{message.tone}</Badge>}
                        </div>
                        <p className="leading-relaxed break-words text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm">Start chatting to see your transcript.</div>
                  )}
                </div>
              </ScrollArea>
              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  handleSend()
                }}
              >
                <Label htmlFor="prep-input" className="text-xs text-muted-foreground">
                  Answer a prompt or ask for feedback
                </Label>
                <div className="flex gap-2 items-start">
                  <Textarea
                    id="prep-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={isSessionEnded ? "Session ended. Restart to continue." : "Share your answer..."}
                    className="min-h-[80px] resize-none"
                    disabled={isGenerating || isSessionEnded}
                  />
                  <Button type="submit" className="self-start" disabled={!input.trim() || isGenerating || isSessionEnded}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      {isFocusMode && (
        <div className="fixed inset-0 z-50 isolate bg-gradient-to-b from-black via-zinc-950 to-black text-white transition-opacity duration-500">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_35%),radial-gradient(circle_at_80%_40%,rgba(16,185,129,0.12),transparent_30%)] blur-3xl" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between px-6 py-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400/80">
              <span className="text-primary/70">Focus mode</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsFocusMode(false)}
                className="border border-white/10 bg-white/10 text-white shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur hover:bg-white/20"
              >
                Exit focus
              </Button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-12 text-center">
              <div
                role="button"
                tabIndex={0}
                aria-label={isRecording ? "Stop recording" : "Start speaking"}
                onClick={() => {
                  if (isProcessingVoice) return
                  if (isRecording) {
                    handleStopRecording()
                  } else {
                    void handleStartRecording()
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    if (isProcessingVoice) return
                    if (isRecording) {
                      handleStopRecording()
                    } else {
                      void handleStartRecording()
                    }
                  }
                }}
                className="relative flex h-52 w-52 cursor-pointer items-center justify-center rounded-full sm:h-60 sm:w-60"
              >
                <div
                  ref={visualizerContainerRef}
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
                  aria-hidden
                />
                <div
                  className={cn(
                    "absolute inset-0 rounded-full bg-emerald-400/10 transition-all duration-700",
                    isRecording ? "animate-[pulse_2s_ease-in-out_infinite]" : "opacity-50",
                  )}
                />
                <div
                  className={cn(
                    "absolute inset-3 rounded-full border border-white/10 transition-all duration-700",
                    isRecording
                      ? "shadow-[0_0_0_18px_rgba(52,211,153,0.15)]"
                      : isProcessingVoice
                        ? "shadow-[0_0_0_12px_rgba(99,102,241,0.12)]"
                        : "shadow-[0_0_0_8px_rgba(255,255,255,0.04)]",
                  )}
                />
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-white/5 shadow-[0_20px_120px_rgba(0,0,0,0.65)] backdrop-blur">
                  {isProcessingVoice ? (
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  ) : isRecording ? (
                    <Mic className="h-10 w-10 text-emerald-400" />
                  ) : (
                    <Volume2 className="h-10 w-10 text-zinc-300" />
                  )}
                </div>
              </div>

              <div className="max-w-3xl space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">Prep is speaking</p>
                <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-left shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
                  <p className="text-lg leading-relaxed text-white/90 whitespace-pre-wrap" aria-live="polite">
                    {latestAssistantMessage?.content?.trim()
                      ? latestAssistantMessage.content
                      : "Waiting for Prep to start speaking..."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-400">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isRecording
                        ? "bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.25)]"
                        : isProcessingVoice
                          ? "bg-primary shadow-[0_0_0_6px_rgba(99,102,241,0.25)]"
                          : "bg-zinc-600",
                    )}
                  />
                  <span>
                    {isProcessingVoice
                      ? "Processing your reply"
                      : isRecording
                        ? "Listening... tap to end"
                        : "Tap the circle to start speaking"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <span>{isVoiceReplyEnabled ? "Voice replies on" : "Voice replies muted"}</span>
                </div>
              </div>

              {visualizerNotice && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                  {visualizerNotice}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
