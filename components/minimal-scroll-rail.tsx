"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react"

import { cn } from "@/lib/utils"

const KNOB_SIZE = 12
const SCROLLABLE_OVERFLOW_VALUES = new Set(["auto", "scroll", "overlay"])

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

const isScrollableElement = (element: HTMLElement) => {
  const style = window.getComputedStyle(element)
  const overflowY = style.overflowY
  const overflow = style.overflow

  const allowsScroll =
    SCROLLABLE_OVERFLOW_VALUES.has(overflowY) || SCROLLABLE_OVERFLOW_VALUES.has(overflow)

  return allowsScroll && element.scrollHeight > element.clientHeight + 1
}

const eventHasNativeScrollableTarget = (event: Event) => {
  if (typeof window === "undefined") return false

  const path = typeof event.composedPath === "function" ? event.composedPath() : []
  const elements: HTMLElement[] = []

  if (path.length > 0) {
    for (const entry of path) {
      if (entry instanceof HTMLElement) {
        elements.push(entry)
      }
    }
  } else {
    const target = event.target
    if (target instanceof HTMLElement) {
      let current: HTMLElement | null = target
      while (current) {
        elements.push(current)
        current = current.parentElement
      }
    }
  }

  for (const element of elements) {
    if (element.dataset.scrollRail === "force") {
      break
    }

    if (element.dataset.scrollRail === "ignore") {
      return true
    }

    if (element === document.body || element === document.documentElement) {
      break
    }

    if (isScrollableElement(element)) {
      return true
    }
  }

  return false
}

export function MinimalScrollRail() {
  const [progress, setProgress] = useState(0)
  const isDraggingRef = useRef(false)
  const trackRef = useRef<HTMLDivElement | null>(null)

  const getScrollMetrics = useCallback(() => {
    const root = document.scrollingElement ?? document.documentElement
    const maxScroll = root.scrollHeight - root.clientHeight

    return { root, maxScroll }
  }, [])

  const updateProgress = useCallback(() => {
    const { root, maxScroll } = getScrollMetrics()
    if (maxScroll <= 0) {
      setProgress(0)
      return
    }

    setProgress(root.scrollTop / maxScroll)
  }, [getScrollMetrics])

  const scrollToProgress = useCallback((value: number) => {
    const { root, maxScroll } = getScrollMetrics()
    if (maxScroll <= 0) return

    const next = clamp(value, 0, 1) * maxScroll
    root.scrollTo({ top: next })
  }, [getScrollMetrics])

  const applyDelta = useCallback((delta: number) => {
    if (delta === 0) return

    const { root, maxScroll } = getScrollMetrics()
    if (maxScroll <= 0) return

    const next = clamp(root.scrollTop + delta, 0, maxScroll)
    root.scrollTo({ top: next })
  }, [getScrollMetrics])

  useEffect(() => {
    updateProgress()
  }, [updateProgress])

  useEffect(() => {
    const handleScroll = () => updateProgress()

    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [updateProgress])

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (eventHasNativeScrollableTarget(event)) {
        return
      }

      event.preventDefault()
      applyDelta(event.deltaY)
    }

    window.addEventListener("wheel", handleWheel, { passive: false })

    return () => window.removeEventListener("wheel", handleWheel)
  }, [applyDelta])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
          event.preventDefault()
          applyDelta(window.innerHeight * 0.1)
          break
        case "ArrowUp":
        case "ArrowLeft":
          event.preventDefault()
          applyDelta(-window.innerHeight * 0.1)
          break
        case "PageDown":
          event.preventDefault()
          applyDelta(window.innerHeight * 0.9)
          break
        case "PageUp":
          event.preventDefault()
          applyDelta(-window.innerHeight * 0.9)
          break
        case "Home":
          event.preventDefault()
          const { root } = getScrollMetrics()
          root.scrollTo({ top: 0 })
          break
        case "End":
          event.preventDefault()
          {
            const { root, maxScroll } = getScrollMetrics()
            if (maxScroll <= 0) return
            root.scrollTo({ top: maxScroll })
          }
          break
        default:
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [applyDelta, getScrollMetrics])

  useEffect(() => {
    let lastTouchY: number | null = null

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 0) return
      lastTouchY = event.touches[0].clientY
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (lastTouchY === null) return
      const currentY = event.touches[0]?.clientY
      if (currentY === undefined) return

      const delta = lastTouchY - currentY
      if (Math.abs(delta) < 1) return

      if (eventHasNativeScrollableTarget(event)) {
        lastTouchY = currentY
        return
      }

      event.preventDefault()
      applyDelta(delta)
      lastTouchY = currentY
    }

    const reset = () => {
      lastTouchY = null
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: false })
    window.addEventListener("touchmove", handleTouchMove, { passive: false })
    window.addEventListener("touchend", reset)
    window.addEventListener("touchcancel", reset)

    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", reset)
      window.removeEventListener("touchcancel", reset)
    }
  }, [applyDelta])

  const pointerToProgress = useCallback(
    (clientY: number) => {
      const track = trackRef.current
      if (!track) return

      const { height, top } = track.getBoundingClientRect()
      if (height === 0) return

      const relativeY = clamp((clientY - top) / height, 0, 1)
      scrollToProgress(relativeY)
    },
    [scrollToProgress],
  )

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    isDraggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerToProgress(event.clientY)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    event.preventDefault()
    pointerToProgress(event.clientY)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleTrackClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    pointerToProgress(event.clientY)
  }

  return (
    <div className="pointer-events-none fixed bottom-0 right-6 top-0 hidden w-8 items-center sm:flex">
      <div
        ref={trackRef}
        className="pointer-events-auto relative mx-auto h-[260px] w-[2px] rounded-full bg-border/60"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleTrackClick}
        role="presentation"
      >
        <button
          type="button"
          className={cn(
            "absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-border/80 bg-primary/80 shadow-sm transition-colors",
            "hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          style={{ top: `calc(${progress * 100}% - ${KNOB_SIZE / 2}px)` }}
          aria-label="Scroll"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-orientation="vertical"
          role="slider"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowRight") {
              event.preventDefault()
              scrollToProgress(progress + 0.05)
            } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
              event.preventDefault()
              scrollToProgress(progress - 0.05)
            } else if (event.key === "Home") {
              event.preventDefault()
              scrollToProgress(0)
            } else if (event.key === "End") {
              event.preventDefault()
              scrollToProgress(1)
            }
          }}
        >
          <span className="sr-only">Scroll position: {Math.round(progress * 100)} percent</span>
        </button>
      </div>
    </div>
  )
}
