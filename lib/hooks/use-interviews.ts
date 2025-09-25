import useSWR from "swr"
import type { InterviewWithApplication } from "@/lib/types/database"
import { apiFetcher } from "@/lib/fetcher"

interface UseInterviewsParams {
  job_application_id?: string
  upcoming_only?: boolean
}

export function useInterviews(params: UseInterviewsParams = {}) {
  const searchParams = new URLSearchParams()

  if (params.job_application_id) searchParams.set("job_application_id", params.job_application_id)
  if (params.upcoming_only) searchParams.set("upcoming_only", "true")

  const { data, error, isLoading, mutate } = useSWR<{ data: InterviewWithApplication[] }>(
    `/api/interviews?${searchParams.toString()}`,
    (url) => apiFetcher<{ data: InterviewWithApplication[] }>(url),
  )

  return {
    interviews: data?.data || [],
    isLoading,
    error,
    mutate,
  }
}
