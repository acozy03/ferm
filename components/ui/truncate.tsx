import { createElement } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsTruncated } from "@/hooks/truncate-text"
import { cn } from "@/lib/utils"

type TruncatedTextProps = {
  text: string
  as?: "p" | "span"
  className?: string
  maxWidthClass?: string
  clampClassName?: string
  lineClamp?: number
}

export function TruncatedText({
  text,
  as = "p",
  className,
  maxWidthClass = "max-w-[25rem]",
  clampClassName,
  lineClamp,
}: TruncatedTextProps) {
  const { ref, isTruncated } = useIsTruncated<HTMLElement>()
  const Component = as

  const clampClass = clampClassName ?? (lineClamp ? `line-clamp-${lineClamp}` : "truncate")
  const content = createElement(Component, { ref, className: cn(clampClass, maxWidthClass, className) }, text)

  return isTruncated ? (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  ) : (
    content
  )
}
