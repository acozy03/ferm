"use client"

import { type ReactNode, useMemo } from "react"

import { useAnimatedNumber } from "@/hooks/use-animated-number"
import { cn } from "@/lib/utils"

type AnimatedNumberProps = {
  value: number | null | undefined
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  format?: (value: number) => string
  className?: string
  fallback?: ReactNode
}

export function AnimatedNumber({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  decimals = 0,
  format,
  className,
  fallback = "–",
}: AnimatedNumberProps) {
  const shouldAnimate = typeof value === "number" && Number.isFinite(value)

  const animatedValue = useAnimatedNumber(shouldAnimate ? value : null, {
    duration,
  })

  const formattedValue = useMemo(() => {
    if (!shouldAnimate) {
      return null
    }

    if (format) {
      return format(animatedValue)
    }

    if (decimals > 0) {
      return `${prefix}${animatedValue.toFixed(decimals)}${suffix}`
    }

    return `${prefix}${Math.round(animatedValue).toLocaleString()}${suffix}`
  }, [animatedValue, decimals, format, prefix, shouldAnimate, suffix])

  if (!shouldAnimate) {
    return <span className={cn(className)}>{fallback}</span>
  }

  return <span className={cn(className)}>{formattedValue}</span>
}
