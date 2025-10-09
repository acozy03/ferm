import type { JobApplicationStatus, JobApplicationStatusHistory } from "@/lib/types/database"

export const DEFAULT_MAX_INTERVIEW_ROUNDS = 5

export type PipelineStage =
  | "applied"
  | "interview"
  | "ghosted"
  | "offer"
  | "rejected"
  | "accepted"
  | "withdrawn"
  | "unknown"

const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  applied: "Applied",
  interview: "Interviewing",
  ghosted: "Ghosted",
  offer: "Offer",
  rejected: "Rejected",
  accepted: "Accepted",
  withdrawn: "Withdrawn",
  unknown: "Unknown",
}

export const STATUS_STAGE_FILTER_OPTIONS: Array<{ value: PipelineStage; label: string }> = [
  { value: "applied", label: PIPELINE_STAGE_LABELS.applied },
  { value: "interview", label: PIPELINE_STAGE_LABELS.interview },
  { value: "ghosted", label: PIPELINE_STAGE_LABELS.ghosted },
  { value: "offer", label: PIPELINE_STAGE_LABELS.offer },
  { value: "rejected", label: PIPELINE_STAGE_LABELS.rejected },
  { value: "accepted", label: PIPELINE_STAGE_LABELS.accepted },
  { value: "withdrawn", label: PIPELINE_STAGE_LABELS.withdrawn },
]

export const STATUS_FILTER_MAX_ROUND = 25

export function isPipelineStage(value: string | null | undefined): value is PipelineStage {
  if (!value) {
    return false
  }

  return ["applied", "interview", "ghosted", "offer", "rejected", "accepted", "withdrawn", "unknown"].includes(
    value as PipelineStage,
  )
}

export function formatPipelineStageLabel(stage: PipelineStage) {
  return PIPELINE_STAGE_LABELS[stage] ?? stage
}

interface StageVisuals {
  badge: string
  chart: string
}

const STAGE_VISUALS: Record<PipelineStage | "unknown", StageVisuals> = {
  applied: {
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    chart: "#6366F1",
  },
  interview: {
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    chart: "#FB923C",
  },
  ghosted: {
    badge: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    chart: "#F472B6",
  },
  offer: {
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    chart: "#22C55E",
  },
  rejected: {
    badge: "bg-red-500/10 text-red-500 border-red-500/20",
    chart: "#EF4444",
  },
  accepted: {
    badge: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    chart: "#16A34A",
  },
  withdrawn: {
    badge: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    chart: "#94A3B8",
  },
  unknown: {
    badge: "bg-muted text-foreground border-transparent",
    chart: "#A855F7",
  },
}

const INTERVIEW_REGEX = /^Interview(?: Round)? (\d+)$/i
const OUTCOME_REGEX = /^(Ghosted|Offer|Rejected)(?: After Round (\d+))?$/i
const LEGACY_STATUS_NORMALIZERS: Record<string, JobApplicationStatus> = {
  interview: "Interview Round 1",
  offer: "Offer After Round 0",
  rejected: "Rejected After Round 0",
  ghosted: "Ghosted After Round 0",
}

const OUTCOME_LABELS = {
  Ghosted: {
    zero: "Ghosted (no interview)",
    round: (round: number) => `Ghosted after round ${round}`,
  },
  Offer: {
    zero: "Offer (pre-interview)",
    round: (round: number) => `Offer after round ${round}`,
  },
  Rejected: {
    zero: "Rejected (no interview)",
    round: (round: number) => `Rejected after round ${round}`,
  },
} as const

export interface StatusMetadata {
  value: JobApplicationStatus
  raw: string
  label: string
  stage: PipelineStage
  order: number
  round: number | null
  badgeClass: string
  chartColor: string
}

function toStageVisuals(stage: PipelineStage | "unknown") {
  return STAGE_VISUALS[stage] ?? STAGE_VISUALS.unknown
}

function normalizeOutcomeRound(rawRound: string | undefined | null, fallback = 0) {
  const parsed = Number.parseInt(rawRound ?? "", 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function formatOutcomeLabel(outcome: "Ghosted" | "Offer" | "Rejected", round: number) {
  if (round <= 0) {
    return OUTCOME_LABELS[outcome].zero
  }

  return OUTCOME_LABELS[outcome].round(round)
}

function baseMetadata(
  value: JobApplicationStatus,
  raw: string,
  stage: PipelineStage,
  order: number,
  round: number | null,
  labelOverride?: string,
): StatusMetadata {
  const visuals = toStageVisuals(stage)
  return {
    value,
    raw,
    label: labelOverride ?? value,
    stage,
    order,
    round,
    badgeClass: visuals.badge,
    chartColor: visuals.chart,
  }
}

export function parseStatus(status: string | null | undefined): StatusMetadata {
  const raw = typeof status === "string" ? status.trim() : ""
  if (raw.length === 0) {
    return parseStatus("Applied")
  }

  if (/^Applied$/i.test(raw)) {
    return baseMetadata("Applied", raw, "applied", 0, 0, "Applied")
  }

  if (/^Accepted$/i.test(raw)) {
    return baseMetadata("Accepted", raw, "accepted", 12_000, null, "Offer accepted")
  }

  if (/^Withdrawn$/i.test(raw)) {
    return baseMetadata("Withdrawn", raw, "withdrawn", 11_000, null, "Application withdrawn")
  }

  const interviewMatch = raw.match(INTERVIEW_REGEX)
  if (interviewMatch) {
    const round = Math.max(1, Number.parseInt(interviewMatch[1] ?? "1", 10) || 1)
    const value = `Interview Round ${round}` as JobApplicationStatus
    return baseMetadata(value, raw, "interview", round * 10, round, `Interview — Round ${round}`)
  }

  const outcomeMatch = raw.match(OUTCOME_REGEX)
  if (outcomeMatch) {
    const outcome = (outcomeMatch[1] ?? "Rejected").replace(/^[a-z]/, (letter) => letter.toUpperCase()) as
      | "Ghosted"
      | "Offer"
      | "Rejected"
    const round = normalizeOutcomeRound(outcomeMatch[2], 0)
    const value = `${outcome} After Round ${round}` as JobApplicationStatus
    const stage: PipelineStage = outcome === "Ghosted" ? "ghosted" : outcome === "Offer" ? "offer" : "rejected"
    const order = round * 10 + 5
    return baseMetadata(value, raw, stage, order, round, formatOutcomeLabel(outcome, round))
  }

  const legacy = LEGACY_STATUS_NORMALIZERS[raw.toLowerCase()]
  if (legacy) {
    return parseStatus(legacy)
  }

  return baseMetadata(raw as JobApplicationStatus, raw, "unknown", 0, null, raw)
}

export function formatStatusLabel(status: string | null | undefined) {
  return parseStatus(status).label
}

export function getStatusBadgeClass(status: string | null | undefined) {
  return parseStatus(status).badgeClass
}

export function getStatusChartColor(status: string | null | undefined) {
  return parseStatus(status).chartColor
}

export function getStatusOrder(status: string | null | undefined) {
  return parseStatus(status).order
}

export function getStatusStage(status: string | null | undefined): PipelineStage {
  return parseStatus(status).stage
}

export function getStatusRound(status: string | null | undefined) {
  return parseStatus(status).round
}

export function normalizeStatusValue(status: string | null | undefined): JobApplicationStatus {
  return parseStatus(status).value
}

export function isStatusProgressionAllowed(previous: string | null | undefined, next: string | null | undefined) {
  if (!next) {
    return true
  }

  if (!previous) {
    return true
  }

  const nextMetadata = parseStatus(next)
  const previousMetadata = parseStatus(previous)

  if (nextMetadata.value === previousMetadata.value) {
    return true
  }

  if (nextMetadata.value === "Applied" && previousMetadata.value !== "Applied") {
    return true
  }

  const allowedNextStatuses = getNextStatusTransitions(previousMetadata)
  return allowedNextStatuses.includes(nextMetadata.value)
}

export function isTerminalStage(stage: PipelineStage) {
  return stage === "ghosted" || stage === "rejected" || stage === "accepted" || stage === "withdrawn"
}

export function isActiveStage(stage: PipelineStage) {
  return !isTerminalStage(stage)
}

export function generateStatusOptions(
  maxRound: number = DEFAULT_MAX_INTERVIEW_ROUNDS,
  ensureStatuses: JobApplicationStatus[] = [],
) {
  const normalizedMaxRound = Math.max(0, Math.floor(maxRound))
  const options = new Map<JobApplicationStatus, StatusMetadata>()

  const register = (status: JobApplicationStatus) => {
    const metadata = parseStatus(status)
    options.set(metadata.value, metadata)
  }

  register("Applied")
  ;(["Ghosted", "Offer", "Rejected"] as const).forEach((outcome) => {
    register(`${outcome} After Round 0` as JobApplicationStatus)
  })

  for (let round = 1; round <= normalizedMaxRound; round += 1) {
    register(`Interview Round ${round}` as JobApplicationStatus)
    ;(["Ghosted", "Offer", "Rejected"] as const).forEach((outcome) => {
      register(`${outcome} After Round ${round}` as JobApplicationStatus)
    })
  }

  register("Accepted")
  register("Withdrawn")

  ensureStatuses.forEach((status) => register(status))

  return Array.from(options.values()).sort((left, right) => {
    if (left.order === right.order) {
      return left.label.localeCompare(right.label)
    }

    return left.order - right.order
  })
}

export interface AllowedStatusOptionsConfig {
  maxRound?: number
  statusHistory?: Pick<JobApplicationStatusHistory, "status">[]
}

function toNonNegativeInteger(value: number | null | undefined, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  const rounded = Math.floor(value)
  return rounded < 0 ? fallback : rounded
}

function createOutcomeStatuses(round: number): JobApplicationStatus[] {
  const normalizedRound = toNonNegativeInteger(round)

  return [
    `Offer After Round ${normalizedRound}` as JobApplicationStatus,
    `Rejected After Round ${normalizedRound}` as JobApplicationStatus,
    `Ghosted After Round ${normalizedRound}` as JobApplicationStatus,
  ]
}

interface StatusTransitionConfig {
  fallbackRound?: number
  maxRound?: number
}

function getNextStatusTransitions(
  current: StatusMetadata,
  { fallbackRound = 0, maxRound = DEFAULT_MAX_INTERVIEW_ROUNDS }: StatusTransitionConfig = {},
) {
  const normalizedFallback = toNonNegativeInteger(fallbackRound)
  const currentRound = toNonNegativeInteger(current.round, normalizedFallback)
  const normalizedMaxRound = Math.max(
    toNonNegativeInteger(maxRound, DEFAULT_MAX_INTERVIEW_ROUNDS),
    normalizedFallback + 1,
    currentRound + 1,
  )

  switch (current.stage) {
    case "applied": {
      const [offerStatus, rejectedStatus, ghostedStatus] = createOutcomeStatuses(0)
      return [
        `Interview Round 1` as JobApplicationStatus,
        offerStatus,
        rejectedStatus,
        ghostedStatus,
        "Withdrawn" as JobApplicationStatus,
      ]
    }
    case "interview": {
      const interviewRound = Math.max(1, currentRound)
      const nextRound = interviewRound + 1
      const [offerStatus, rejectedStatus, ghostedStatus] = createOutcomeStatuses(interviewRound)
      const transitions: JobApplicationStatus[] = []

      if (nextRound <= normalizedMaxRound) {
        transitions.push(`Interview Round ${nextRound}` as JobApplicationStatus)
      }

      transitions.push(offerStatus, rejectedStatus, ghostedStatus, "Withdrawn")
      return transitions
    }
    case "offer": {
      const [, rejectedStatus] = createOutcomeStatuses(currentRound)
      return ["Accepted" as JobApplicationStatus, rejectedStatus, "Withdrawn" as JobApplicationStatus]
    }
    case "ghosted":
    case "rejected":
    case "accepted":
    case "withdrawn":
      return []
    default: {
      const normalizedRound = currentRound > 0 ? currentRound : normalizedFallback
      const nextRound = Math.max(1, normalizedRound + 1)
      const [offerStatus, rejectedStatus, ghostedStatus] = createOutcomeStatuses(normalizedRound)
      const transitions: JobApplicationStatus[] = []

      if (nextRound <= normalizedMaxRound) {
        transitions.push(`Interview Round ${nextRound}` as JobApplicationStatus)
      }

      transitions.push(offerStatus, rejectedStatus, ghostedStatus, "Withdrawn")
      return transitions
    }
  }
}

export function getAllowedStatusOptions(
  currentStatus: string,
  { statusHistory = [], maxRound }: AllowedStatusOptionsConfig = {},
) {
  const current = parseStatus(currentStatus)

  const historyRounds = statusHistory
    .map((entry) => parseStatus(entry.status).round)
    .filter((round): round is number => typeof round === "number" && Number.isFinite(round) && round >= 0)

  const fallbackRound = historyRounds.length > 0 ? Math.max(...historyRounds) : 0

  const optionValues = new Map<JobApplicationStatus, StatusMetadata>()

  const register = (status: JobApplicationStatus) => {
    const metadata = parseStatus(status)
    optionValues.set(metadata.value, metadata)
  }

  register(current.value)

  const transitions = getNextStatusTransitions(current, { fallbackRound, maxRound })
  transitions.forEach(register)

  return Array.from(optionValues.values())
    .filter((option) => option.order >= current.order)
    .sort((left, right) => {
      if (left.order === right.order) {
        return left.label.localeCompare(right.label)
      }

      return left.order - right.order
    })
}

export function formatStatusOptionLabel(status: StatusMetadata | string | null | undefined) {
  const metadata = typeof status === "string" || status == null ? parseStatus(status) : status

  switch (metadata.stage) {
    case "interview":
      return metadata.round ? `Interview Round ${metadata.round}` : "Interview"
    case "offer":
      return "Offer"
    case "accepted":
      return "Offer accepted"
    case "ghosted":
      return "Ghosted"
    case "rejected":
      return "Rejected"
    case "withdrawn":
      return "Withdrawn"
    case "applied":
      return "Applied"
    default:
      return metadata.label
  }
}

export function formatStatusFilterLabel(value: string | null | undefined) {
  if (isPipelineStage(value)) {
    return formatPipelineStageLabel(value)
  }

  return formatStatusOptionLabel(value)
}

export function getMaxRoundFromHistory(history: Pick<JobApplicationStatusHistory, "status">[] = []) {
  return history.reduce((max, entry) => {
    const round = parseStatus(entry.status).round ?? 0
    return round > max ? round : max
  }, 0)
}

export function getStatusesByStage(stage: PipelineStage, maxRound: number = DEFAULT_MAX_INTERVIEW_ROUNDS) {
  return generateStatusOptions(maxRound)
    .filter((option) => option.stage === stage)
    .map((option) => option.value)
}

export function expandStatusFilters(
  values: string[] = [],
  { maxRound = STATUS_FILTER_MAX_ROUND }: { maxRound?: number } = {},
) {
  const statuses = new Set<JobApplicationStatus>()

  values.forEach((value) => {
    if (!value) {
      return
    }

    if (isPipelineStage(value)) {
      getStatusesByStage(value, maxRound).forEach((status) => statuses.add(status))
      return
    }

    statuses.add(normalizeStatusValue(value))
  })

  return Array.from(statuses)
}
