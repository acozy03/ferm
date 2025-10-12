"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus } from "lucide-react"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CreateJobApplicationData, Priority, EmploymentType } from "@/lib/types/database"
import { SequentialStatusSelect } from "@/components/status-select"

interface AddApplicationDialogProps {
  trigger?: React.ReactNode
  onAdd: (application: CreateJobApplicationData) => void
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
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<CreateJobApplicationData & { appliedDate: Date | undefined }>({
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const toNullable = (value: string) => {
      const trimmed = value.trim()
      return trimmed === "" ? null : trimmed
    }

    if (formData.company_name && formData.position_title && formData.appliedDate) {
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
      console.log(applicationData)
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
      setOpen(false)
    }
  }

  const updateFormData = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Application
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                value={formData.position_title}
                onChange={(e) => updateFormData("position_title", e.target.value)}
                placeholder="e.g. Frontend Engineer, Full Stack Developer"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <SequentialStatusSelect
                id="status"
                value={formData.status}
                onChange={(status) => updateFormData("status", status)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => updateFormData("priority", value)}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="employment_type">Employment Type</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value) => updateFormData("employment_type", value)}
              >
                <SelectTrigger>
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
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.appliedDate ? format(formData.appliedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.appliedDate}
                    onSelect={(date) => updateFormData("appliedDate", date)}
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
                onChange={(e) => updateFormData("location", e.target.value)}
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
                placeholder="e.g. $120k - $160k"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobUrl">Job Posting URL</Label>
              <Input
                id="jobUrl"
                type="url"
                value={formData.job_url}
                onChange={(e) => updateFormData("job_url", e.target.value)}
                placeholder="https://company.com/careers/job-id"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                value={formData.contact_person}
                onChange={(e) => updateFormData("contact_person", e.target.value)}
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Application</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
