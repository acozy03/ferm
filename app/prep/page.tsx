"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
  const [isGenerating, setIsGenerating] = useState(false)
  const chatRef = useRef<HTMLDivElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const volumeCheckFrameRef = useRef<number | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const streamingMessageIndexRef = useRef<number | null>(null)

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

  useEffect(
    () => () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      stopVolumeMonitoring()
      analyserRef.current = null
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => undefined)
      }
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop())
      if (voiceReplyUrl) {
        URL.revokeObjectURL(voiceReplyUrl)
      }
    },
    [voiceReplyUrl],
  )

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedApplicationId),
    [applications, selectedApplicationId],
  )

  const interviewCount = selectedApplication?.interviews?.length ?? 0
  const firstInterview = selectedApplication?.interviews?.[0]

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return
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
    setIsSessionEnded(true)
  }

  const handleRestart = () => {
    setIsSessionEnded(false)
    setMessages([])
  }

  const stopVolumeMonitoring = () => {
    if (volumeCheckFrameRef.current !== null) {
      cancelAnimationFrame(volumeCheckFrameRef.current)
      volumeCheckFrameRef.current = null
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }

  const stopRecordingAndProcess = () => {
    if (!isRecording) return

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    stopVolumeMonitoring()
    setIsRecording(false)
    setIsProcessingVoice(true)
    mediaRecorderRef.current?.stop()
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
    if (isRecording || isProcessingVoice) return
    setVoiceError(null)

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError("This browser doesn't support microphone recording.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      const audioContext = new AudioContextClass()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      const mediaRecorder = new MediaRecorder(stream)

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        stopVolumeMonitoring()
        analyserRef.current = null
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => undefined)
          audioContextRef.current = null
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        stream.getTracks().forEach((track) => track.stop())
        void sendVoiceMessage(audioBlob)
      }

      const volumeData = new Uint8Array(analyser.frequencyBinCount)
      const silenceThreshold = 4
      const silenceDurationMs = 1000

      const monitorVolume = () => {
        analyser.getByteTimeDomainData(volumeData)
        let sumDeviation = 0
        for (const value of volumeData) {
          sumDeviation += Math.abs(value - 128)
        }
        const averageAmplitude = sumDeviation / volumeData.length

        if (averageAmplitude < silenceThreshold) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null
              if (mediaRecorder.state === "recording") {
                handleStopRecording()
              }
            }, silenceDurationMs)
          }
        } else if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }

        volumeCheckFrameRef.current = requestAnimationFrame(monitorVolume)
      }

      monitorVolume()

      mediaRecorder.start(250)
      setIsRecording(true)
      setRecordingSeconds(0)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((previous) => previous + 1)
      }, 1000)
      mediaRecorderRef.current = mediaRecorder
    } catch {
      setVoiceError("Microphone access was blocked. Please enable permissions and try again.")
    }
  }

  const handleStopRecording = () => {
    stopVolumeMonitoring()
    analyserRef.current = null
    stopRecordingAndProcess()
  }

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (audioBlob.size === 0) {
      setVoiceError("We couldn't capture any audio. Try again.")
      setIsProcessingVoice(false)
      return
    }

    setVoiceError(null)
    setVoiceTranscript("")
    playProcessingTone()

    try {
      const recentMessages = messages.slice(-6)
      const formData = new FormData()
      formData.append("audio", audioBlob, "voice-input.webm")
      formData.append("messages", JSON.stringify(recentMessages))
      formData.append("voiceReplies", isVoiceReplyEnabled ? "true" : "false")

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
          nextMessages.push({ role: "assistant", tone: "technical", content: data.reply })
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
        const audioResponse = new Blob([new Uint8Array(byteNumbers)], { type: "audio/mpeg" })
        const objectUrl = URL.createObjectURL(audioResponse)
        setVoiceReplyUrl(objectUrl)

        if (isVoiceReplyEnabled) {
          const audioElement = new Audio(objectUrl)
          void audioElement.play().catch(() => undefined)
        }
      } else {
        setVoiceReplyUrl(null)
      }
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : "Voice mode is unavailable right now.")
    } finally {
      setIsProcessingVoice(false)
      setRecordingSeconds(0)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_35%),_radial-gradient(circle_at_20%_20%,_rgba(34,197,94,0.05),_transparent_25%)]">
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 pt-24 pb-8 h-[calc(100vh-88px)] flex flex-col gap-4">
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[360px_1fr]">
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
                <Switch checked={isVoiceReplyEnabled} onCheckedChange={setIsVoiceReplyEnabled} aria-label="Toggle voice replies" />
              </div>

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
                  onClick={() => {
                    if (voiceReplyUrl) {
                      const audioElement = new Audio(voiceReplyUrl)
                      void audioElement.play().catch(() => undefined)
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

              {voiceTranscript && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Transcript:</span> {voiceTranscript}
                </p>
              )}

              {voiceError && <p className="text-xs text-destructive">{voiceError}</p>}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60 flex flex-col overflow-hidden">
            <div className="flex items-center justify-end gap-2 px-4 pt-4">
              <Button variant="outline" size="sm" onClick={handleRestart} disabled={messages.length === 0}>
                Restart
              </Button>
              <Button variant="destructive" size="sm" onClick={handleEndSession} disabled={isSessionEnded}>
                <StopCircle className="h-4 w-4 mr-1" />
                End
              </Button>
            </div>
            <CardContent className="flex-1 flex flex-col gap-3 p-4 pt-2 overflow-hidden">
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
                    placeholder="Share your answer..."
                    className="min-h-[80px] resize-none"
                    disabled={isGenerating}
                  />
                  <Button type="submit" className="self-start" disabled={!input.trim() || isGenerating}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
