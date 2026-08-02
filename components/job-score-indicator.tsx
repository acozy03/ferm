"use client"

import { useMemo, useCallback } from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAnimatedNumber } from "@/hooks/use-animated-number"

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
  const parsedScore = typeof score === "number" ? clamp(score, 0, 100) : null
  const animatedScore = useAnimatedNumber(parsedScore ?? null, { duration: 900 })

  const formatAnimatedScore = useCallback((value: number) => {
    const rounded = Math.round(value * 10) / 10
    return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)
  }, [])

  const formattedScore = useMemo(() => {
    if (parsedScore === null) return null
    return formatAnimatedScore(animatedScore)
  }, [animatedScore, formatAnimatedScore, parsedScore])

  const createdAtTime = useMemo(() => {
    if (!createdAt) return null
    const timestamp = new Date(createdAt).getTime()
    return Number.isNaN(timestamp) ? null : timestamp
  }, [createdAt])

  const now = Date.now()
  const isPending = parsedScore === null && createdAtTime !== null && now - createdAtTime < RECENT_THRESHOLD_MS
  const isUnavailable = parsedScore === null && !isPending

  const statusColorClass = useMemo(() => {
    if (isPending || isUnavailable) return "text-muted-foreground"
    if (parsedScore === null) return "text-muted-foreground"
    if (parsedScore >= 80) return "text-emerald-500"
    if (parsedScore >= 60) return "text-amber-500"
    return "text-red-500"
  }, [isPending, isUnavailable, parsedScore])

  const circumference = useMemo(() => {
    const radius = (size - 8) / 2
    return 2 * Math.PI * radius
  }, [size])

  const radius = useMemo(() => (size - 8) / 2, [size])

  const strokeDashoffset = useMemo(() => {
    if (parsedScore === null) {
      return circumference
    }

    const progress = clamp(animatedScore / 100, 0, 1)
    return circumference - circumference * progress
  }, [animatedScore, circumference, parsedScore])

  const alignmentClasses = align === "end" ? "items-center justify-end" : "items-center"
  const textAlignment = align === "end" ? "text-right" : "text-left"

  return (
    <div className={cn("flex gap-3", alignmentClasses, className)}>
      {showDescription && (
        <div className={cn("text-sm font-medium text-muted-foreground", textAlignment)}>Fit Score</div>
      )}
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
        role="img"
        aria-label={
          parsedScore === null
            ? isPending
              ? "Resume match score pending"
              : "Resume match score unavailable"
            : `Resume match score ${formattedScore} out of 100`
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
            <span className={cn("text-sm font-semibold", statusColorClass)}>{formattedScore ?? "--"}</span>
          )}
        </div>
      </div>
    </div>
  )
}
