import useSWR from "swr"
import type { JobApplication, JobApplicationFilters, JobApplicationSort } from "@/lib/types/database"
import type { PaginatedResponse } from "@/lib/types/api"
import { apiFetcher } from "@/lib/fetcher"

interface UseJobApplicationsParams {
  page?: number
  limit?: number
  filters?: JobApplicationFilters
  sort?: JobApplicationSort
  include_interviews?: boolean
  include_activity?: boolean
}

export function useJobApplications(params: UseJobApplicationsParams = {}) {
  const searchParams = new URLSearchParams()

  if (params.page) searchParams.set("page", params.page.toString())
  if (params.limit) searchParams.set("limit", params.limit.toString())
  if (params.include_interviews) searchParams.set("include_interviews", "true")
  if (params.include_activity) searchParams.set("include_activity", "true")

  // Add filters
  if (params.filters?.status) searchParams.set("status", params.filters.status.join(","))
  if (params.filters?.priority) searchParams.set("priority", params.filters.priority.join(","))
  if (params.filters?.company_name) searchParams.set("company_name", params.filters.company_name)
  if (params.filters?.search) searchParams.set("search", params.filters.search)
  if (params.filters?.date_from) searchParams.set("date_from", params.filters.date_from)
  if (params.filters?.date_to) searchParams.set("date_to", params.filters.date_to)

  // Add sort
  if (params.sort?.field) searchParams.set("sort_field", params.sort.field)
  if (params.sort?.direction) searchParams.set("sort_direction", params.sort.direction)

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<JobApplication>>(
    `/api/job-applications?${searchParams.toString()}`,
    (url) => apiFetcher<PaginatedResponse<JobApplication>>(url),
  )

  return {
    applications: data?.data || [],
    count: data?.count || 0,
    page: data?.page || 1,
    limit: data?.limit || 10,
    total_pages: data?.total_pages || 0,
    isLoading,
    error,
    mutate,
  }
}

export function useJobApplication(id: string) {
  const { data, error, isLoading, mutate } = useSWR<{ data: JobApplication }>(
    id ? `/api/job-applications/${id}` : null,
    (url) => apiFetcher<{ data: JobApplication }>(url),
  )

  return {
    application: data?.data,
    isLoading,
    error,
    mutate,
  }
}
