"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react"

import { cn } from "@/lib/utils"

const KNOB_SIZE = 12

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

const SCROLL_STEP = 0.05

interface ScrollToProgressOptions {
  smooth?: boolean
}

export function MinimalScrollRail() {
  const [progress, setProgress] = useState(0)
  const isDraggingRef = useRef(false)
  const trackRef = useRef<HTMLDivElement | null>(null)

  const getScrollMetrics = useCallback(() => {
    const root = (document.scrollingElement ?? document.documentElement) as HTMLElement
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

  const scrollToProgress = useCallback(
    (value: number, options: ScrollToProgressOptions = {}) => {
      const { root, maxScroll } = getScrollMetrics()
      if (maxScroll <= 0) return

      const next = clamp(value, 0, 1) * maxScroll
      root.scrollTo({ top: next, behavior: options.smooth ? "smooth" : "auto" })
    },
    [getScrollMetrics],
  )

  useEffect(() => {
    updateProgress()
  }, [updateProgress])

  useEffect(() => {
    const handle = () => updateProgress()

    window.addEventListener("scroll", handle, { passive: true })
    window.addEventListener("resize", handle)

    return () => {
      window.removeEventListener("scroll", handle)
      window.removeEventListener("resize", handle)
    }
  }, [updateProgress])

  const pointerToProgress = useCallback(
    (clientY: number, options: ScrollToProgressOptions = {}) => {
      const track = trackRef.current
      if (!track) return

      const { height, top } = track.getBoundingClientRect()
      if (height === 0) return

      const relativeY = clamp((clientY - top) / height, 0, 1)
      scrollToProgress(relativeY, options)
    },
    [scrollToProgress],
  )

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    isDraggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerToProgress(event.clientY, { smooth: true })
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
    pointerToProgress(event.clientY, { smooth: true })
  }

  const bumpProgress = useCallback(
    (delta: number) => {
      scrollToProgress(progress + delta, { smooth: true })
    },
    [progress, scrollToProgress],
  )

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
              bumpProgress(SCROLL_STEP)
            } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
              event.preventDefault()
              bumpProgress(-SCROLL_STEP)
            } else if (event.key === "Home") {
              event.preventDefault()
              scrollToProgress(0, { smooth: true })
            } else if (event.key === "End") {
              event.preventDefault()
              scrollToProgress(1, { smooth: true })
            }
          }}
        >
          <span className="sr-only">Scroll position: {Math.round(progress * 100)} percent</span>
        </button>
      </div>
    </div>
  )
}
