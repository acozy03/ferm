import type { JobApplicationFilters } from "@/lib/types/database"
import type { ReadonlyURLSearchParams } from "next/navigation"

const FILTER_PARAM_KEYS: Array<keyof JobApplicationFilters> = [
  "status",
  "priority",
  "employment_type",
  "company_name",
  "search",
  "date_from",
  "date_to",
]

export function parseJobApplicationFilters(
  searchParams: ReadonlyURLSearchParams,
): JobApplicationFilters {
  const statusParam = searchParams.get("status")
  const priorityParam = searchParams.get("priority")
  const employmentTypeParam = searchParams.get("employment_type")
  const companyName = searchParams.get("company_name") || undefined
  const searchQuery = searchParams.get("search") || undefined
  const dateFrom = searchParams.get("date_from") || undefined
  const dateTo = searchParams.get("date_to") || undefined

  return {
    status: statusParam ? statusParam.split(",").filter(Boolean) : undefined,
    priority: priorityParam ? priorityParam.split(",").filter(Boolean) : undefined,
    employment_type: employmentTypeParam ? employmentTypeParam.split(",").filter(Boolean) : undefined,
    company_name: companyName,
    search: searchQuery,
    date_from: dateFrom,
    date_to: dateTo,
  }
}

export function createSearchParamsWithFilters(
  baseParams: ReadonlyURLSearchParams | URLSearchParams,
  filters: JobApplicationFilters,
): URLSearchParams {
  const params = new URLSearchParams(baseParams.toString())

  FILTER_PARAM_KEYS.forEach((key) => params.delete(key as string))

  if (filters.status?.length) {
    params.set("status", filters.status.join(","))
  }
  if (filters.priority?.length) {
    params.set("priority", filters.priority.join(","))
  }
  if (filters.employment_type?.length) {
    params.set("employment_type", filters.employment_type.join(","))
  }
  if (filters.company_name) {
    params.set("company_name", filters.company_name)
  }
  if (filters.search) {
    params.set("search", filters.search)
  }
  if (filters.date_from) {
    params.set("date_from", filters.date_from)
  }
  if (filters.date_to) {
    params.set("date_to", filters.date_to)
  }

  return params
}

export function countJobFilters(
  filters: JobApplicationFilters,
  options: { includeSearch?: boolean } = {},
): number {
  const { includeSearch = false } = options
  let total = 0
  total += filters.status?.length ?? 0
  total += filters.priority?.length ?? 0
  total += filters.employment_type?.length ?? 0
  if (filters.company_name) total += 1
  if (filters.date_from) total += 1
  if (filters.date_to) total += 1
  if (includeSearch && filters.search) total += 1
  return total
}
