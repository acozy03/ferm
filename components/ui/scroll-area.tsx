"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const SCROLL_THRESHOLD = 2

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => {
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const [scrollIndicators, setScrollIndicators] = React.useState({
    canScrollUp: false,
    canScrollDown: false,
    canScrollLeft: false,
    canScrollRight: false,
  })

  const updateScrollIndicators = React.useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = viewport
    const maxScrollTop = scrollHeight - clientHeight
    const maxScrollLeft = scrollWidth - clientWidth

    setScrollIndicators({
      canScrollUp: scrollTop > SCROLL_THRESHOLD,
      canScrollDown: scrollTop < maxScrollTop - SCROLL_THRESHOLD,
      canScrollLeft: scrollLeft > SCROLL_THRESHOLD,
      canScrollRight: scrollLeft < maxScrollLeft - SCROLL_THRESHOLD,
    })
  }, [])

  React.useEffect(() => {
    updateScrollIndicators()

    const viewport = viewportRef.current
    if (!viewport) return

    const handleScroll = () => updateScrollIndicators()
    viewport.addEventListener("scroll", handleScroll, { passive: true })

    const resizeObserver = new ResizeObserver(() => updateScrollIndicators())
    resizeObserver.observe(viewport)

    const content = viewport.firstElementChild
    if (content instanceof HTMLElement) {
      resizeObserver.observe(content)
    }

    return () => {
      viewport.removeEventListener("scroll", handleScroll)
      resizeObserver.disconnect()
    }
  }, [updateScrollIndicators])

  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport ref={viewportRef} className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <div
        aria-hidden="true"
        data-scroll-up={scrollIndicators.canScrollUp}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-gradient-to-b from-foreground/10 to-transparent opacity-0 transition-opacity data-[scroll-up=true]:opacity-100"
      />
      <div
        aria-hidden="true"
        data-scroll-down={scrollIndicators.canScrollDown}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3 bg-gradient-to-t from-foreground/10 to-transparent opacity-0 transition-opacity data-[scroll-down=true]:opacity-100"
      />
      <ScrollBar />
      <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
    </ScrollAreaPrimitive.Root>
  )
})
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    data-slot="scroll-area-scrollbar"
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 border-t border-t-transparent p-[1px]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      data-slot="scroll-area-thumb"
      className="relative flex-1 rounded-full bg-border"
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
