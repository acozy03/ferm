import type { CreateJobApplicationData, JobApplicationFilters, JobApplicationSort } from "@/lib/types/database"

export interface ApiResponse<T> {
  data: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  total_pages: number
}

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

// API endpoint types
export interface GetJobApplicationsParams {
  page?: number
  limit?: number
  filters?: JobApplicationFilters
  sort?: JobApplicationSort
  include_interviews?: boolean
  include_activity?: boolean
}

export interface BulkUpdateJobApplicationsData {
  ids: string[]
  updates: Partial<CreateJobApplicationData>
}

export interface JobApplicationStatsParams {
  date_from?: string
  date_to?: string
}
