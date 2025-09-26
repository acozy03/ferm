export type JobApplicationStatus = "Applied" | "Interview" | "Offer" | "Rejected" | "Withdrawn" | "Accepted"
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
  job_url?: string
  location?: string
  salary_range?: string
  employment_type: EmploymentType
  status: JobApplicationStatus
  priority: Priority
  application_date: string
  notes?: string
  contact_person?: string
  contact_email?: string
  created_at: string
  updated_at: string
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

export interface JobApplicationWithActivity extends JobApplication {
  activity_log: ActivityLog[]
}

export interface JobApplicationFull extends JobApplication {
  interviews: Interview[]
  activity_log: ActivityLog[]
}

// Form types for creating/updating
export interface CreateJobApplicationData {
  company_name: string
  position_title: string
  job_url?: string
  location?: string
  salary_range?: string
  employment_type?: EmploymentType
  status?: JobApplicationStatus
  priority?: Priority
  application_date?: string
  notes?: string
  contact_person?: string
  contact_email?: string
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
  withdrawn: number
  upcoming_interviews: number
  response_rate: number
}

// Filter and sort types
export interface JobApplicationFilters {
  status?: JobApplicationStatus[]
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

