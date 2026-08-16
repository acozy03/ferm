"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Info, CalendarIcon, Loader2, Plus } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CreateJobApplicationData, Priority, EmploymentType } from "@/lib/types/database"
import { SequentialStatusSelect } from "@/components/status-select"
import { useSupabase } from "@/components/supabase-provider"
import { apiFetch } from "@/lib/fetcher"
import { cn } from "@/lib/utils"

interface AddApplicationDialogProps {
  trigger?: React.ReactNode
  onAdd: (application: CreateJobApplicationData) => void
}

type AddApplicationFormData = {
  [Field in Exclude<keyof CreateJobApplicationData, "application_date">]-?: NonNullable<CreateJobApplicationData[Field]>
} & { appliedDate: Date | undefined }

type ParsedJobResponse = {
  is_valid_job_posting?: boolean
  reason?: string | null
  company_name?: string | null
  position_title?: string | null
  location?: string | null
  salary_range?: string | null
  employment_type?: EmploymentType | null
  contact_person?: string | null
  contact_email?: string | null
  job_description?: string | null
  qualifications?: string | null
  job_responsibilities?: string | null
  error?: string
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

export function AddApplicationDialog({ trigger, onAdd }: AddApplicationDialogProps) {
  const { session } = useSupabase()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<AddApplicationFormData>({
    company_name: "",
    position_title: "",
    status: "Applied",
    appliedDate: new Date(),
    location: "",
    salary_range: "",
    employment_type: "Full-time",
    priority: "Medium",
    notes: "",
    job_url: "",
    contact_email: "",
    contact_person: "",
    job_description: "",
    qualifications: "",
    job_responsibilities: "",
  })
  const [isAutofilling, setIsAutofilling] = useState(false)
  const [autofillStatus, setAutofillStatus] = useState<"idle" | "success" | "error">("idle")
  const [autofillMessage, setAutofillMessage] = useState<string | null>(null)
  const [autofillUsage, setAutofillUsage] = useState<{ limit: number | null; remaining: number | null }>({
    limit: null,
    remaining: null,
  })
  const [lastAutofilledUrl, setLastAutofilledUrl] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<{
    company_name?: string
    position_title?: string
    appliedDate?: string
  }>({})
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (lastAutofilledUrl && formData.job_url !== lastAutofilledUrl) {
      setAutofillStatus("idle")
      setAutofillMessage(null)
    }
  }, [formData.job_url, lastAutofilledUrl])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: typeof formErrors = {}

    if (!formData.company_name.trim()) {
      newErrors.company_name = "Add a company"
    }

    if (!formData.position_title.trim()) {
      newErrors.position_title = "Add a position"
    }

    if (!formData.appliedDate) {
      newErrors.appliedDate = "Pick a date"
    }

    setFormErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      setFormErrorMessage("")
      return
    }

    setFormErrorMessage(null)

    const toNullable = (value: string) => {
      const trimmed = value.trim()
      return trimmed === "" ? null : trimmed
    }

    if (!formData.appliedDate) return

    const applicationData: CreateJobApplicationData = {
      company_name: formData.company_name,
      position_title: formData.position_title,
      status: formData.status,
      application_date: format(formData.appliedDate, "yyyy-MM-dd"),
      location: toNullable(formData.location),
      salary_range: toNullable(formData.salary_range),
      employment_type: formData.employment_type,
      priority: formData.priority,
      notes: toNullable(formData.notes),
      job_url: toNullable(formData.job_url),
      contact_email: toNullable(formData.contact_email),
      contact_person: toNullable(formData.contact_person),
      job_description: toNullable(formData.job_description),
      qualifications: toNullable(formData.qualifications),
      job_responsibilities: toNullable(formData.job_responsibilities),
    }
    onAdd(applicationData)
    setFormData({
      company_name: "",
      position_title: "",
      status: "Applied",
      appliedDate: new Date(),
      location: "",
      salary_range: "",
      employment_type: "Full-time",
      priority: "Medium",
      notes: "",
      job_url: "",
      contact_email: "",
      contact_person: "",
      job_description: "",
      qualifications: "",
      job_responsibilities: "",
    })
    setFormErrors({})
    setFormErrorMessage(null)
    handleDialogChange(false)
  }

  const updateFormData = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => {
      if (field === "company_name" || field === "position_title" || field === "appliedDate") {
        return { ...prev, [field]: undefined }
      }
      return prev
    })
    setFormErrorMessage(null)
  }

  const handleAutofillFromUrl = async () => {
    const trimmedUrl = formData.job_url.trim()

    if (!trimmedUrl) {
      setAutofillStatus("error")
      setAutofillMessage("Add a job posting URL first.")
      return
    }

    if (trimmedUrl !== formData.job_url) {
      updateFormData("job_url", trimmedUrl)
    }

    if (!session?.access_token) {
      setAutofillStatus("error")
      setAutofillMessage("You need to be signed in to scan a job posting.")
      return
    }

    setIsAutofilling(true)
    setAutofillStatus("idle")
    setAutofillMessage(null)
    setAutofillUsage({ limit: null, remaining: null })

    try {
      const response = await apiFetch("/api/scrape-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ job_url: trimmedUrl }),
      })

      const parseHeaderNumber = (value: string | null) => {
        if (!value) return null
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
      }

      const usageInfo = {
        limit: parseHeaderNumber(response.headers.get("X-Usage-Limit")),
        remaining: parseHeaderNumber(response.headers.get("X-Usage-Remaining")),
      }
      setAutofillUsage(usageInfo)

      let dataRaw: unknown
      try {
        dataRaw = await response.json()
      } catch {
        throw new Error("Unexpected response from the server.")
      }

      const data: ParsedJobResponse =
        typeof dataRaw === "object" && dataRaw !== null ? (dataRaw as ParsedJobResponse) : {}

      if (!response.ok) {
        setAutofillStatus("error")
        setAutofillMessage(
          typeof data.error === "string" && data.error.length > 0 ? data.error : "Failed to analyze the job posting.",
        )
        setLastAutofilledUrl(trimmedUrl)
        return
      }

      if (!data.is_valid_job_posting) {
        setAutofillStatus("error")
        setAutofillMessage(
          typeof data.reason === "string" && data.reason.length > 0
            ? data.reason
            : "We couldn't detect a job posting at that URL.",
        )
        setLastAutofilledUrl(trimmedUrl)
        return
      }

      setFormData((prev) => {
        const next = { ...prev }
        const apply = <K extends keyof typeof prev>(key: K, value: string | null) => {
          if (!value) return
          const normalized = value.trim()
          if (!normalized) return
          next[key] = normalized as (typeof prev)[K]
        }

        apply("company_name", data.company_name ?? null)
        apply("position_title", data.position_title ?? null)
        apply("location", data.location ?? null)
        apply("salary_range", data.salary_range ?? null)
        apply("contact_person", data.contact_person ?? null)
        apply("contact_email", data.contact_email ?? null)
        apply("job_description", data.job_description ?? null)
        apply("qualifications", data.qualifications ?? null)
        apply("job_responsibilities", data.job_responsibilities ?? null)

        if (data.employment_type) {
          next.employment_type = data.employment_type
        }

        return next
      })

      setAutofillStatus("success")
      setAutofillMessage("Job posting details imported. Review and confirm before saving.")
      setLastAutofilledUrl(trimmedUrl)
    } catch (error) {
      setAutofillStatus("error")
      setAutofillMessage(error instanceof Error ? error.message : "Failed to analyze the job posting.")
      setLastAutofilledUrl(trimmedUrl)
    } finally {
      setIsAutofilling(false)
    }
  }

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setFormErrors({})
      setFormErrorMessage(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Application
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add New Job Application</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={formData.company_name}
                onChange={(e) => updateFormData("company_name", e.target.value)}
                placeholder="e.g. Vercel, Linear, Stripe"
                className={cn(
                  "truncate",
                  formErrors.company_name && "border-destructive focus-visible:ring-destructive",
                )}
              />
              {formErrors.company_name ? <p className="text-sm text-destructive">{formErrors.company_name}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                value={formData.position_title}
                onChange={(e) => updateFormData("position_title", e.target.value)}
                placeholder="e.g. Frontend Engineer, Full Stack Developer"
                className={cn(
                  "truncate",
                  formErrors.position_title && "border-destructive focus-visible:ring-destructive",
                )}
              />
              {formErrors.position_title ? (
                <p className="text-sm text-destructive">{formErrors.position_title}</p>
              ) : null}
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
                onChange={(status) => updateFormData("status", status)}
                triggerClassName="w-full md:w-40"
              />
            </div>
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
              <Label htmlFor="priority" className="whitespace-nowrap">
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => updateFormData("priority", value as Priority)}
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
                onValueChange={(value) => updateFormData("employment_type", value as EmploymentType)}
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
              <Label>Applied Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-transparent",
                      formErrors.appliedDate && "border-destructive focus-visible:ring-destructive",
                    )}
                    onClick={() => setFormErrors((prev) => ({ ...prev, appliedDate: undefined }))}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.appliedDate ? format(formData.appliedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.appliedDate}
                    onSelect={(date) => updateFormData("appliedDate", date)}
                  />
                </PopoverContent>
              </Popover>
              {formErrors.appliedDate ? <p className="text-sm text-destructive">{formErrors.appliedDate}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => updateFormData("location", e.target.value)}
                className="truncate"
                placeholder="e.g. Remote, San Francisco, CA"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Salary Range</Label>
              <Input
                id="salary"
                value={formData.salary_range}
                onChange={(e) => updateFormData("salary_range", e.target.value)}
                className="truncate"
                placeholder="e.g. $120k - $160k"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="jobUrl">Job Posting URL</Label>

                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Job URL autofill info"
                      >
                        <Info className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Some sites load job details after page load. If Autofill looks incomplete or returns something
                      like &apos;closed job&apos; or &apos;filled position&apos;, you should use the Chrome extension
                      for the most reliable import :)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-start gap-2">
                <Input
                  id="jobUrl"
                  type="url"
                  value={formData.job_url}
                  onChange={(e) => updateFormData("job_url", e.target.value)}
                  placeholder="https://company.com/careers/job-id"
                  className="flex-1 truncate"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAutofillFromUrl}
                  disabled={isAutofilling || !formData.job_url.trim()}
                  className="gap-2"
                >
                  {isAutofilling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning…
                    </>
                  ) : (
                    "Autofill"
                  )}
                </Button>
              </div>
              {autofillStatus === "success" && autofillMessage && (
                <p className="text-xs text-muted-foreground">{autofillMessage}</p>
              )}
              {autofillStatus === "error" && autofillMessage && (
                <p className="text-xs text-destructive">{autofillMessage}</p>
              )}
              {autofillStatus !== "idle" && autofillUsage.limit != null && autofillUsage.remaining != null && (
                <p className="text-xs text-muted-foreground">
                  Used {autofillUsage.limit - autofillUsage.remaining} of {autofillUsage.limit} quick adds today.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                value={formData.contact_person}
                onChange={(e) => updateFormData("contact_person", e.target.value)}
                className="truncate"
                placeholder="e.g. Sarah Johnson"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contact_email}
                onChange={(e) => updateFormData("contact_email", e.target.value)}
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
              onChange={(e) => updateFormData("job_description", e.target.value)}
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
                onChange={(e) => updateFormData("qualifications", e.target.value)}
                placeholder="Required skills, experience, or qualifications..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_responsibilities">Job Responsibilities</Label>
              <Textarea
                id="job_responsibilities"
                value={formData.job_responsibilities}
                onChange={(e) => updateFormData("job_responsibilities", e.target.value)}
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
              onChange={(e) => updateFormData("notes", e.target.value)}
              placeholder="Add any notes about this application, interview details, or follow-up actions..."
              rows={4}
            />
          </div>

          {formErrorMessage ? <p className="text-sm text-destructive">{formErrorMessage}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" className="flex-1" variant="outline" onClick={() => handleDialogChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Application
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
