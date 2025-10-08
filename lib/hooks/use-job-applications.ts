"use client"

import { useMemo } from "react"
import useSWR from "swr"
import type {
  JobApplication,
  JobApplicationFilters,
  JobApplicationSort,
  JobApplicationWithStatusHistory,
} from "@/lib/types/database"
import type { PaginatedResponse } from "@/lib/types/api"
import { apiFetcher } from "@/lib/fetcher"

type JobApplicationResult<TIncludeStatusHistory extends boolean | undefined> = TIncludeStatusHistory extends true
  ? JobApplicationWithStatusHistory
  : JobApplication

interface UseJobApplicationsParams<TIncludeStatusHistory extends boolean | undefined = undefined> {
  page?: number
  limit?: number
  filters?: JobApplicationFilters
  sort?: JobApplicationSort
  include_interviews?: boolean
  include_activity?: boolean
  include_status_history?: TIncludeStatusHistory
  ignoreArchivePreference?: boolean
}

export function useJobApplications<TIncludeStatusHistory extends boolean | undefined = undefined>(
  params: UseJobApplicationsParams<TIncludeStatusHistory> = {} as UseJobApplicationsParams<TIncludeStatusHistory>,
) {
  const effectiveFilters = useMemo<JobApplicationFilters>(
    () => params.filters ?? {},
    [params.filters],
  )

  const requestUrl = useMemo(() => {
    const searchParams = new URLSearchParams()

    if (params.page) searchParams.set("page", params.page.toString())
    if (params.limit) searchParams.set("limit", params.limit.toString())
    if (params.include_interviews) searchParams.set("include_interviews", "true")
    if (params.include_activity) searchParams.set("include_activity", "true")
    if (params.include_status_history) searchParams.set("include_status_history", "true")

    if (effectiveFilters.status) searchParams.set("status", effectiveFilters.status.join(","))
    if (effectiveFilters.priority) searchParams.set("priority", effectiveFilters.priority.join(","))
    if (effectiveFilters.company_name) searchParams.set("company_name", effectiveFilters.company_name)
    if (effectiveFilters.search) searchParams.set("search", effectiveFilters.search)
    if (effectiveFilters.date_from) searchParams.set("date_from", effectiveFilters.date_from)
    if (effectiveFilters.date_to) searchParams.set("date_to", effectiveFilters.date_to)

    if (params.sort?.field) searchParams.set("sort_field", params.sort.field)
    if (params.sort?.direction) searchParams.set("sort_direction", params.sort.direction)

    const query = searchParams.toString()
    return query.length > 0 ? `/api/job-applications?${query}` : "/api/job-applications"
  }, [
    effectiveFilters,
    params.include_activity,
    params.include_interviews,
    params.include_status_history,
    params.limit,
    params.page,
    params.sort?.direction,
    params.sort?.field,
  ])

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<JobApplicationResult<TIncludeStatusHistory>>>(
    requestUrl,
    (url) => apiFetcher<PaginatedResponse<JobApplicationResult<TIncludeStatusHistory>>>(url),
  )

  const applications = useMemo(() => {
    const records = data?.data ?? []
    if (!params.include_status_history) {
      return records as JobApplicationResult<TIncludeStatusHistory>[]
    }

    return (records as JobApplicationWithStatusHistory[]).map((application) => ({
      ...application,
      status_history: [...(application.status_history ?? [])].sort(
        (left, right) => new Date(left.changed_at).getTime() - new Date(right.changed_at).getTime(),
      ),
    })) as JobApplicationResult<TIncludeStatusHistory>[]
  }, [data?.data, params.include_status_history])

  return {
    applications,
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
