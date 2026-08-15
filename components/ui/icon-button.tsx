import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const iconButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md bg-transparent text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-transparent",
  {
    variants: {
      variant: {
        ghost: "hover:bg-accent/80 hover:text-accent-foreground",
        subtle: "hover:bg-primary/15 text-primary",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-8 px-2.5",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "default",
    },
  },
)

type IconButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof iconButtonVariants> & {
    asChild?: boolean
  }

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const persistedStateProps = asChild ? {} : { autoComplete: "off" }

    return (
      <Comp
        ref={ref}
        className={cn(iconButtonVariants({ variant, size, className }))}
        {...persistedStateProps}
        {...props}
      />
    )
  },
)

IconButton.displayName = "IconButton"

export { IconButton, iconButtonVariants }
