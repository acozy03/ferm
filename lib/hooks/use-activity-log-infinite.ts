import useSWRInfinite from "swr/infinite"
import type { ActivityLogWithApplication } from "@/lib/types/database"
import { apiFetcher } from "@/lib/fetcher"

interface ActivityLogPage {
  activities: ActivityLogWithApplication[]
  nextCursor: string | null
  totalCount: number
}

export function useActivityLogInfinite(jobApplicationId?: string, limit = 100) {
  const base = jobApplicationId ? `/api/job-applications/${jobApplicationId}/activity` : `/api/activity-log`

  const getKey = (pageIndex: number, prev: ActivityLogPage | null) => {
    if (prev && !prev.nextCursor) return null

    const params = new URLSearchParams()
    params.set("limit", String(limit))
    if (prev?.nextCursor) params.set("cursor", prev.nextCursor)

    return `${base}?${params.toString()}`
  }

  const { data, error, isLoading, size, setSize, mutate } = useSWRInfinite<ActivityLogPage>(
    getKey,
    (url) => apiFetcher<ActivityLogPage>(url),
    { revalidateFirstPage: false },
  )

  const pages = data ?? []
  const activities = pages.flatMap((p) => p.activities)
  const totalCount = pages[0]?.totalCount ?? 0
  const hasMore = Boolean(pages[pages.length - 1]?.nextCursor)
  const isLoadingMore = isLoading || (size > 0 && !data?.[size - 1])

  const loadMore = () => {
    if (!hasMore || isLoadingMore) return
    setSize(size + 1)
  }

  return {
    activities,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMore,
    error,
    mutate,
  }
}
