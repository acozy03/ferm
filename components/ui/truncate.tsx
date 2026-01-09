import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsTruncated } from "@/hooks/truncate-text"
import { cn } from "@/lib/utils"

type TruncatedTextProps = {
  text: string
  className?: string
  maxWidthClass?: string 
}

export function TruncatedText({
  text,
  className,
  maxWidthClass = "max-w-[25rem]",
}: TruncatedTextProps) {
  const { ref, isTruncated } = useIsTruncated<HTMLParagraphElement>()

  const content = (
    <p
      ref={ref}
      className={cn(
        "truncate",
        maxWidthClass,
        className
      )}
    >
      {text}
    </p>
  )

  return isTruncated ? (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  ) : (
    content
  )
}
