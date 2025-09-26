import useSWR from "swr"
import type { ActivityLogWithApplication } from "@/lib/types/database"
import { apiFetcher } from "@/lib/fetcher"

export function useActivityLog(jobApplicationId?: string) {
  const key = jobApplicationId ? `/api/job-applications/${jobApplicationId}/activity` : "/api/activity-log"

  const { data, error, isLoading, mutate } = useSWR<{ data: ActivityLogWithApplication[] }>(
    key,
    (url) => apiFetcher<{ data: ActivityLogWithApplication[] }>(url),
  )

  return {
    activities: data?.data ?? [],
    isLoading,
    error,
    mutate,
  }
}
