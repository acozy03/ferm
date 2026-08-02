import { isValid, parse, parseISO } from "date-fns"

const DATE_ONLY_PATTERN = "yyyy-MM-dd"

export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const hasTimeComponent = trimmed.includes("T")
  const parsed = hasTimeComponent ? parseISO(trimmed) : parse(trimmed, DATE_ONLY_PATTERN, new Date())

  return isValid(parsed) ? parsed : null
}

export function getDateOrNull(value: string | null | undefined): Date | null {
  return parseDateInput(value)
}

export function getDateOrNow(value: string | null | undefined): Date {
  return parseDateInput(value) ?? new Date()
}
