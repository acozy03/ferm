"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  LayoutPanelLeft,
  ListChecks,
  Table2,
} from "lucide-react"

import { Header } from "@/components/header"
import { JobApplicationCard } from "@/components/job-application-card"
import { StatsOverview } from "@/components/stats-overview"
import { ApplicationFilters } from "@/components/application-filters"
import { ActivityTimeline } from "@/components/activity-timeline"
import { QuickActions } from "@/components/quick-actions"
import { UpcomingInterviews } from "@/components/upcoming-interviews"
import { BulkActions } from "@/components/bulk-actions"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ApplicationsDrawer } from "@/components/applications-drawer"
import { useJobApplications } from "@/lib/hooks/use-job-applications"
import { createSearchParamsWithFilters, parseJobApplicationFilters } from "@/lib/job-filters"
import type { JobApplication, JobApplicationFilters, JobApplicationSort } from "@/lib/types/database"
import { useSettings } from "@/components/settings-provider"
import { JobDetailsDialog } from "@/components/job-details-dialog"
import { StatusUpdateDialog } from "@/components/status-update-dialog"
import { defaultViewOptions } from "@/lib/settings"
import { cn } from "@/lib/utils"

const serializeFilters = (filters: JobApplicationFilters) =>
  createSearchParamsWithFilters(new URLSearchParams(), filters).toString()

const FALLBACK_SORT: JobApplicationSort = { field: "created_at", direction: "desc" }
const sortPreferenceMap: Record<string, JobApplicationSort> = {
  recent: FALLBACK_SORT,
  upcoming: { field: "application_date", direction: "asc" },
  priority: { field: "priority", direction: "asc" },
}
const DASHBOARD_PAGE_SIZE = 5

type DashboardView = (typeof defaultViewOptions)[number]["value"]

const isDashboardView = (value: string | null): value is DashboardView =>
  defaultViewOptions.some((option) => option.value === value)

const statusBadges: Record<JobApplication["status"], string> = {
  Applied: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Interview: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Offer: "bg-green-500/10 text-green-500 border-green-500/20",
  Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  Withdrawn: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  Accepted: "bg-purple-500/10 text-purple-500 border-purple-500/20",
}

const INTERACTIVE_ELEMENT_SELECTOR =
  "button, a, [role='button'], input, textarea, select, [data-prevent-selection-toggle='true']"

export default function Dashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { settings } = useSettings()

  const preferredView = useMemo<DashboardView>(() => settings.defaultView as DashboardView, [settings.defaultView])

  const filtersFromParams = useMemo(() => parseJobApplicationFilters(searchParams), [searchParams])

  const preferredSort = useMemo<JobApplicationSort>(() => {
    return sortPreferenceMap[settings.defaultSort] ?? FALLBACK_SORT
  }, [settings.defaultSort])

  const viewFromParams = useMemo<DashboardView>(() => {
    const viewParam = searchParams.get("view")
    if (isDashboardView(viewParam)) {
      return viewParam
    }
    return preferredView
  }, [preferredView, searchParams])

  const sortFromParams = useMemo<JobApplicationSort>(() => {
    const fieldParam = searchParams.get("sort_field") as JobApplicationSort["field"] | null
    const directionParam = searchParams.get("sort_direction")
    const hasSortParams = Boolean(fieldParam) || Boolean(directionParam)

    if (hasSortParams) {
      const direction: JobApplicationSort["direction"] = directionParam === "asc" ? "asc" : "desc"

      return {
        field: fieldParam ?? preferredSort.field,
        direction,
      }
    }

    return preferredSort
  }, [preferredSort, searchParams])

  const pageFromParams = useMemo(() => {
    const value = Number.parseInt(searchParams.get("page") ?? "1", 10)
    return Number.isNaN(value) || value < 1 ? 1 : value
  }, [searchParams])

  const [filters, setFilters] = useState<JobApplicationFilters>(filtersFromParams)
  const [sort, setSort] = useState<JobApplicationSort>(sortFromParams)
  const [page, setPage] = useState(pageFromParams)
  const [selectedApplications, setSelectedApplications] = useState<string[]>([])
  const [isApplicationsDrawerOpen, setIsApplicationsDrawerOpen] = useState(false)
  const [view, setView] = useState<DashboardView>(viewFromParams)

  useEffect(() => {
    setFilters((previous) => {
      if (serializeFilters(previous) === serializeFilters(filtersFromParams)) {
        return previous
      }
      return filtersFromParams
    })
  }, [filtersFromParams])

  useEffect(() => {
    setView((previous) => (previous === viewFromParams ? previous : viewFromParams))
  }, [viewFromParams])

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
      view?: DashboardView
    }) => {
      const nextFilters = next?.filters ?? filters
      const nextSort = next?.sort ?? sort
      const nextPage = next?.page ?? page
      const nextView = next?.view ?? view

      const params = createSearchParamsWithFilters(searchParams, nextFilters)

      params.delete("sort_field")
      params.delete("sort_direction")
      params.delete("page")
      params.delete("view")

      const isSortFieldDefault = nextSort.field === preferredSort.field
      const isSortDirectionDefault = nextSort.direction === preferredSort.direction
      const isViewDefault = nextView === preferredView

      if (!isSortFieldDefault) {
        params.set("sort_field", nextSort.field)
      }
      if (!isSortDirectionDefault || !isSortFieldDefault) {
        params.set("sort_direction", nextSort.direction)
      }
      if (nextPage > 1) {
        params.set("page", nextPage.toString())
      }
      if (!isViewDefault) {
        params.set("view", nextView)
      }

      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [filters, sort, page, view, pathname, preferredSort, preferredView, router, searchParams],
  )

  const { applications, isLoading, error, mutate, count, total_pages: totalPagesFromResponse } = useJobApplications({
    page,
    limit: DASHBOARD_PAGE_SIZE,
    filters,
    sort,
    include_interviews: true,
  })

  const timelineDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: settings.timezone,
      }),
    [settings.timezone],
  )

  const timelineItems = useMemo(() => {
    return [...applications].sort(
      (a, b) => new Date(a.application_date).getTime() - new Date(b.application_date).getTime(),
    )
  }, [applications])

  const relativeDayFormatter = useMemo(() => new Intl.RelativeTimeFormat("en", { numeric: "auto" }), [])

  const formatDaysSinceApplied = useCallback(
    (dateString: string) => {
      const appliedDate = new Date(dateString)
      const now = new Date()
      const millisecondsInDay = 1000 * 60 * 60 * 24
      const diff = Math.round((appliedDate.getTime() - now.getTime()) / millisecondsInDay)

      if (diff === 0) {
        return "Today"
      }

      return relativeDayFormatter.format(diff, "day")
    },
    [relativeDayFormatter],
  )

  const totalPages = Math.max(1, totalPagesFromResponse || 1)
  const canGoPrevious = page > 1
  const canGoNext = page < totalPages

  const handleFilterChange = (newFilters: JobApplicationFilters) => {
    setFilters(newFilters)
    setPage(1)
    commitState({ filters: newFilters, page: 1 })
  }

  const handleViewChange = (nextView: DashboardView) => {
    if (nextView === view) {
      return
    }

    setView(nextView)
    setPage(1)
    setSelectedApplications([])
    commitState({ view: nextView, page: 1 })
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

  const handleStatusChange = async (applicationId: string, status: string, note?: string) => {
    try {
      const response = await fetch(`/api/job-applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(note && { notes: note }),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update application status")
      }

      mutate()
    } catch (error) {
      console.error("Failed to update application status:", error)
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

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) {
      return
    }

    setPage(nextPage)
    setSelectedApplications([])
    commitState({ page: nextPage })
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
                  <Tabs
                    value={view}
                    onValueChange={(next) => {
                      if (isDashboardView(next)) {
                        handleViewChange(next)
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <TabsList>
                        <TabsTrigger value="pipeline" className="gap-2">
                          <LayoutPanelLeft className="h-4 w-4" />
                          Pipeline
                        </TabsTrigger>
                        <TabsTrigger value="table" className="gap-2">
                          <Table2 className="h-4 w-4" />
                          Table
                        </TabsTrigger>
                        <TabsTrigger value="timeline" className="gap-2">
                          <CalendarClock className="h-4 w-4" />
                          Timeline
                        </TabsTrigger>
                      </TabsList>
                      <p className="text-sm text-muted-foreground">
                        Choose how you want to review your applications.
                      </p>
                    </div>

                    <TabsContent value="pipeline" className="space-y-4">
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
                    </TabsContent>

                    <TabsContent value="table" className="space-y-4">
                      <BulkActions
                        selectedCount={selectedApplications.length}
                        onBulkStatusUpdate={handleBulkStatusUpdate}
                        onBulkDelete={handleBulkDelete}
                        onBulkExport={handleBulkExport}
                        onClearSelection={() => setSelectedApplications([])}
                      />

                      {isLoading ? (
                        <div className="space-y-2">
                          {[...Array(4)].map((_, index) => (
                            <div key={index} className="h-12 rounded-md border bg-muted animate-pulse" />
                          ))}
                        </div>
                      ) : applications.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            No applications found. Adjust your filters or add a new application.
                          </p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Role</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Priority</TableHead>
                              <TableHead>Applied</TableHead>
                              <TableHead className="hidden lg:table-cell">Location</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {applications.map((application) => {
                              const isSelected = selectedApplications.includes(application.id)
                              return (
                                <TableRow
                                  key={application.id}
                                  data-state={isSelected ? "selected" : undefined}
                                  className={cn(
                                    "cursor-pointer transition-colors hover:bg-accent/50",
                                    isSelected && "bg-muted",
                                  )}
                                  onClick={(event) => {
                                    if (event.defaultPrevented) return

                                    const target = event.target as HTMLElement
                                    if (target.closest(INTERACTIVE_ELEMENT_SELECTOR)) {
                                      return
                                    }

                                    handleSelectApplication(application.id, !isSelected)
                                  }}
                                >
                                  <TableCell>
                                    <div className="space-y-1">
                                      <p className="font-medium leading-tight text-sm text-balance">
                                        {application.position_title}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{application.company_name}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={statusBadges[application.status]}>
                                      {application.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{application.priority}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">
                                        {timelineDateFormatter.format(new Date(application.application_date))}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDaysSinceApplied(application.application_date)}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    {application.location ? (
                                      <span className="text-sm">{application.location}</span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <StatusUpdateDialog
                                        currentStatus={application.status}
                                        onStatusUpdate={(status, note) =>
                                          handleStatusChange(application.id, status, note)
                                        }
                                        trigger={
                                          <Button variant="secondary" size="sm" className="h-8 px-3">
                                            Update
                                          </Button>
                                        }
                                      />
                                      <JobDetailsDialog
                                        application={application}
                                        onUpdate={handleApplicationUpdate}
                                        trigger={
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-3 border-primary/50 text-primary"
                                          >
                                            Details
                                          </Button>
                                        }
                                      />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>

                    <TabsContent value="timeline" className="space-y-6">
                      <BulkActions
                        selectedCount={selectedApplications.length}
                        onBulkStatusUpdate={handleBulkStatusUpdate}
                        onBulkDelete={handleBulkDelete}
                        onBulkExport={handleBulkExport}
                        onClearSelection={() => setSelectedApplications([])}
                      />

                      {isLoading ? (
                        <div className="space-y-4">
                          {[...Array(4)].map((_, index) => (
                            <div key={index} className="h-20 rounded-md border bg-muted animate-pulse" />
                          ))}
                        </div>
                      ) : timelineItems.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">
                            No applications to display yet. Apply to a role to start your timeline.
                          </p>
                        </div>
                      ) : (
                        <div className="relative space-y-6">
                          <div className="absolute left-1.5 top-0 h-full w-px bg-border" aria-hidden />
                          {timelineItems.map((application) => {
                            const isSelected = selectedApplications.includes(application.id)

                            return (
                              <div key={application.id} className="relative pl-6">
                                <span className="absolute left-0 top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-background bg-primary" />
                                <div
                                  className={cn(
                                    "flex flex-col gap-2 rounded-lg border bg-card/50 p-4 transition-colors hover:bg-accent/50",
                                    isSelected && "border-primary/40 bg-muted",
                                  )}
                                  onClick={(event) => {
                                    if (event.defaultPrevented) return

                                    const target = event.target as HTMLElement
                                    if (target.closest(INTERACTIVE_ELEMENT_SELECTOR)) {
                                      return
                                    }

                                    handleSelectApplication(application.id, !isSelected)
                                  }}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="font-medium leading-tight text-balance">
                                        {application.position_title}
                                    </p>
                                    <p className="text-sm text-muted-foreground text-pretty">
                                      {application.company_name}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className={statusBadges[application.status]}>
                                    {application.status}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <span>
                                    Applied {timelineDateFormatter.format(new Date(application.application_date))}
                                  </span>
                                  <span>•</span>
                                  <span>{formatDaysSinceApplied(application.application_date)}</span>
                                  {application.location && <span>• {application.location}</span>}
                                </div>
                                  {application.notes && (
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                      {application.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      {isLoading
                        ? "Loading applications..."
                        : `Showing ${applications.length > 0 ? (page - 1) * DASHBOARD_PAGE_SIZE + 1 : 0}-${
                            (page - 1) * DASHBOARD_PAGE_SIZE + applications.length
                          } of ${count} applications`}
                    </p>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={!canGoPrevious || isLoading}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="sr-only">Previous page</span>
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Page {totalPages === 0 ? 1 : page} of {totalPages || 1}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handlePageChange(page + 1)}
                          disabled={!canGoNext || isLoading}
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only">Next page</span>
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => setIsApplicationsDrawerOpen(true)}
                      >
                        <ListChecks className="h-4 w-4" />
                        Open application library
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ApplicationsDrawer
        open={isApplicationsDrawerOpen}
        onOpenChange={setIsApplicationsDrawerOpen}
        filters={filters}
        sort={sort}
        onApplicationUpdate={handleApplicationUpdate}
        onFiltersChange={handleFilterChange}
      />
    </div>
  )
}