"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { JobApplication, JobApplicationStatus } from "@/lib/types/database"

interface EditApplicationDialogProps {
  application: JobApplication
  onUpdate: () => void
  trigger: React.ReactNode
}

const statusOptions = [
  { value: "Applied", label: "Applied" },
  { value: "Interview", label: "Interview" },
  { value: "Rejected", label: "Rejected" },
  { value: "Offer", label: "Offer" },
  { value: "Accepted", label: "Accepted" },
  { value: "Withdrawn", label: "Withdrawn" },
] as const

export function EditApplicationDialog({ application, onUpdate, trigger }: EditApplicationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    company_name: application.company_name,
    position_title: application.position_title,
    status: application.status as JobApplicationStatus, // explicitly type as JobApplicationStatus
    application_date: application.application_date.split("T")[0],
    location: application.location || "",
    salary_range: application.salary_range || "",
    job_url: application.job_url || "",
    contact_person: application.contact_person || "",
    contact_email: application.contact_email || "",
    notes: application.notes || "",
  })

  useEffect(() => {
    if (open) {
      setFormData({
        company_name: application.company_name,
        position_title: application.position_title,
        status: application.status as JobApplicationStatus, // explicitly type as JobApplicationStatus
        application_date: application.application_date.split("T")[0],
        location: application.location || "",
        salary_range: application.salary_range || "",
        job_url: application.job_url || "",
        contact_person: application.contact_person || "",
        contact_email: application.contact_email || "",
        notes: application.notes || "",
      })
    }
  }, [open, application])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/job-applications/${application.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onUpdate()
        setOpen(false)
      }
    } catch (error) {
      console.error("Failed to update application:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Application</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position_title">Position Title *</Label>
              <Input
                id="position_title"
                value={formData.position_title}
                onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: JobApplicationStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="application_date">Application Date</Label>
              <Input
                id="application_date"
                type="date"
                value={formData.application_date}
                onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Remote, San Francisco, CA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_range">Salary Range</Label>
              <Input
                id="salary_range"
                value={formData.salary_range}
                onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                placeholder="e.g. $120k - $160k"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job_url">Job URL</Label>
            <Input
              id="job_url"
              type="url"
              value={formData.job_url}
              onChange={(e) => setFormData({ ...formData, job_url: e.target.value })}
              placeholder="https://company.com/careers/job-id"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Name</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
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
                placeholder="recruiter@company.com"
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Application"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
