"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { JobApplicationCard } from "@/components/job-application-card"
import { StatsOverview } from "@/components/stats-overview"
import { ApplicationFilters } from "@/components/application-filters"
import { ActivityTimeline } from "@/components/activity-timeline"
import { QuickActions } from "@/components/quick-actions"
import { UpcomingInterviews } from "@/components/upcoming-interviews"
import { BulkActions } from "@/components/bulk-actions"
import { useJobApplications } from "@/lib/hooks/use-job-applications"
import { createSearchParamsWithFilters, parseJobApplicationFilters } from "@/lib/job-filters"
import type { JobApplicationFilters, JobApplicationSort } from "@/lib/types/database"

const serializeFilters = (filters: JobApplicationFilters) =>
  createSearchParamsWithFilters(new URLSearchParams(), filters).toString()

const defaultSort: JobApplicationSort = { field: "created_at", direction: "desc" }

export default function Dashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const filtersFromParams = useMemo(() => parseJobApplicationFilters(searchParams), [searchParams])

  const sortFromParams = useMemo<JobApplicationSort>(() => {
    const fieldParam = searchParams.get("sort_field") as JobApplicationSort["field"] | null
    const directionParam = searchParams.get("sort_direction")
    const direction: JobApplicationSort["direction"] = directionParam === "asc" ? "asc" : "desc"

    return {
      field: fieldParam ?? defaultSort.field,
      direction,
    }
  }, [searchParams])

  const pageFromParams = useMemo(() => {
    const value = Number.parseInt(searchParams.get("page") ?? "1", 10)
    return Number.isNaN(value) || value < 1 ? 1 : value
  }, [searchParams])

  const [filters, setFilters] = useState<JobApplicationFilters>(filtersFromParams)
  const [sort, setSort] = useState<JobApplicationSort>(sortFromParams)
  const [page, setPage] = useState(pageFromParams)
  const [selectedApplications, setSelectedApplications] = useState<string[]>([])

  useEffect(() => {
    setFilters((previous) => {
      if (serializeFilters(previous) === serializeFilters(filtersFromParams)) {
        return previous
      }
      return filtersFromParams
    })
  }, [filtersFromParams])

  useEffect(() => {
    setSort((previous) => {
      if (previous.field === sortFromParams.field && previous.direction === sortFromParams.direction) {
        return previous
      }
      return sortFromParams
    })
  }, [sortFromParams])

  useEffect(() => {
    setPage((previous) => (previous === pageFromParams ? previous : pageFromParams))
  }, [pageFromParams])

  const commitState = useCallback(
    (next?: {
      filters?: JobApplicationFilters
      sort?: JobApplicationSort
      page?: number
    }) => {
      const nextFilters = next?.filters ?? filters
      const nextSort = next?.sort ?? sort
      const nextPage = next?.page ?? page

      const params = createSearchParamsWithFilters(searchParams, nextFilters)

      params.delete("sort_field")
      params.delete("sort_direction")
      params.delete("page")

      if (nextSort.field && nextSort.field !== defaultSort.field) {
        params.set("sort_field", nextSort.field)
      }
      if (nextSort.direction && nextSort.direction !== defaultSort.direction) {
        params.set("sort_direction", nextSort.direction)
      }
      if (nextPage > 1) {
        params.set("page", nextPage.toString())
      }

      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [filters, sort, page, pathname, router, searchParams],
  )

  const { applications, isLoading, error, mutate } = useJobApplications({
    page,
    limit: 10,
    filters,
    sort,
    include_interviews: true,
  })

  const handleFilterChange = (newFilters: JobApplicationFilters) => {
    setFilters(newFilters)
    setPage(1)
    commitState({ filters: newFilters, page: 1 })
  }

  const handleApplicationUpdate = () => {
    mutate() // Refresh data after updates
  }

  const handleSelectApplication = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedApplications([...selectedApplications, id])
    } else {
      setSelectedApplications(selectedApplications.filter((appId) => appId !== id))
    }
  }

  const handleBulkStatusUpdate = async (status: string) => {
    try {
      const response = await fetch("/api/job-applications/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedApplications,
          updates: { status },
        }),
      })

      if (response.ok) {
        setSelectedApplications([])
        mutate()
      }
    } catch (error) {
      console.error("Failed to bulk update applications:", error)
    }
  }

  const handleBulkDelete = async () => {
    try {
      const response = await fetch("/api/job-applications/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedApplications,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to bulk delete applications")
      }

      setSelectedApplications([])
      mutate()
    } catch (error) {
      console.error("Failed to bulk delete applications:", error)
      throw error
    }
  }

  const handleBulkExport = () => {
    const selectedApps = applications.filter((app) => selectedApplications.includes(app.id))
    const csvContent = [
      ["Company", "Position", "Status", "Application Date", "Location", "Salary Range", "Notes"].join(","),
      ...selectedApps.map((app) =>
        [
          app.company_name,
          app.position_title,
          app.status,
          app.application_date,
          app.location || "",
          app.salary_range || "",
          (app.notes || "").replace(/,/g, ";"),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `job-applications-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <p className="text-destructive">Error loading applications. Please try again.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-balance">Job Applications</h2>
              <p className="text-muted-foreground text-pretty">Track and manage your job application pipeline</p>
            </div>
          </div>

          <StatsOverview />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <QuickActions onApplicationAdded={handleApplicationUpdate} />
              <UpcomingInterviews />
              <ActivityTimeline />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <aside className="lg:w-64 flex-shrink-0">
                  <ApplicationFilters filters={filters} onFiltersChange={handleFilterChange} />
                </aside>

                <div className="flex-1 space-y-4 pb-24">
                  <BulkActions
                    selectedCount={selectedApplications.length}
                    onBulkStatusUpdate={handleBulkStatusUpdate}
                    onBulkDelete={handleBulkDelete}
                    onBulkExport={handleBulkExport}
                    onClearSelection={() => setSelectedApplications([])}
                  />

                  {isLoading ? (
                    <div className="grid gap-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {applications.map((application) => (
                        <JobApplicationCard
                          key={application.id}
                          application={application}
                          isSelected={selectedApplications.includes(application.id)}
                          onSelect={(selected) => handleSelectApplication(application.id, selected)}
                          onUpdate={handleApplicationUpdate}
                        />
                      ))}
                      {applications.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            No applications found. Add your first application to get started!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}