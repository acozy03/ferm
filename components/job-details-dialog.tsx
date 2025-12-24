"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import {
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  Briefcase,
  Tag,
  Link as LinkIcon,
  User,
  Mail,
  Info,
  CalendarRange
} from "lucide-react"
import type { JobApplication as DbJobApplication } from "@/lib/types/database"
import { formatStatusLabel } from "@/lib/status"
import { getDateOrNull } from "@/lib/date"

type JobDetailsDialogProps = {
  application: DbJobApplication
  onUpdate: () => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function JobDetailsDialog({
  application,
  trigger,
  onUpdate,
  open: controlledOpen,
  onOpenChange,
}: JobDetailsDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = typeof controlledOpen === "boolean" && typeof onOpenChange === "function"
  const dialogOpen = isControlled ? controlledOpen : uncontrolledOpen
  const handleOpenChange = (nextOpen: boolean) => {
    if (isControlled) {
      onOpenChange(nextOpen)
    } else {
      setUncontrolledOpen(nextOpen)
    }
  }

  const jobDescription = application.job_description?.trim() ? application.job_description : null
  const qualifications = application.qualifications?.trim() ? application.qualifications : null
  const responsibilities = application.job_responsibilities?.trim()
    ? application.job_responsibilities
    : null

  const qualificationLines = qualifications
    ? qualifications.split("\n").map((line) => line.trim()).filter(Boolean)
    : []
  const responsibilityLines = responsibilities
    ? responsibilities.split("\n").map((line) => line.trim()).filter(Boolean)
    : []
  const hasStructuredSections = Boolean(jobDescription || qualificationLines.length > 0 || responsibilityLines.length > 0)

  const formatDate = (dateString: string) => {
    const parsed = getDateOrNull(dateString)
    if (!parsed) {
      return "Date unavailable"
    }
    return parsed.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const computedDaysSinceApplied = (() => {
    const appliedDate = getDateOrNull(application.application_date)
    if (!appliedDate) {
      return null
    }
    return Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24))
  })()

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl truncate max-w-[35rem]"title={application.position_title}>{application.position_title}</DialogTitle>
            <h3 className="text-lg font-medium truncate max-w-[35rem]" title={application.company_name}>{application.company_name}</h3>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Applied:</span>
                <span className="truncate">{(application.application_date)}</span>
              </div>
              {application.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Location:</span>
                  <span>{application.location}</span>
                </div>
              )}
              {application.salary_range && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Salary:</span>
                  <span>{application.salary_range}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Employment Type:</span>
                <span>{application.employment_type}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <span>{formatStatusLabel(application.status)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Priority:</span>
                <span>{application.priority}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarRange className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Days since applied:</span>
                <span>
                  {computedDaysSinceApplied != null ? `${computedDaysSinceApplied} days` : "Date unavailable"}
                </span>
              </div>
              {application.contact_person && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Contact:</span>
                  <span>{application.contact_person}</span>
                </div>
              )}
              {application.contact_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Contact Email:</span>
                  <a
                    href={`mailto:${application.contact_email}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {application.contact_email}
                  </a>
                </div>
              )}
              {application.job_url && (
                <div className="flex items-center gap-2 text-sm">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Job Posting:</span>
                  <a
                    href={application.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline underline-offset-4 "
                  >
                    View listing
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {hasStructuredSections ? (
            <>
              <div className="space-y-6">
                {jobDescription ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground">Job Description</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{jobDescription}</p>
                  </div>
                ) : null}
                {qualificationLines.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground">Qualifications</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {qualificationLines.map((line, index) => (
                        <li key={`${line}-${index}`}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {responsibilityLines.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground">Responsibilities</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {responsibilityLines.map((line, index) => (
                        <li key={`${line}-${index}`}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <Separator />
            </>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Notes</Label>
              </div>
            </div>

            <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md break-words max-w-[39rem]">
              {application.notes || "No notes added yet."}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
