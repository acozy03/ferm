"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Filter, Search, X } from "lucide-react"

import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type {
  JobApplicationFilters,
  JobApplicationSort,
  JobApplicationStatus,
  Priority,
} from "@/lib/types/database"
import { useJobApplications } from "@/lib/hooks/use-job-applications"
import { JobApplicationCard } from "@/components/job-application-card"

type FilterChip =
  | { type: "status"; value: JobApplicationStatus; label: string }
  | { type: "priority"; value: Priority; label: string }
  | { type: "company_name"; value: string; label: string }
  | { type: "date_from"; value: string; label: string }
  | { type: "date_to"; value: string; label: string }
  | { type: "search"; value: string; label: string }

type ApplicationsDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: JobApplicationFilters
  sort: JobApplicationSort
  onApplicationUpdate: () => void
  onFiltersChange: (filters: JobApplicationFilters) => void
}

const DRAWER_PAGE_SIZE = 12
const statusOptions: JobApplicationStatus[] = ["Applied", "Interview", "Offer", "Accepted", "Rejected", "Withdrawn"]
const priorityOptions: Priority[] = ["Low", "Medium", "High"]

export function ApplicationsDrawer({
  open,
  onOpenChange,
  filters,
  sort,
  onApplicationUpdate,
  onFiltersChange,
}: ApplicationsDrawerProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search ?? "")
  const [page, setPage] = useState(1)

  const trimmedSearch = useMemo(() => searchTerm.trim(), [searchTerm])

  useEffect(() => {
    if (!open) {
      return
    }

    setSearchTerm(filters.search ?? "")
    setPage(1)
  }, [open, filters.search])

  const filterSignature = useMemo(
    () =>
      JSON.stringify({
        status: filters.status,
        priority: filters.priority,
        company_name: filters.company_name,
        date_from: filters.date_from,
        date_to: filters.date_to,
      }),
    [filters.company_name, filters.date_from, filters.date_to, filters.priority, filters.status],
  )

  useEffect(() => {
    if (!open) {
      return
    }

    setPage(1)
  }, [open, filterSignature])

  const combinedFilters: JobApplicationFilters = {
    ...filters,
    search: trimmedSearch.length > 0 ? trimmedSearch : undefined,
  }

  const { applications, isLoading, count, total_pages } = useJobApplications({
    page,
    limit: DRAWER_PAGE_SIZE,
    filters: combinedFilters,
    sort,
    include_interviews: true,
  })

  const totalPages = total_pages || 1
  const isEmpty = !isLoading && applications.length === 0

  const activeFilters = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = []

    for (const status of filters.status ?? []) {
      chips.push({ type: "status", value: status, label: status })
    }

    for (const priority of filters.priority ?? []) {
      chips.push({ type: "priority", value: priority, label: `${priority} priority` })
    }

    if (filters.company_name) {
      chips.push({
        type: "company_name",
        value: filters.company_name,
        label: `Company: ${filters.company_name}`,
      })
    }

    if (filters.date_from) {
      chips.push({ type: "date_from", value: filters.date_from, label: `From ${filters.date_from}` })
    }

    if (filters.date_to) {
      chips.push({ type: "date_to", value: filters.date_to, label: `Through ${filters.date_to}` })
    }

    if (trimmedSearch.length > 0) {
      chips.push({ type: "search", value: trimmedSearch, label: `Search: ${trimmedSearch}` })
    }

    return chips
  }, [filters, trimmedSearch])

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearchTerm(value)

    setPage(1)
  }

  const clearSearch = () => {
    setSearchTerm("")
    setPage(1)
  }

  const handleStatusToggle = (status: JobApplicationStatus) => {
    const current = filters.status ?? []
    const exists = current.includes(status)
    const nextStatuses = exists ? current.filter((item) => item !== status) : [...current, status]

    onFiltersChange({
      ...filters,
      status: nextStatuses.length > 0 ? nextStatuses : undefined,
    })
    setPage(1)
  }

  const handlePriorityToggle = (priority: Priority) => {
    const current = filters.priority ?? []
    const exists = current.includes(priority)
    const nextPriorities = exists ? current.filter((item) => item !== priority) : [...current, priority]

    onFiltersChange({
      ...filters,
      priority: nextPriorities.length > 0 ? nextPriorities : undefined,
    })
    setPage(1)
  }

  const handleCompanyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    const cleaned = value.trim()

    onFiltersChange({
      ...filters,
      company_name: cleaned.length > 0 ? cleaned : undefined,
    })
    setPage(1)
  }

  const handleDateChange = (key: "date_from" | "date_to") => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value

    onFiltersChange({
      ...filters,
      [key]: value.length > 0 ? value : undefined,
    })
    setPage(1)
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    onFiltersChange({})
    setPage(1)
  }

  const handleRemoveFilter = (chip: FilterChip) => {
    if (chip.type === "status") {
      const remaining = (filters.status ?? []).filter((status) => status !== chip.value)
      onFiltersChange({
        ...filters,
        status: remaining.length > 0 ? remaining : undefined,
      })
    } else if (chip.type === "priority") {
      const remaining = (filters.priority ?? []).filter((priority) => priority !== chip.value)
      onFiltersChange({
        ...filters,
        priority: remaining.length > 0 ? remaining : undefined,
      })
    } else if (chip.type === "company_name") {
      onFiltersChange({
        ...filters,
        company_name: undefined,
      })
    } else if (chip.type === "date_from") {
      onFiltersChange({
        ...filters,
        date_from: undefined,
      })
    } else if (chip.type === "date_to") {
      onFiltersChange({
        ...filters,
        date_to: undefined,
      })
    } else if (chip.type === "search") {
      setSearchTerm("")
    }

    setPage(1)
  }

  const goToPreviousPage = () => {
    setPage((current) => (current > 1 ? current - 1 : current))
  }

  const goToNextPage = () => {
    setPage((current) => (current < (total_pages || 1) ? current + 1 : current))
  }

  const hasActiveFilters = activeFilters.length > 0

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent position="right" className="sm:max-w-4xl">
        <DrawerHeader className="pb-2">
          <DrawerTitle>Application library</DrawerTitle>
          <DrawerDescription>
            Browse, search, and update any application without leaving your dashboard.
          </DrawerDescription>
        </DrawerHeader>

        <div className="border-t">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search applications by role, company, notes, and more"
                  className="pl-9 pr-10"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear search</span>
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{count} total applications</span>
                <span aria-hidden>�</span>
                <span>
                  Page {page} of {totalPages}
                </span>
              </div>
            </div>

            <div className="rounded-lg border bg-background/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Filter className="h-4 w-4" />
                  Refine results
                  {hasActiveFilters ? (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilters.length}
                    </Badge>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  disabled={!hasActiveFilters}
                >
                  Clear filters
                </Button>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {statusOptions.map((status) => {
                      const isActive = (filters.status ?? []).includes(status)

                      return (
                        <Button
                          key={status}
                          type="button"
                          variant={isActive ? "secondary" : "outline"}
                          size="sm"
                          className="justify-start"
                          onClick={() => handleStatusToggle(status)}
                        >
                          {status}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {priorityOptions.map((priority) => {
                      const isActive = (filters.priority ?? []).includes(priority)

                      return (
                        <Button
                          key={priority}
                          type="button"
                          variant={isActive ? "secondary" : "outline"}
                          size="sm"
                          className="justify-start"
                          onClick={() => handlePriorityToggle(priority)}
                        >
                          {priority}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company</p>
                  <Input
                    value={filters.company_name ?? ""}
                    onChange={handleCompanyChange}
                    placeholder="Filter by company name"
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">From</p>
                    <Input
                      type="date"
                      value={filters.date_from ?? ""}
                      onChange={handleDateChange("date_from")}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">To</p>
                    <Input
                      type="date"
                      value={filters.date_to ?? ""}
                      onChange={handleDateChange("date_to")}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {hasActiveFilters ? (
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((chip) => (
                  <Badge key={`${chip.type}:${chip.value}`} variant="secondary" asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1"
                      onClick={() => handleRemoveFilter(chip)}
                    >
                      {chip.label}
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {chip.label}</span>
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}

            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-36 animate-pulse rounded-lg border bg-muted/40" />
                  ))
                ) : isEmpty ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
                    <div>
                      <p className="font-medium">No applications match these filters</p>
                      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        Adjust your filters or reset them to see more results.
                      </p>
                    </div>
                    {hasActiveFilters ? (
                      <Button type="button" variant="outline" size="sm" onClick={clearAllFilters}>
                        Reset filters
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  applications.map((application) => (
                    <JobApplicationCard
                      key={application.id}
                      application={application}
                      onUpdate={onApplicationUpdate}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousPage}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={goToNextPage}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

