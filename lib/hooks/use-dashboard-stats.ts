import useSWR from "swr"
import type { DashboardStats } from "@/lib/types/database"
import { apiFetcher } from "@/lib/fetcher"

interface UseDashboardStatsParams {
  date_from?: string
  date_to?: string
}

export function useDashboardStats(params: UseDashboardStatsParams = {}) {
  const searchParams = new URLSearchParams()

  if (params.date_from) searchParams.set("date_from", params.date_from)
  if (params.date_to) searchParams.set("date_to", params.date_to)

  const { data, error, isLoading, mutate } = useSWR<{ data: DashboardStats }>(
    `/api/dashboard/stats?${searchParams.toString()}`,
    (url) => apiFetcher<{ data: DashboardStats }>(url),
  )

  return {
    stats: data?.data,
    isLoading,
    error,
    mutate,
  }
}
