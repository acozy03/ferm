"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Upload, Download, BarChart3, Settings, FileText } from "lucide-react"
import { AddApplicationDialog } from "@/components/add-application-dialog"
import { ImportApplicationsDialog } from "@/components/import-applications-dialog"
import { SettingsDialog } from "@/components/settings-dialog"
import type { CreateJobApplicationData, JobApplication } from "@/lib/types/database"
import type { PaginatedResponse } from "@/lib/types/api"

interface QuickActionsProps {
  onApplicationAdded?: () => void
}

export function QuickActions({ onApplicationAdded }: QuickActionsProps) {
  const handleAddApplication = async (application: CreateJobApplicationData) => {
    try {
      const response = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(application),
      })

      if (response.ok && onApplicationAdded) {
        onApplicationAdded()
      }
    } catch (error) {
      console.error("Failed to add application:", error)
    }
  }

  const handleImportApplications = async (applications: CreateJobApplicationData[]) => {
    try {
      const promises = applications.map((app) =>
        fetch("/api/job-applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(app),
        }),
      )

      await Promise.all(promises)

      if (onApplicationAdded) {
        onApplicationAdded()
      }
    } catch (error) {
      console.error("Failed to import applications:", error)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch("/api/job-applications?limit=1000")
      const result: PaginatedResponse<JobApplication> = await response.json()

      // Convert to CSV
      const csvContent = convertToCSV(result.data)
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = `job-applications-${new Date().toISOString().split("T")[0]}.csv`
      a.click()

      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export applications:", error)
    }
  }

  const convertToCSV = (data: JobApplication[]) => {
    if (data.length === 0) return ""

    const headers = Object.keys(data[0]).join(",")
    const rows = data.map((row) =>
      Object.values(row)
        .map((value) => {
          if (typeof value === "string") {
            return value.includes(",") ? `"${value}"` : value
          }
          if (value === null || value === undefined) {
            return ""
          }
          return String(value)
        })
        .join(","),
    )

    return [headers, ...rows].join("\n")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <AddApplicationDialog
            onAdd={handleAddApplication}
            trigger={
              <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                <span className="text-xs">Add Application</span>
              </Button>
            }
          />
          <ImportApplicationsDialog
            onImport={handleImportApplications}
            trigger={
              <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2 bg-transparent">
                <Upload className="h-4 w-4" />
                <span className="text-xs">Import Data</span>
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            className="h-auto p-3 flex flex-col gap-2 bg-transparent"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            <span className="text-xs">Export CSV</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2 bg-transparent">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs">Analytics</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2 bg-transparent">
            <FileText className="h-4 w-4" />
            <span className="text-xs">Templates</span>
          </Button>
          <SettingsDialog
            trigger={
              <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2 bg-transparent">
                <Settings className="h-4 w-4" />
                <span className="text-xs">Settings</span>
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
