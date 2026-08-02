"use client"
import { useEffect, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, X } from "lucide-react"
import type { JobApplicationFilters, Priority } from "@/lib/types/database"
import { formatStatusFilterLabel, STATUS_STAGE_FILTER_OPTIONS } from "@/lib/status"
import type { PipelineStage } from "@/lib/status"

interface ApplicationFiltersProps {
  filters: JobApplicationFilters
  onFiltersChange: (filters: JobApplicationFilters) => void
}

export function ApplicationFilters({ filters, onFiltersChange }: ApplicationFiltersProps) {
  const [statusBuilder, setStatusBuilder] = useState<PipelineStage | undefined>(undefined)
  const priorityOptions: Priority[] = ["Low", "Medium", "High"]

  useEffect(() => {
    if ((filters.status ?? []).length === 0) {
      setStatusBuilder(undefined)
    }
  }, [filters.status])

  const handleStatusAdd = (status: string) => {
    const currentStatuses = filters.status ?? []
    if (currentStatuses.includes(status)) {
      return
    }

    const nextStatuses = [...currentStatuses, status]

    onFiltersChange({
      ...filters,
      status: nextStatuses,
    })
  }

  const handleStatusRemove = (status: string) => {
    const currentStatuses = filters.status ?? []
    const nextStatuses = currentStatuses.filter((item) => item !== status)

    onFiltersChange({
      ...filters,
      status: nextStatuses.length > 0 ? nextStatuses : undefined,
    })
  }

  const handlePriorityToggle = (priority: Priority) => {
    const currentPriorities = filters.priority || []
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter((p) => p !== priority)
      : [...currentPriorities, priority]

    onFiltersChange({
      ...filters,
      priority: newPriorities.length > 0 ? newPriorities : undefined,
    })
  }

  const handleCompanySearch = (company: string) => {
    onFiltersChange({
      ...filters,
      company_name: company || undefined,
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({})
    setStatusBuilder(undefined)
  }

  const removeFilter = (type: string, value: string) => {
    if (type === "status") {
      const newStatuses = (filters.status || []).filter((s) => s !== value)
      onFiltersChange({
        ...filters,
        status: newStatuses.length > 0 ? newStatuses : undefined,
      })
    } else if (type === "priority") {
      const newPriorities = (filters.priority || []).filter((p) => p !== value)
      onFiltersChange({
        ...filters,
        priority: newPriorities.length > 0 ? newPriorities : undefined,
      })
    } else if (type === "company") {
      onFiltersChange({
        ...filters,
        company_name: undefined,
      })
    }
  }

  const activeFilters = [
    ...(filters.status || []).map((s) => ({ type: "status", value: s, label: formatStatusFilterLabel(s) })),
    ...(filters.priority || []).map((p) => ({ type: "priority", value: p, label: `${p} Priority` })),
    ...(filters.company_name
      ? [{ type: "company", value: filters.company_name, label: `Company: ${filters.company_name}` }]
      : []),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-3">Status</h4>
          <div className="space-y-3">
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
            {(filters.status || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(filters.status || []).map((status) => (
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

        <Separator />

        <div>
          <h4 className="text-sm font-medium mb-3">Priority</h4>
          <div className="space-y-2">
            {priorityOptions.map((priority) => (
              <Button
                key={priority}
                variant={(filters.priority || []).includes(priority) ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start h-8"
                onClick={() => handlePriorityToggle(priority)}
              >
                <span>{priority}</span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-medium mb-3">Company</h4>
          <input
            type="text"
            placeholder="Search companies..."
            value={filters.company_name || ""}
            onChange={(e) => handleCompanySearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>

        {activeFilters.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Active Filters</h4>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {filter.label}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter(filter.type, filter.value)} />
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full bg-transparent"
          onClick={clearAllFilters}
          disabled={activeFilters.length === 0}
        >
          Clear All Filters
        </Button>
      </CardContent>
    </Card>
  )
}
