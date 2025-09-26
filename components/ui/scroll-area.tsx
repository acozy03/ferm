'use client'

import * as React from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { cn } from '@/lib/utils'

function ScrollArea({
  className,
  children,
  type = 'auto',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  const viewportStyle = React.useMemo<React.CSSProperties>(() => ({
    WebkitOverflowScrolling: 'touch',    // iOS momentum
    scrollBehavior: 'smooth',            // programmatic scrolls
    scrollbarWidth: 'none',              // Firefox hide
    msOverflowStyle: 'none',             // IE/Edge legacy
    overscrollBehavior: 'contain',       // stop scroll chaining jank
    scrollbarGutter: 'stable',           // avoid layout shift when showing scrollbars
  }), [])

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative', className)}
      type={type}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          // base
          'size-full rounded-[inherit] overflow-auto outline-none',
          // hide native scrollbars
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          // keep focus styles light
          'focus-visible:outline-1 focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-[color,box-shadow]',
          // smoothness helpers:
          // - create its own compositor layer
          // - avoid repainting behind the layer
          'transform-gpu [will-change:transform] [backface-visibility:hidden]',
          // - let browser skip offscreen work for huge lists
          '[content-visibility:auto] [contain-intrinsic-size:1000px]',
        )}
        style={viewportStyle}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>

      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none select-none p-px transition-colors',
        orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border transform-gpu"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
