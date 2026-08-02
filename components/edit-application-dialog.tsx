"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon } from "lucide-react"
import { format, parseISO } from "date-fns"
import type {
  EmploymentType,
  JobApplication,
  JobApplicationStatus,
  JobApplicationWithStatusHistory,
  Priority,
} from "@/lib/types/database"
import { SequentialStatusSelect } from "@/components/status-select"
import { apiFetch } from "@/lib/fetcher"
import { cn } from "@/lib/utils"

interface EditApplicationDialogProps {
  application: JobApplication & Partial<Pick<JobApplicationWithStatusHistory, "status_history">>
  onUpdate: () => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EditApplicationDialog({
  application,
  onUpdate,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: EditApplicationDialogProps) {
  const mapApplicationToFormData = (jobApplication: JobApplication) => ({
    company_name: jobApplication.company_name,
    position_title: jobApplication.position_title,
    status: jobApplication.status as JobApplicationStatus, // explicitly type as JobApplicationStatus
    application_date: jobApplication.application_date.split("T")[0],
    location: jobApplication.location || "",
    salary_range: jobApplication.salary_range || "",
    job_url: jobApplication.job_url || "",
    contact_person: jobApplication.contact_person || "",
    contact_email: jobApplication.contact_email || "",
    notes: jobApplication.notes || "",
    job_description: jobApplication.job_description || "",
    qualifications: jobApplication.qualifications || "",
    job_responsibilities: jobApplication.job_responsibilities || "",
    employment_type: jobApplication.employment_type as EmploymentType,
    priority: jobApplication.priority as Priority,
  })

  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState(mapApplicationToFormData(application))
  const [initialFormData, setInitialFormData] = useState(mapApplicationToFormData(application))

  const isControlled = typeof controlledOpen === "boolean" && typeof onOpenChange === "function"
  const dialogOpen = isControlled ? controlledOpen : open
  const setDialogOpen = (nextOpen: boolean) => {
    if (isControlled) {
      onOpenChange(nextOpen)
    } else {
      setOpen(nextOpen)
    }
  }

  useEffect(() => {
    if (dialogOpen) {
      const nextFormData = mapApplicationToFormData(application)
      setFormData(nextFormData)
      setInitialFormData(nextFormData)
    }
  }, [dialogOpen, application])

  const hasChanges = Object.keys(formData).some((key) => {
    const typedKey = key as keyof typeof formData
    return formData[typedKey] !== initialFormData[typedKey]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasChanges) return
    setIsLoading(true)

    try {
      const toNullable = (value: string) => {
        const trimmed = value.trim()
        return trimmed === "" ? null : trimmed
      }

      const payload = {
        ...formData,
        location: toNullable(formData.location),
        salary_range: toNullable(formData.salary_range),
        job_url: toNullable(formData.job_url),
        contact_person: toNullable(formData.contact_person),
        contact_email: toNullable(formData.contact_email),
        notes: toNullable(formData.notes),
        job_description: toNullable(formData.job_description),
        qualifications: toNullable(formData.qualifications),
        job_responsibilities: toNullable(formData.job_responsibilities),
      }

      const response = await apiFetch(`/api/job-applications/${application.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        onUpdate()
        setDialogOpen(false)
      }
    } catch (error) {
      console.error("Failed to update application:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Application</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="truncate"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position_title">Position Title *</Label>
              <Input
                id="position_title"
                value={formData.position_title}
                onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                className="truncate"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:gap-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
              <Label htmlFor="status" className="whitespace-nowrap">
                Status
              </Label>
              <SequentialStatusSelect
                id="status"
                value={formData.status}
                onChange={(status) => setFormData({ ...formData, status })}
                statusHistory={application.status_history}
                triggerClassName="w-full md:w-40"
              />
            </div>
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
              <Label htmlFor="priority" className="whitespace-nowrap">
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as Priority })}
              >
                <SelectTrigger id="priority" className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
              <Label htmlFor="employment_type" className="whitespace-nowrap">
                Employment Type
              </Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value) => setFormData({ ...formData, employment_type: value as EmploymentType })}
              >
                <SelectTrigger id="employment_type" className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employmentTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Applied Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-transparent")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.application_date ? format(parseISO(formData.application_date), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.application_date ? parseISO(formData.application_date) : undefined}
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        application_date: date ? format(date, "yyyy-MM-dd") : "",
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="truncate"
                placeholder="e.g. Remote, San Francisco, CA"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary_range">Salary Range</Label>
              <Input
                id="salary_range"
                value={formData.salary_range}
                onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                className="truncate"
                placeholder="e.g. $120k - $160k"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_url">Job URL</Label>
              <Input
                id="job_url"
                type="url"
                value={formData.job_url}
                onChange={(e) => setFormData({ ...formData, job_url: e.target.value })}
                className="truncate"
                placeholder="https://company.com/careers/job-id"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Name</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="truncate"
                placeholder="e.g. Sarah Johnson"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="truncate"
                placeholder="recruiter@company.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job_description">Job Description</Label>
            <Textarea
              id="job_description"
              value={formData.job_description}
              onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
              placeholder="Summary of the role, responsibilities, and context..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications</Label>
              <Textarea
                id="qualifications"
                value={formData.qualifications}
                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                placeholder="Required skills, experience, or qualifications..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_responsibilities">Job Responsibilities</Label>
              <Textarea
                id="job_responsibilities"
                value={formData.job_responsibilities}
                onChange={(e) => setFormData({ ...formData, job_responsibilities: e.target.value })}
                placeholder="Key responsibilities or day-to-day expectations..."
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes about this application, interview details, or follow-up actions..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" className="flex-1" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading || !hasChanges}>
              {isLoading ? "Updating..." : "Update Application"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const priorityOptions: { value: Priority; label: string }[] = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
]

const employmentTypeOptions: { value: EmploymentType; label: string }[] = [
  { value: "Full-time", label: "Full-time" },
  { value: "Part-time", label: "Part-time" },
  { value: "Contract", label: "Contract" },
  { value: "Internship", label: "Internship" },
]
