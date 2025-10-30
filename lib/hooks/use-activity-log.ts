import useSWR from "swr"
import type { ActivityLogWithApplication } from "@/lib/types/database"
import { apiFetcher } from "@/lib/fetcher"

interface ActivityLogResponse {
  data: ActivityLogWithApplication[]
  totalCount?: number
}

export function useActivityLog(jobApplicationId?: string) {
  const key = jobApplicationId ? `/api/job-applications/${jobApplicationId}/activity` : "/api/activity-log"

  const { data, error, isLoading, mutate } = useSWR<ActivityLogResponse>(key, (url) =>
    apiFetcher<ActivityLogResponse>(url),
  )

  return {
    activities: data?.data ?? [],
    totalCount: data?.totalCount ?? data?.data.length ?? 0,
    isLoading,
    error,
    mutate,
  }
}
