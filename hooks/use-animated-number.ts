"use client"

import { useEffect, useRef, useState } from "react"

type UseAnimatedNumberOptions = {
  duration?: number
  easing?: (progress: number) => number
  startAtZero?: boolean
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export function useAnimatedNumber(
  targetValue: number | null | undefined,
  options?: UseAnimatedNumberOptions,
) {
  const { duration = 800, easing = easeOutCubic, startAtZero = true } = options ?? {}

  const initialValue =
    typeof targetValue === "number" && Number.isFinite(targetValue) ? targetValue : 0

  const [displayValue, setDisplayValue] = useState<number>(initialValue)
  const previousValueRef = useRef<number>(initialValue)
  const hasAnimatedRef = useRef<boolean>(false)
  const frameRef = useRef<number>()

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }

    if (typeof targetValue !== "number" || !Number.isFinite(targetValue)) {
      setDisplayValue(0)
      previousValueRef.current = 0
      hasAnimatedRef.current = false
      return
    }

    const from = !hasAnimatedRef.current && startAtZero ? 0 : previousValueRef.current
    const to = targetValue
    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      const easedProgress = easing(progress)
      const nextValue = from + (to - from) * easedProgress

      setDisplayValue(nextValue)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step)
      } else {
        previousValueRef.current = to
        hasAnimatedRef.current = true
      }
    }

    frameRef.current = requestAnimationFrame(step)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [duration, easing, startAtZero, targetValue])

  return displayValue
}
