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

      <ScrollBar forceMount />
      <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" className="hidden" />
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
        'pointer-events-none opacity-0',
        orientation === 'vertical' ? 'w-0' : 'h-0',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb data-slot="scroll-area-thumb" className="hidden" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
