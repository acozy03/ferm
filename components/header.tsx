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
  LogOut,
  UserRound,
  FileText,
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
import { cn } from "@/lib/utils"
import {
  createSearchParamsWithFilters,
  parseJobApplicationFilters,
} from "@/lib/job-filters"
import type { JobApplicationFilters } from "@/lib/types/database"
import { useSupabase } from "@/components/supabase-provider"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Applications", href: "/applications", icon: Briefcase },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Resume", href: "/resume", icon: FileText },
] as const

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { mutate } = useSWRConfig()
  const { supabase, user, isLoading: isAuthLoading } = useSupabase()
  const isDashboard = pathname === "/"
  const currentFilters = useMemo(() => parseJobApplicationFilters(searchParams), [searchParams])
  const hasSearch = Boolean(currentFilters.search)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState(currentFilters.search ?? "")

  useEffect(() => {
    if (!isSearchOpen) {
      setSearchValue(currentFilters.search ?? "")
    }
  }, [currentFilters.search, isSearchOpen])
  const pushFilters = useCallback((filters: JobApplicationFilters) => {
    const params = createSearchParamsWithFilters(searchParams, filters)

    params.delete("page")
    const query = params.toString()

    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])
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
    </header>
  )
}
