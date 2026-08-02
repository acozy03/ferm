"use client"

import useSWR from "swr"

import { apiFetcher } from "@/lib/fetcher"
import type { ApplicationFollowUp } from "@/lib/types/database"
import type { ApiResponse } from "@/lib/types/api"

type FollowUpResponse = ApiResponse<ApplicationFollowUp[]>

export function useApplicationFollowUps() {
  const { data, error, isLoading, mutate } = useSWR<FollowUpResponse>("/api/follow-ups", (url: string) =>
    apiFetcher<FollowUpResponse>(url),
  )

  return {
    followUps: data?.data ?? [],
    isLoading,
    error,
    mutate,
  }
}
