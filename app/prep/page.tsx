"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Flame,
  GraduationCap,
  Mic,
  Lightbulb,
  Loader2,
  MessageCircleMore,
  Send,
  Sparkles,
  Square,
  StopCircle,
  Volume2,
} from "lucide-react"

import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
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
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "assistant",
      tone: "coach",
      content:
        "Welcome to Prep! Tell me which role you want to practice for and I'll mix behavioral and role-specific questions.",
    },
    {
      role: "assistant",
      tone: "technical",
      content:
        "I'll reference the job description plus any interviews logged for that role to keep things realistic.",
    },
  ])
  const [input, setInput] = useState("")
  const [isSessionEnded, setIsSessionEnded] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState("")
  const [voiceReplyUrl, setVoiceReplyUrl] = useState<string | null>(null)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const chatRef = useRef<HTMLDivElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

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

  const handleSend = () => {
    if (!input.trim()) return
    const trimmed = input.trim()
    setMessages((prev) => [...prev, { role: "user", content: trimmed }])
    setInput("")

    const nextCoachMessage: ChatMessage = {
      role: "assistant",
      tone: "behavioral",
      content:
        "Thanks! Tell me about a time you navigated ambiguity on a project. Keep your STAR structure tight and concise.",
    }
    const contextMessage: ChatMessage = {
      role: "assistant",
      tone: "technical",
      content:
        selectedApplication
          ? `Based on ${selectedApplication.position_title ?? "this role"} at ${
              selectedApplication.company_name ?? "the company"
            }, I want to understand how you prioritize roadmap trade-offs. Ready for a scenario?`
          : "I'll also weave in questions tied to the job description once you pick a role.",
    }

    setMessages((prev) => [...prev, nextCoachMessage, contextMessage])
  }

  const handleEndSession = () => {
    setIsSessionEnded(true)
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        tone: "coach",
        content:
          "Session paused. Below is quick feedback based on your answers so far. You can restart anytime to keep practicing.",
      },
    ])
  }

  const handleRestart = () => {
    setIsSessionEnded(false)
    setMessages((prev) => prev.slice(0, 2))
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
      const mediaRecorder = new MediaRecorder(stream)

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        stream.getTracks().forEach((track) => track.stop())
        void sendVoiceMessage(audioBlob)
      }

      mediaRecorder.start()
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
    if (!isRecording) return

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setIsRecording(false)
    setIsProcessingVoice(true)
    mediaRecorderRef.current?.stop()
  }

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (audioBlob.size === 0) {
      setVoiceError("We couldn't capture any audio. Try again.")
      setIsProcessingVoice(false)
      return
    }

    setVoiceError(null)
    setVoiceTranscript("")

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "voice-input.webm")
      formData.append("messages", JSON.stringify(messages))

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

        const audioElement = new Audio(objectUrl)
        void audioElement.play().catch(() => undefined)
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_35%),_radial-gradient(circle_at_20%_20%,_rgba(34,197,94,0.05),_transparent_25%)]">
      <Header />
      <main className="max-w-[1100px] mx-auto px-4 pb-16 pt-28 space-y-6">
        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="w-fit gap-2 border-primary/40 text-primary">
            <Sparkles className="h-4 w-4" />
            Prep beta
          </Badge>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircleMore className="h-4 w-4" />
              <span>Mock interview companion</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">Prep for your next interview</h1>
            <p className="text-muted-foreground max-w-3xl">
              Choose a role, practice with a coach-like bot, and get feedback grounded in your job data and interview history.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <div className="space-y-4">
            <Card className="shadow-sm border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Select a role
                </CardTitle>
                <CardDescription>
                  The assistant will weave in company context, description, and interview notes for the role you pick.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Session focus</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Badge variant="secondary" className="justify-start gap-2">
                      <Flame className="h-3.5 w-3.5 text-primary" />
                      Behavioral depth
                    </Badge>
                    <Badge variant="secondary" className="justify-start gap-2">
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                      Role scenarios
                    </Badge>
                    <Badge variant="secondary" className="justify-start gap-2">
                      <GraduationCap className="h-3.5 w-3.5 text-primary" />
                      Coaching cues
                    </Badge>
                    <Badge variant="secondary" className="justify-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      Honest scoring
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/60">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  How Prep uses your data
                </CardTitle>
                <CardDescription>
                  Context is kept in-session: job description, recruiter notes, and any interviews you logged for this role.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
                  <div>
                    <p className="text-foreground font-medium">Job description</p>
                    <p>The bot will pull duties, required skills, and expectations from the selected application.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
                  <div>
                    <p className="text-foreground font-medium">Interview history</p>
                    <p>Any interviews you record are used to tailor follow-ups and assess progress.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden />
                  <div>
                    <p className="text-foreground font-medium">Session transcript</p>
                    <p>Your chat history stays visible so you can practice like you would in ChatGPT.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedApplication && (
              <Card className="shadow-sm border-primary/30 bg-primary/5">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg">{selectedApplication.position_title ?? "Role"}</CardTitle>
                  <CardDescription>
                    {selectedApplication.company_name ?? "Company"} • {selectedApplication.location ?? "Location TBD"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      {selectedApplication.status ?? "Draft"}
                    </Badge>
                    {selectedApplication.priority && (
                      <Badge variant="secondary" className="gap-1">
                        Priority
                        <span className="font-semibold">{selectedApplication.priority}</span>
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>Latest note: {selectedApplication.notes ?? "No notes yet. Add some context to guide the bot."}</p>
                    <p>
                      Interviews logged: {interviewCount}{" "}
                      {firstInterview?.scheduled_date && (
                        <span className="text-xs">• Next: {new Date(firstInterview.scheduled_date).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="shadow-sm border-border/60 flex flex-col min-h-[620px]">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircleMore className="h-5 w-5 text-primary" />
                  Practice chat
                </CardTitle>
                <CardDescription>
                  Looks and feels like ChatGPT. Send answers, ask for hints, and finish with a scorecard.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRestart} disabled={messages.length <= 2}>
                  Restart
                </Button>
                <Button variant="destructive" size="sm" onClick={handleEndSession} disabled={isSessionEnded}>
                  <StopCircle className="h-4 w-4 mr-1" />
                  End session
                </Button>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 flex flex-col gap-4 p-0">
              <ScrollArea className="flex-1" ref={chatRef}>
                <div className="space-y-4 p-4 pb-6">
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
                        <p className="leading-relaxed text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm">Start chatting to see your transcript.</div>
                  )}
                </div>
              </ScrollArea>
              <Separator />
              <div className="p-4 pt-0 space-y-4">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Mic className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Voice interview mode</p>
                        <p className="text-xs text-muted-foreground">
                          Speak your answers, we&apos;ll transcribe with Whisper and reply using TTS.
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-6">
                      Voice beta
                    </Badge>
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
                      {!isRecording && !isProcessingVoice && <span>Click to record your answer.</span>}
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
                      Replay answer
                    </Button>
                  </div>

                  {voiceTranscript && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Transcript:</span> {voiceTranscript}
                    </p>
                  )}

                  {voiceError && <p className="text-xs text-destructive">{voiceError}</p>}
                </div>
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
                  <div className="flex gap-2 items-center">
                    <Textarea
                      id="prep-input"
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Tell me about a time you led a challenging launch..."
                      className="min-h-[80px] resize-none"
                    />
                    <Button type="submit" className="self-start" disabled={!input.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {isSessionEnded && (
          <Card className="shadow-sm border-primary/40 bg-primary/5">
            <CardHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <CardTitle>Honest feedback</CardTitle>
              </div>
              <CardDescription>Auto-generated based on your last few answers.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-primary/30 bg-background">
                <p className="text-sm font-semibold text-foreground">Score</p>
                <p className="text-4xl font-bold text-primary">82</p>
                <p className="text-xs text-muted-foreground mt-1">Balanced behavioral + role alignment.</p>
              </div>
              <div className="p-4 rounded-lg border border-border/60 bg-background space-y-2">
                <p className="text-sm font-semibold text-foreground">Strengths</p>
                <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                  <li>Clear outcomes and metrics in your STAR stories.</li>
                  <li>Strong customer-first framing for {selectedApplication?.company_name ?? "the company"}.</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg border border-border/60 bg-background space-y-2">
                <p className="text-sm font-semibold text-foreground">Next reps</p>
                <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                  <li>Shorten answers to under 90 seconds.</li>
                  <li>Drill on role-specific scenarios with product strategy trade-offs.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
