"use client"

import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium \
disabled:pointer-events-none disabled:opacity-50 \
data-[state=off]:border data-[state=off]:border-input data-[state=off]:bg-background data-[state=off]:text-foreground \
data-[state=off]:shadow-[0_0_0_1px_rgba(0,0,0,0.06)] \
data-[state=off]:hover:border-border data-[state=off]:hover:bg-accent data-[state=off]:hover:text-accent-foreground \
data-[state=off]:dark:bg-input/30 data-[state=off]:dark:border-white/15 \
data-[state=off]:dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] \
data-[state=off]:dark:hover:bg-input/45 data-[state=off]:dark:hover:border-white/25 \
data-[state=on]:bg-transparent data-[state=on]:text-inherit \
data-[state=on]:hover:bg-transparent data-[state=on]:hover:text-accent-foreground \
[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 \
focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] \
outline-none transition-[color,box-shadow] \
aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 \
aria-invalid:border-destructive whitespace-nowrap",

  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent shadow-xs",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />
  )
}

export { Toggle, toggleVariants }
