export type InterviewRoundStatus = `Interview Round ${number}`
export type GhostedStatus = `Ghosted After Round ${number}`
export type OfferStatus = `Offer After Round ${number}`
export type RejectedStatus = `Rejected After Round ${number}`
export type LegacyStatus = "Interview" | "Offer" | "Rejected" | "Ghosted"
export type JobApplicationStatus =
  | "Applied"
  | "Withdrawn"
  | "Accepted"
  | InterviewRoundStatus
  | GhostedStatus
  | OfferStatus
  | RejectedStatus
  | LegacyStatus
export type Priority = "Low" | "Medium" | "High"
export type EmploymentType = "Full-time" | "Part-time" | "Contract" | "Internship"
export type InterviewType = "Phone" | "Video" | "In-person" | "Technical" | "Final"
export type InterviewStatus = "Scheduled" | "Completed" | "Cancelled" | "Rescheduled"
export type ActivityType =
  | "application_created"
  | "status_change"
  | "notes_update"
  | "interview_scheduled"
  | "interview_completed"

export interface JobApplication {
  id: string
  user_id: string
  company_name: string
  position_title: string
  job_url?: string | null
  location?: string | null
  salary_range?: string | null
  employment_type: EmploymentType
  status: JobApplicationStatus
  priority: Priority
  application_date: string
  notes?: string | null
  contact_person?: string | null
  contact_email?: string | null
  job_description?: string | null
  qualifications?: string | null
  job_responsibilities?: string | null
  resume_match_score?: number | null
  resume_match_summary?: string | null
  created_at: string
  updated_at: string
}

export interface JobApplicationStatusHistory {
  id: string
  job_application_id: string
  user_id: string
  status: JobApplicationStatus
  changed_at: string
}

export interface Interview {
  id: string
  user_id: string
  job_application_id: string
  interview_type: InterviewType
  scheduled_date: string
  duration_minutes: number
  interviewer_name?: string
  interviewer_email?: string
  notes?: string
  status: InterviewStatus
  created_at: string
  updated_at: string
}

export interface InterviewWithApplication extends Interview {
  job_applications?: Pick<JobApplication, "company_name" | "position_title">
}

export interface ActivityLog {
  id: string
  user_id: string
  job_application_id: string | null
  job_application_reference?: string | null
  job_company_snapshot?: string | null
  job_position_snapshot?: string | null
  action_type: ActivityType
  description: string
  old_value?: string | null
  new_value?: string | null
  created_at: string
}

export interface ActivityLogWithApplication extends ActivityLog {
  job_applications?: Pick<JobApplication, "company_name" | "position_title"> | null
}

// Extended types with relations
export interface JobApplicationWithInterviews extends JobApplication {
  interviews: Interview[]
}

export interface JobApplicationWithStatusHistory extends JobApplication {
  status_history: JobApplicationStatusHistory[]
}

export interface JobApplicationWithActivity extends JobApplication {
  activity_log: ActivityLog[]
}

export interface JobApplicationFull extends JobApplication {
  interviews: Interview[]
  activity_log: ActivityLog[]
  status_history: JobApplicationStatusHistory[]
}

export interface ApplicationFollowUp {
  id: string
  user_id: string
  job_application_id: string
  enabled: boolean
  interval_days: number
  next_follow_up_date: string | null
  last_notified_at?: string | null
  created_at: string
  updated_at: string
}

// Form types for creating/updating
export interface CreateJobApplicationData {
  company_name: string
  position_title: string
  job_url?: string | null
  location?: string | null
  salary_range?: string | null
  employment_type?: EmploymentType
  status?: JobApplicationStatus
  priority?: Priority
  application_date?: string
  notes?: string | null
  contact_person?: string | null
  contact_email?: string | null
  job_description?: string | null
  qualifications?: string | null
  job_responsibilities?: string | null
}

export interface UpdateJobApplicationData extends Partial<CreateJobApplicationData> {
  id: string
}

export interface CreateInterviewData {
  job_application_id: string
  interview_type: InterviewType
  scheduled_date: string
  duration_minutes?: number
  interviewer_name?: string
  interviewer_email?: string
  notes?: string
  status?: InterviewStatus
}

export interface UpdateInterviewData extends Partial<CreateInterviewData> {
  id: string
}

// Dashboard stats type
export interface DashboardStats {
  total_applications: number
  applied: number
  interviews: number
  offers: number
  accepted: number
  rejected: number
  ghosted: number
  withdrawn: number
  upcoming_interviews: number
  response_rate: number
}

// Filter and sort types
export interface JobApplicationFilters {
  status?: (JobApplicationStatus | string)[]
  priority?: Priority[]
  employment_type?: EmploymentType[]
  company_name?: string
  search?: string
  date_from?: string
  date_to?: string
}

export interface JobApplicationSort {
  field: keyof JobApplication
  direction: "asc" | "desc"
}

