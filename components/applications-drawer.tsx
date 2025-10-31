"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"
import { Filter, Search, X } from "lucide-react"

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { JobApplicationFilters, JobApplicationSort, Priority } from "@/lib/types/database"
import {
  formatStatusFilterLabel,
  STATUS_STAGE_FILTER_OPTIONS,
} from "@/lib/status"
import type { PipelineStage } from "@/lib/status"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type SortOption = {
  value: string
  label: string
  sort: JobApplicationSort
}

type FilterChip =
  | { type: "status"; value: string; label: string }
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
  onFiltersChange: (filters: JobApplicationFilters) => void
  onSortChange: (sort: JobApplicationSort) => void
}

const priorityOptions: Priority[] = ["Low", "Medium", "High"]
const sortOptions: SortOption[] = [
  { value: "created_at:desc", label: "Recently added", sort: { field: "created_at", direction: "desc" } },
  { value: "created_at:asc", label: "Oldest added", sort: { field: "created_at", direction: "asc" } },
  { value: "updated_at:desc", label: "Recently updated", sort: { field: "updated_at", direction: "desc" } },
  { value: "updated_at:asc", label: "Least recently updated", sort: { field: "updated_at", direction: "asc" } },
  {
    value: "application_date:desc",
    label: "Most recent application date",
    sort: { field: "application_date", direction: "desc" },
  },
  {
    value: "application_date:asc",
    label: "Oldest application date",
    sort: { field: "application_date", direction: "asc" },
  },
  { value: "priority:desc", label: "Priority (High to Low)", sort: { field: "priority", direction: "desc" } },
  { value: "priority:asc", label: "Priority (Low to High)", sort: { field: "priority", direction: "asc" } },
  { value: "company_name:asc", label: "Company name (A–Z)", sort: { field: "company_name", direction: "asc" } },
]

export function ApplicationsDrawer({
  open,
  onOpenChange,
  filters,
  sort,
  onFiltersChange,
  onSortChange,
}: ApplicationsDrawerProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search ?? "")
  const [statusBuilder, setStatusBuilder] = useState<PipelineStage | undefined>(undefined)

  const trimmedSearch = useMemo(() => searchTerm.trim(), [searchTerm])
  const selectedSortValue = useMemo(() => {
    const key = `${sort.field}:${sort.direction}`
    return sortOptions.some((option) => option.value === key) ? key : sortOptions[0]?.value ?? ""
  }, [sort.direction, sort.field])

  useEffect(() => {
    if (!open) {
      return
    }

    setSearchTerm(filters.search ?? "")
  }, [open, filters.search])

  useEffect(() => {
    if ((filters.status ?? []).length === 0) {
      setStatusBuilder(undefined)
    }
  }, [filters.status])

  const activeFilters = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = []

    for (const status of filters.status ?? []) {
      chips.push({ type: "status", value: status, label: formatStatusFilterLabel(status) })
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

    const trimmed = value.trim()
    const normalized = trimmed.length > 0 ? trimmed : undefined

    onFiltersChange({
      ...filters,
      search: normalized,
    })
  }

  const clearSearch = () => {
    setSearchTerm("")
    onFiltersChange({
      ...filters,
      search: undefined,
    })
  }

  const handleStatusAdd = (status: string) => {
    const current = filters.status ?? []
    if (current.includes(status)) {
      return
    }

    const nextStatuses = [...current, status]

    onFiltersChange({
      ...filters,
      status: nextStatuses,
    })
  }

  const handleStatusRemove = (status: string) => {
    const current = filters.status ?? []
    const nextStatuses = current.filter((item) => item !== status)

    onFiltersChange({
      ...filters,
      status: nextStatuses.length > 0 ? nextStatuses : undefined,
    })
  }

  const handlePriorityToggle = (priority: Priority) => {
    const current = filters.priority ?? []
    const exists = current.includes(priority)
    const nextPriorities = exists ? current.filter((item) => item !== priority) : [...current, priority]

    onFiltersChange({
      ...filters,
      priority: nextPriorities.length > 0 ? nextPriorities : undefined,
    })
  }

  const handleCompanyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    const cleaned = value.trim()

    onFiltersChange({
      ...filters,
      company_name: cleaned.length > 0 ? cleaned : undefined,
    })
  }

  const handleDateChange = (key: "date_from" | "date_to") => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value

    onFiltersChange({
      ...filters,
      [key]: value.length > 0 ? value : undefined,
    })
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    onFiltersChange({})
    setStatusBuilder(undefined)
  }

  const handleRemoveFilter = (chip: FilterChip) => {
    if (chip.type === "status") {
      handleStatusRemove(chip.value)
      return
    }

    if (chip.type === "priority") {
      const current = filters.priority ?? []
      if (current.includes(chip.value)) {
        handlePriorityToggle(chip.value)
      }
      return
    }

    if (chip.type === "company_name") {
      onFiltersChange({
        ...filters,
        company_name: undefined,
      })
      return
    }

    if (chip.type === "date_from") {
      onFiltersChange({
        ...filters,
        date_from: undefined,
      })
      return
    }

    if (chip.type === "date_to") {
      onFiltersChange({
        ...filters,
        date_to: undefined,
      })
      return
    }

    if (chip.type === "search") {
      clearSearch()
    }
  }

  const handleSortSelect = (value: string) => {
    const option = sortOptions.find((item) => item.value === value)
    if (!option) {
      return
    }

    onSortChange(option.sort)
  }

  const hasActiveFilters = activeFilters.length > 0

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent position="right" className="sm:max-w-4xl">
        <DrawerHeader className="relative pb-2 pr-12 sm:pr-16">
          <DrawerTitle>Application library</DrawerTitle>
          <DrawerDescription>
            Adjust filters and sorting to tailor which applications appear on your dashboard.
          </DrawerDescription>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close applications drawer</span>
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="border-t">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-4">
              <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                <div className="relative w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Search applications..."
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

                <div className="flex flex-col gap-1 lg:w-64">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sort applications
                  </span>
                  <Select value={selectedSortValue} onValueChange={handleSortSelect}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              </div>

              {hasActiveFilters ? (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((chip) => (
                    <Badge key={`${chip.type}:${chip.value}`} variant="secondary" asChild>
                      <button type="button" className="flex items-center gap-1" onClick={() => handleRemoveFilter(chip)}>
                        {chip.label}
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {chip.label}</span>
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6 pb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-2 space-y-3">
                    <Select value={statusBuilder} onValueChange={(next) => setStatusBuilder(next as PipelineStage)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_STAGE_FILTER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => statusBuilder && handleStatusAdd(statusBuilder)}
                        disabled={!statusBuilder}
                      >
                        Add status filter
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusBuilder(undefined)}
                        disabled={!statusBuilder}
                      >
                        Reset selection
                      </Button>
                    </div>
                    {(filters.status ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {(filters.status ?? []).map((status) => (
                          <Badge key={status} variant="secondary" className="gap-1">
                            {formatStatusFilterLabel(status)}
                            <button
                              type="button"
                              onClick={() => handleStatusRemove(status)}
                              className="rounded-full p-0.5 hover:bg-muted"
                              aria-label={`Remove ${formatStatusFilterLabel(status)}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : null}
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
            </ScrollArea>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
