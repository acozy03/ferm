"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useMemo } from "react"
import { useSWRConfig } from "swr"
import Image from "next/image"
import {
  LayoutDashboard,
  Mail,
  BarChart3,
  LogOut,
  UserRound,
  FileText,
  Settings,
  CalendarClock,
  MessageCircle,
} from "lucide-react"
import { IconButton } from "@/components/ui/icon-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useSupabase } from "@/components/supabase-provider"
import { SettingsDialog } from "@/components/settings-dialog"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Follow-ups", href: "/follow-ups", icon: Mail },
  { label: "Interviews", href: "/interviews", icon: CalendarClock },
  { label: "Prep", href: "/prep", icon: MessageCircle },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Resume", href: "/resume", icon: FileText },
] as const

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { mutate } = useSWRConfig()
  const { supabase, user, isLoading: isAuthLoading } = useSupabase()
  const userAvatar = useMemo(() => {
    const metadata = user?.user_metadata as { picture?: string; avatar_url?: string } | undefined
    return metadata?.picture ?? metadata?.avatar_url ?? null
  }, [user])
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
  return (
    <header className="fixed top-4 left-0 right-0 z-50">
      <div className="max-w-[83rem] mx-auto px-3 sm:px-6">
        <div className="border border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 rounded-xl shadow-lg">
          <div className="grid h-12 sm:h-14 grid-cols-[auto_1fr_auto] items-center px-3 sm:px-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton
                      variant="subtle"
                      size="icon"
                      className="text-primary"
                      aria-label="Open workspace menu"
                    >
                      <Image
                        src="/logo_cropped.png"
                        alt="ferm.dev logo"
                        width={24}
                        height={24}
                        className="h-9 w-5 sm:h-6 sm:w-6"
                        priority
                      />
                    </IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {/* <DropdownMenuLabel>ferm.dev</DropdownMenuLabel> */}
                    {/* <DropdownMenuSeparator /> */}
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
                {/* <Link
                  href="/"
                  className="text-xl font-semibold text-balance hover:text-primary transition-colors"
                >
                  ferm.dev
                </Link> */}
              </div>
            </div>
            <nav className="hidden md:flex items-center justify-center gap-6 text-sm">
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
            <div className="flex items-center justify-end gap-2 sm:gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton size="sm" className="gap-2 px-2 sm:px-3" disabled={isAuthLoading}>
                    <Avatar className="h-7 w-7">
                      {userAvatar ? (
                        <AvatarImage src={userAvatar} alt={user?.email ?? "Account avatar"} />
                      ) : (
                        <AvatarFallback>
                          <UserRound className="h-4 w-4" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="truncate max-w-[8rem] text-left text-sm sm:text-base">
                      {user?.email ?? "Account"}
                    </span>
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{user?.email ?? "Signed in"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <SettingsDialog
                    trigger={(
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                        }}
                        className="gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                    )}
                  />
                 
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      void handleSignOut()
                    }}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
