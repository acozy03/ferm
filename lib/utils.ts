import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toNullableString(value: string | null | undefined) {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed === "" ? null : value
}
