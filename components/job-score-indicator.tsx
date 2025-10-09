"use client"

import { useMemo } from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

interface JobScoreIndicatorProps {
  score?: number | null
  createdAt?: string
  className?: string
  size?: number
  showDescription?: boolean
  align?: "start" | "end"
}

const RECENT_THRESHOLD_MS = 5 * 60 * 1000

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value))
}

export function JobScoreIndicator({
  score,
  createdAt,
  className,
  size = 56,
  showDescription = true,
  align = "start",
}: JobScoreIndicatorProps) {
  const parsedScore = typeof score === "number" ? clamp(score, 0, 10) : null
  const normalized = parsedScore === null ? 0 : parsedScore / 10
  const scoreOutOfFive = parsedScore === null ? null : parsedScore / 2

  const formattedScore = useMemo(() => {
    if (scoreOutOfFive === null) return null
    const rounded = Math.round(scoreOutOfFive * 10) / 10
    return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)
  }, [scoreOutOfFive])

  const createdAtTime = useMemo(() => {
    if (!createdAt) return null
    const timestamp = new Date(createdAt).getTime()
    return Number.isNaN(timestamp) ? null : timestamp
  }, [createdAt])

  const now = Date.now()
  const isPending = parsedScore === null && createdAtTime !== null && now - createdAtTime < RECENT_THRESHOLD_MS
  const isUnavailable = parsedScore === null && !isPending

  const descriptor = useMemo(() => {
    if (isPending) return "Analyzing resume"
    if (isUnavailable) return "Match data unavailable"
    if (scoreOutOfFive === null) return ""

    if (scoreOutOfFive >= 4.5) return "Outstanding match"
    if (scoreOutOfFive >= 4) return "Great match"
    if (scoreOutOfFive >= 3) return "Solid alignment"
    if (scoreOutOfFive >= 2) return "Needs refinement"
    return "Low alignment"
  }, [isPending, isUnavailable, scoreOutOfFive])

  const statusColorClass = useMemo(() => {
    if (isPending || isUnavailable) return "text-muted-foreground"
    if (scoreOutOfFive === null) return "text-muted-foreground"
    if (scoreOutOfFive >= 4) return "text-emerald-500"
    if (scoreOutOfFive >= 3) return "text-amber-500"
    return "text-red-500"
  }, [isPending, isUnavailable, scoreOutOfFive])

  const circumference = useMemo(() => {
    const radius = (size - 8) / 2
    return 2 * Math.PI * radius
  }, [size])

  const radius = useMemo(() => (size - 8) / 2, [size])

  const strokeDashoffset = useMemo(() => {
    const progress = clamp(normalized, 0, 1)
    return circumference - circumference * progress
  }, [circumference, normalized])

  const alignmentClasses = align === "end" ? "items-center justify-end" : "items-center"
  const textAlignment = align === "end" ? "text-right" : "text-left"

  const textWidthClass = showDescription ? "min-w-[96px]" : "min-w-[72px]"

  return (
    <div className={cn("flex gap-3", alignmentClasses, className)}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
        role="img"
        aria-label={
          parsedScore === null
            ? isPending
              ? "Resume match score pending"
              : "Resume match score unavailable"
            : `Resume match score ${formattedScore} out of 5`
        }
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={4}
            className="text-muted-foreground/20"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={4}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              "transition-[stroke-dashoffset] duration-500 ease-out",
              statusColorClass,
              isPending && "opacity-70",
            )}
            fill="transparent"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <span className={cn("text-sm font-semibold", statusColorClass)}>
              {formattedScore ?? "--"}
            </span>
          )}
        </div>
      </div>

      <div className={cn(textWidthClass, "space-y-0.5", textAlignment)}>
        <p className={cn("text-sm font-medium", statusColorClass)}>
          {isPending ? "Scoring" : formattedScore ? `${formattedScore} / 5` : "No score"}
        </p>
        {showDescription && (
          <p className="text-xs text-muted-foreground leading-tight">{descriptor}</p>
        )}
      </div>
    </div>
  )
}

