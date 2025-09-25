"use client"

import { useMemo } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Mail, NotebookPen } from "lucide-react"

import { useJobApplications } from "@/lib/hooks/use-job-applications"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

interface CompanySummary {
  name: string
  location?: string
  primaryContact?: string
  primaryEmail?: string
  roles: Set<string>
  statuses: Set<string>
  latestUpdate: number
  followUpDue: boolean
}

export default function CompaniesPage() {
  const { applications, isLoading, error } = useJobApplications({ limit: 200 })

  const companies = useMemo(() => {
    const map = new Map<string, CompanySummary>()

    applications.forEach((application) => {
      const updatedAt = new Date(application.updated_at).getTime()
      const safeUpdatedAt = Number.isNaN(updatedAt) ? Date.now() : updatedAt
      const existing = map.get(application.company_name) ?? {
        name: application.company_name,
        location: application.location || undefined,
        primaryContact: application.contact_person || undefined,
        primaryEmail: application.contact_email || undefined,
        roles: new Set<string>(),
        statuses: new Set<string>(),
        latestUpdate: safeUpdatedAt,
        followUpDue: false,
      }

      if (!existing.location && application.location) {
        existing.location = application.location
      }
      if (!existing.primaryContact && application.contact_person) {
        existing.primaryContact = application.contact_person
      }
      if (!existing.primaryEmail && application.contact_email) {
        existing.primaryEmail = application.contact_email
      }

      existing.roles.add(application.position_title)
      existing.statuses.add(application.status)
      existing.latestUpdate = Math.max(existing.latestUpdate, safeUpdatedAt)

      if (application.status === "Applied") {
        const appliedAt = new Date(application.application_date).getTime()
        if (!Number.isNaN(appliedAt) && Date.now() - appliedAt > SEVEN_DAYS_MS) {
          existing.followUpDue = true
        }
      }

      map.set(application.company_name, existing)
    })

    return Array.from(map.values()).sort((a, b) => b.latestUpdate - a.latestUpdate)
  }, [applications])

  const activeProspects = companies.filter((company) => {
    const inactiveStatuses = ["Rejected", "Withdrawn", "Accepted"]
    return Array.from(company.statuses).some((status) => !inactiveStatuses.includes(status))
  }).length

  const warmContacts = companies.filter((company) => Boolean(company.primaryEmail || company.primaryContact)).length
  const followUpsDue = companies.filter((company) => company.followUpDue).length

  const playbookItems = useMemo(() => {
    return companies
      .filter((company) => company.followUpDue)
      .slice(0, 3)
      .map((company) => ({
        company: company.name,
        contact: company.primaryEmail || company.primaryContact,
      }))
  }, [companies])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold">Companies overview</h1>
            <p className="text-muted-foreground text-pretty">
              Track every organisation in your network, who you know there, and where conversations are headed next.
            </p>
          </header>

          <section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  label: "Active prospects",
                  value: activeProspects,
                  helper: "Companies with at least one open conversation",
                },
                {
                  label: "Warm contacts",
                  value: warmContacts,
                  helper: "Organisations with a saved contact",
                },
                {
                  label: "Follow-ups due",
                  value: followUpsDue,
                  helper: "Applications awaiting an update",
                },
              ].map((item) => (
                <Card key={item.label}>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-semibold">{item.value}</div>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">{item.helper}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[3fr,2fr]">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Partner directory</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                ) : companies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add an application to populate your company directory.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Primary contact</TableHead>
                        <TableHead>Role focus</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company) => (
                        <TableRow key={company.name}>
                          <TableCell>
                            <div className="font-semibold">{company.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {company.location || "Location unknown"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {company.primaryContact || company.primaryEmail || "Not provided"}
                            </div>
                            {company.primaryEmail && (
                              <div className="text-xs text-muted-foreground">{company.primaryEmail}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {Array.from(company.roles).join(", ")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{Array.from(company.statuses).join(", ")}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="h-full">
              <CardHeader>
                <CardTitle>Relationship playbook</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-4 w-3/4" />)
                ) : playbookItems.length === 0 ? (
                  <p>All follow-ups are up to date. Great work!</p>
                ) : (
                  playbookItems.map((item) => (
                    <div key={item.company} className="flex items-start gap-2">
                      <Mail className="h-4 w-4 mt-1 text-primary" />
                      <p>
                        Send a nudge to <span className="font-medium text-foreground">{item.contact ?? "your contact"}</span>{" "}
                        about <span className="font-medium text-foreground">{item.company}</span> to keep the conversation moving.
                      </p>
                    </div>
                  ))
                )}
                <div className="pt-2">
                  <Button variant="ghost" size="sm" className="gap-2" disabled={isLoading || companies.length === 0}>
                    <NotebookPen className="h-4 w-4" />
                    View outreach history
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {error && (
            <p className="text-sm text-destructive">There was a problem loading companies. Please try again.</p>
          )}
        </div>
      </main>
    </div>
  )
}
