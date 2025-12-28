"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowUpRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useSupabase } from "@/components/supabase-provider"
import fermLogo from "@/public/logo.png"

export default function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get("redirectedFrom")
  const { supabase, session, isLoading } = useSupabase()

  useEffect(() => {
    if (!isLoading && session) {
      router.replace(redirectedFrom || "/")
    }
  }, [isLoading, redirectedFrom, router, session])

  const handleGoogle = async () => {
    if (typeof window === "undefined") return

    const origin = window.location.origin
    const next = redirectedFrom ? `?next=${encodeURIComponent(redirectedFrom)}` : ""

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback${next}`,
      },
    })
  }

  const hasSession = Boolean(session)

  return (
    <div className="dark">
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-card/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
            <Link href="/landing" className="flex items-center gap-3 text-base font-semibold">
              <Image src={fermLogo} alt="Ferm logo" width={36} height={36} className="h-9 w-9" />
             
            </Link>
            <div className="flex items-center gap-3">
              {hasSession ? (
                <Button variant="ghost" onClick={() => router.replace(redirectedFrom || "/")} className="text-foreground/80">
                  Go to dashboard
                </Button>
              ) : (
                <Button variant="ghost" onClick={handleGoogle} className="text-foreground/80">
                  Log in
                </Button>
              )}
              <Button onClick={handleGoogle} className="gap-2">
                {hasSession ? "Open ferm" : "Start with Google"}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-24 pt-20 text-center sm:pt-28">
          
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Stop forgetting where every application stands.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            ferm collects your applications, interviews, and follow-ups into a single workspace so you can move every opportunity forward without another spreadsheet.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-3">
            <Button size="lg" onClick={hasSession ? () => router.replace(redirectedFrom || "/") : handleGoogle} className="gap-2 px-7 text-base">
              {hasSession ? "Open my dashboard" : "Start free"}
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Button>
            {!hasSession && (
              <Button size="lg" variant="outline" onClick={handleGoogle} className="px-7 text-base">
                Create an account
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
