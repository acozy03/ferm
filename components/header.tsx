"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react"
import { useSWRConfig } from "swr"
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  BarChart3,
  Sprout,
  Search,
  Filter,
  Upload,
  LogOut,
  UserRound,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { AddApplicationDialog } from "@/components/add-application-dialog"
import { ImportApplicationsDialog } from "@/components/import-applications-dialog"
import { ApplicationFilters } from "@/components/application-filters"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
  countJobFilters,
  createSearchParamsWithFilters,
  parseJobApplicationFilters,
} from "@/lib/job-filters"
import type { CreateJobApplicationData, JobApplicationFilters } from "@/lib/types/database"
import { useSupabase } from "@/components/supabase-provider"

type RejectedResult = Extract<PromiseSettledResult<void>, { status: "rejected" }>

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Applications", href: "/applications", icon: Briefcase },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
] as const

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { mutate } = useSWRConfig()
  const { supabase, user, isLoading: isAuthLoading } = useSupabase()

  const isDashboard = pathname === "/"

  const currentFilters = useMemo(() => parseJobApplicationFilters(searchParams), [searchParams])
  const activeFilterCount = useMemo(() => countJobFilters(currentFilters), [currentFilters])
  const hasSearch = Boolean(currentFilters.search)

  const filterSheetInitialFilters = useMemo<JobApplicationFilters>(() => ({
    status: currentFilters.status,
    priority: currentFilters.priority,
    employment_type: currentFilters.employment_type,
    company_name: currentFilters.company_name,
    date_from: currentFilters.date_from,
    date_to: currentFilters.date_to,
  }), [currentFilters])

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState(currentFilters.search ?? "")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [pendingFilters, setPendingFilters] = useState<JobApplicationFilters>(filterSheetInitialFilters)

  const pendingFilterCount = useMemo(() => countJobFilters(pendingFilters), [pendingFilters])

  useEffect(() => {
    if (!isSearchOpen) {
      setSearchValue(currentFilters.search ?? "")
    }
  }, [currentFilters.search, isSearchOpen])

  useEffect(() => {
    if (isFilterOpen) {
      setPendingFilters(filterSheetInitialFilters)
    }
  }, [filterSheetInitialFilters, isFilterOpen])

  const pushFilters = useCallback((filters: JobApplicationFilters) => {
    const params = createSearchParamsWithFilters(searchParams, filters)
    params.delete("page")
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const revalidateApplications = useCallback(() => {
    return mutate((key) => typeof key === "string" && key.startsWith("/api/job-applications"))
  }, [mutate])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    await mutate(
      (key) => typeof key === "string" && key.startsWith("/api/job-applications"),
      undefined,
      { revalidate: false },
    )
    router.replace("/landing")
    router.refresh()
  }, [mutate, router, supabase])

  const submitApplication = useCallback(async (application: CreateJobApplicationData) => {
    try {
      const response = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(application),
      })

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response))
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error("Unknown error occurred while saving the application.")
    }
  }, [])

  const handleAddApplication = useCallback(
    async (application: CreateJobApplicationData) => {
      try {
        await submitApplication(application)
        await revalidateApplications()
        toast({
          title: "Application added",
          description: `${application.position_title} at ${application.company_name} saved successfully.`,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add the application."
        console.error("Failed to add application:", error)
        toast({
          title: "Failed to add application",
          description: message,
          variant: "destructive",
        })
      }
    },
    [revalidateApplications, submitApplication],
  )

  const handleImportApplications = async (applications: CreateJobApplicationData[]) => {
    if (applications.length === 0) {
      return
    }

    try {
      const results = await Promise.allSettled(applications.map((application) => submitApplication(application)))
      const failures = results.filter((result): result is RejectedResult => result.status === "rejected")
      const successCount = results.length - failures.length

      if (successCount > 0) {
        await revalidateApplications()
        toast({
          title: "Import complete",
          description:
            failures.length > 0
              ? `Imported ${successCount} of ${applications.length} applications. ${failures.length} failed.`
              : `Imported ${successCount} application${successCount > 1 ? "s" : ""}.`,
        })
      }

      if (failures.length > 0) {
        failures.forEach((failure) => console.error("Failed to import application:", failure.reason))
        const firstError = failures[0]?.reason
        toast({
          title: `Failed to import ${failures.length} application${failures.length > 1 ? "s" : ""}`,
          description:
            firstError instanceof Error
              ? firstError.message
              : "Some applications could not be imported. Please check the data and try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to import applications:", error)
      toast({
        title: "Failed to import applications",
        description: error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const value = searchValue.trim()
      const nextFilters: JobApplicationFilters = {
        ...currentFilters,
        search: value ? value : undefined,
      }
      pushFilters(nextFilters)
      setIsSearchOpen(false)
    },
    [currentFilters, pushFilters, searchValue],
  )

  const handleClearSearch = useCallback(() => {
    const nextFilters: JobApplicationFilters = {
      ...currentFilters,
      search: undefined,
    }
    setSearchValue("")
    pushFilters(nextFilters)
  }, [currentFilters, pushFilters])

  const handleApplyFilters = useCallback(() => {
    const nextFilters: JobApplicationFilters = {
      ...currentFilters,
      ...pendingFilters,
      search: currentFilters.search,
    }
    pushFilters(nextFilters)
    setIsFilterOpen(false)
  }, [currentFilters, pendingFilters, pushFilters])

  const handleClearFilters = useCallback(() => {
    setPendingFilters({})
    const nextFilters: JobApplicationFilters = {
      ...currentFilters,
      status: undefined,
      priority: undefined,
      employment_type: undefined,
      company_name: undefined,
      date_from: undefined,
      date_to: undefined,
    }
    pushFilters(nextFilters)
    setIsFilterOpen(false)
  }, [currentFilters, pushFilters])

  const handleCancelFilters = useCallback(() => {
    setPendingFilters(filterSheetInitialFilters)
    setIsFilterOpen(false)
  }, [filterSheetInitialFilters])

  return (
    <header className="fixed top-4 left-0 right-0 z-50">
      <div className="max-w-[83rem] mx-auto px-3 sm:px-6">
        <div className="border border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 rounded-xl shadow-lg">
          <div className="flex h-12 sm:h-14 items-center justify-between px-3 sm:px-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-primary/10 text-primary hover:bg-primary/15"
                      aria-label="Open workspace menu"
                    >
                      <Sprout className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>ferm.dev</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {NAV_ITEMS.map((item) => {
                      const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                      return (
                        <DropdownMenuItem
                          key={item.href}
                          onSelect={() => router.push(item.href)}
                          className={cn(isActive ? "font-semibold text-foreground" : "")}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Link
                  href="/"
                  className="text-xl font-semibold text-balance hover:text-primary transition-colors"
                >
                  ferm.dev
                </Link>
              </div>
              <nav className="hidden md:flex items-center gap-6 text-sm">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "transition-colors",
                        isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn("items-center gap-2 sm:gap-3", isDashboard ? "hidden sm:flex" : "flex")}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-2 bg-transparent",
                    hasSearch && "border-primary text-primary shadow-sm",
                  )}
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search className="h-4 w-4" />
                  Search
                  {hasSearch && <span className="inline-flex h-2 w-2 rounded-full bg-primary" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-2 bg-transparent",
                    activeFilterCount > 0 && "border-primary text-primary shadow-sm",
                  )}
                  onClick={() => setIsFilterOpen(true)}
                >
                  <Filter className="h-4 w-4" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-medium text-primary">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                <ImportApplicationsDialog
                  onImport={handleImportApplications}
                  trigger={
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Upload className="h-4 w-4" />
                      Import
                    </Button>
                  }
                />
                <AddApplicationDialog onAdd={handleAddApplication} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-transparent"
                      disabled={isAuthLoading}
                    >
                      <UserRound className="h-4 w-4" />
                      <span className="truncate max-w-[8rem] text-left">
                        {user?.email ?? "Account"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="truncate">{user?.email ?? "Signed in"}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>Signed in with Google</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault()
                        void handleSignOut()
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {isDashboard && (
                <div className="flex items-center gap-1.5 sm:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("relative bg-transparent", hasSearch && "text-primary")}
                    onClick={() => setIsSearchOpen(true)}
                    aria-label="Open search"
                  >
                    <Search className="h-5 w-5" />
                    {hasSearch && (
                      <span className="absolute top-1 right-1 inline-flex h-2 w-2 rounded-full bg-primary" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("relative bg-transparent", activeFilterCount > 0 && "text-primary")}
                    onClick={() => setIsFilterOpen(true)}
                    aria-label="Open filters"
                  >
                    <Filter className="h-5 w-5" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex min-w-[1.25rem] justify-center rounded-full bg-primary px-1 text-[0.625rem] font-medium text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                  <AddApplicationDialog
                    onAdd={handleAddApplication}
                    trigger={
                      <Button
                        size="icon"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        aria-label="Add application"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-transparent"
                        disabled={isAuthLoading}
                        aria-label="Open account menu"
                      >
                        <UserRound className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="truncate">{user?.email ?? "Signed in"}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <ImportApplicationsDialog
                        onImport={handleImportApplications}
                        trigger={
                          <DropdownMenuItem className="gap-2">
                            <Upload className="h-4 w-4" />
                            Import applications
                          </DropdownMenuItem>
                        }
                      />
                      <DropdownMenuItem disabled>Signed in with Google</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                          void handleSignOut()
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search applications</DialogTitle>
            <DialogDescription>
              Find applications by company, role, contact name, email, location, notes, and more.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="e.g. Frontend Engineer, Figma, hiring@company.com"
              autoFocus
            />
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearSearch}
                disabled={!hasSearch && searchValue.trim().length === 0}
              >
                Clear search
              </Button>
              <Button type="submit">Apply search</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="right" className="flex h-full max-h-[calc(100vh-2rem)] flex-col gap-0 p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Filter applications</SheetTitle>
            <SheetDescription>Combine filters to refine the job applications list.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <ApplicationFilters filters={pendingFilters} onFiltersChange={setPendingFilters} />
          </div>
          <SheetFooter className="flex-col gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearFilters}
              disabled={activeFilterCount === 0 && pendingFilterCount === 0}
            >
              Clear filters
            </Button>
            <div className="flex w-full justify-end gap-2 sm:w-auto">
              <Button type="button" variant="outline" onClick={handleCancelFilters}>
                Cancel
              </Button>
              <Button type="button" onClick={handleApplyFilters}>
                Apply filters
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </header>
  )
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const data = await response.clone().json()
    if (typeof data === "string") {
      return data
    }
    if (data && typeof data === "object") {
      if ("error" in data && data.error) {
        return String(data.error)
      }
      if ("message" in data && data.message) {
        return String(data.message)
      }
    }
  } catch {
    // ignore JSON parse failures
  }

  try {
    const text = await response.text()
    if (text) {
      return text
    }
  } catch {
    // ignore text parse failures
  }

  return `Request failed with status ${response.status}`
}
