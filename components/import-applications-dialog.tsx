"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, AlertCircle } from "lucide-react"
import type { CreateJobApplicationData } from "@/lib/types/database"

interface ImportApplicationsDialogProps {
  trigger: React.ReactNode
  onImport: (applications: CreateJobApplicationData[]) => void
}

export function ImportApplicationsDialog({ trigger, onImport }: ImportApplicationsDialogProps) {
  const [open, setOpen] = useState(false)
  const [csvData, setCsvData] = useState("")
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<CreateJobApplicationData[]>([])

  const sampleCsv = `Company,Position,Status,Applied Date,Location,Salary Range,Employment Type,Priority,Notes,Job URL,Contact Person,Contact Email
Vercel,Frontend Engineer,Applied,2024-01-15,Remote,$120k - $160k,Full-time,High,Applied through careers page,https://vercel.com/careers,Sarah Johnson,sarah@vercel.com
Linear,Full Stack Developer,Interview,2024-01-10,San Francisco CA,$140k - $180k,Full-time,Medium,Phone screen scheduled,https://linear.app/careers,Mike Chen,mike@linear.app`

  const parseCsv = (csvText: string) => {
    try {
      const lines = csvText.trim().split("\n")
      if (lines.length < 2) {
        throw new Error("CSV must have at least a header row and one data row")
      }

      const headers = lines[0].split(",").map((h) => h.trim())
      const requiredHeaders = ["Company", "Position", "Applied Date"]
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`)
      }

      const applications = lines.slice(1).map((line, index) => {
        const values = line.split(",").map((v) => v.trim())
        const record: Record<string, string> = {}

        headers.forEach((header, i) => {
          const key = header.toLowerCase().replace(/\s+/g, "_")
          record[key] = values[i] ?? ""
        })

        // Validate required fields
        if (!record.company || !record.position) {
          throw new Error(`Row ${index + 2}: Company and Position are required`)
        }

        const applicationData: CreateJobApplicationData = {
          company_name: record.company,
          position_title: record.position,
          status: record.status || "Applied",
          application_date: record.applied_date || new Date().toISOString().split("T")[0],
          location: record.location || undefined,
          salary_range: record.salary_range || record.salary || undefined,
          employment_type: (record.employment_type as CreateJobApplicationData["employment_type"]) || "Full-time",
          priority: (record.priority as CreateJobApplicationData["priority"]) || "Medium",
          notes: record.notes || undefined,
          job_url: record.job_url || undefined,
          contact_person: record.contact_person || undefined,
          contact_email: record.contact_email || undefined,
        }

        return applicationData
      })

      return applications
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to parse CSV")
    }
  }

  const handlePreview = () => {
    try {
      setError("")
      const applications = parseCsv(csvData)
      setPreview(applications.slice(0, 3)) // Show first 3 for preview
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV")
      setPreview([])
    }
  }

  const handleImport = () => {
    try {
      setError("")
      const applications = parseCsv(csvData)
      onImport(applications)
      setCsvData("")
      setPreview([])
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import applications")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Applications from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Upload a CSV file with columns: Company, Position, Status, Applied Date, Location, Salary Range,
              Employment Type, Priority, Notes, Job URL, Contact Person, Contact Email. Company, Position, and Applied
              Date are required.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="csv-data">CSV Data</Label>
            <Textarea
              id="csv-data"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder={sampleCsv}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview} disabled={!csvData.trim()}>
              Preview
            </Button>
            <Button onClick={handleImport} disabled={!csvData.trim() || preview.length === 0}>
              Import {preview.length > 0 && `(${parseCsv(csvData).length} applications)`}
            </Button>
          </div>

          {preview.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Preview (showing first 3 applications):</h4>
              <div className="space-y-2">
                {preview.map((app, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-muted/50">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <strong>{app.company_name}</strong> - {app.position_title}
                      </div>
                      <div>Status: {app.status}</div>
                      <div>Applied: {app.application_date}</div>
                      <div>Location: {app.location || "Not specified"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
