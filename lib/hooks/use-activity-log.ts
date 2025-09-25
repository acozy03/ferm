import useSWR from "swr"
import type { ActivityLog } from "@/lib/types/database"
import { apiFetcher } from "@/lib/fetcher"

export function useActivityLog(jobApplicationId?: string) {
  const { data, error, isLoading, mutate } = useSWR<{ data: ActivityLog[] }>(
    jobApplicationId ? `/api/job-applications/${jobApplicationId}/activity` : "/api/activity-log",
    (url) => apiFetcher<{ data: ActivityLog[] }>(url),
  )

  return {
    activities: data?.data || [],
    isLoading,
    error,
    mutate,
  }
}
