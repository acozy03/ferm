"use client"

import Image from "next/image"
import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowUpRight, LogIn } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSupabase } from "@/components/supabase-provider"
import fermLogo from "@/public/logo.png"

const PASSWORD_HELP = "Use at least 8 characters."

export default function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get("redirectedFrom")
  const { supabase, session, isLoading } = useSupabase()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [message, setMessage] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError(null)
    setMessage(null)
    setIsSubmitting(true)

    const sanitizedEmail = email.trim()
    const origin = typeof window === "undefined" ? "" : window.location.origin
    const next = redirectedFrom ? `?next=${encodeURIComponent(redirectedFrom)}` : ""

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password,
        })

        if (error) {
          setAuthError(error.message)
          return
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback${next}`,
          },
        })

        if (error) {
          setAuthError(error.message)
          return
        }

        setMessage("Check your email for a verification link to finish setting up your account.")
        setMode("signin")
        setPassword("")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasSession = Boolean(session)

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/landing" className="flex items-center gap-3 text-base font-semibold">
            <Image src={fermLogo} alt="Ferm logo" width={36} height={36} className="h-9 w-9" />
            <span>ferm</span>
          </Link>
          <div className="flex items-center gap-3">
            {hasSession ? (
              <Button variant="ghost" onClick={() => router.replace(redirectedFrom || "/")} className="text-slate-700">
                Go to dashboard
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setMode("signin")} className="text-slate-700">
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
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-medium text-emerald-700">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          Job search command center
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
          Stop forgetting where every application stands.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          Ferm collects your highlights, interviews, and follow-ups into a single workspace so you can move every opportunity forward without another spreadsheet.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-3">
          <Button size="lg" onClick={hasSession ? () => router.replace(redirectedFrom || "/") : handleGoogle} className="gap-2 px-7 text-base">
            {hasSession ? "Open my dashboard" : "Start free"}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Button>
          {!hasSession && (
            <Button size="lg" variant="outline" onClick={() => setMode("signup")} className="px-7 text-base">
              Create an account
            </Button>
          )}
        </div>

        {!hasSession && (
          <section className="mt-16 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">{mode === "signin" ? "Log in" : "Create an account"}</p>
                <p className="text-sm text-slate-500">Use Google or email to get into ferm.</p>
              </div>
              <LogIn className="h-5 w-5 text-slate-400" aria-hidden />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleGoogle} className="gap-2" variant="secondary" type="button">
                Continue with Google
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            <div className="mt-6 h-px w-full bg-slate-200" aria-hidden />

            {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
            {authError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{authError}</p>}

            <form className="mt-4 space-y-4" onSubmit={handleEmailSubmit}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-800">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-800">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="bg-white"
                />
                <p className="text-xs text-slate-500">{PASSWORD_HELP}</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="submit" disabled={isSubmitting} className="sm:min-w-[160px]">
                  {isSubmitting ? "Working..." : mode === "signin" ? "Log in" : "Sign up"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin")
                    setAuthError(null)
                    setMessage(null)
                  }}
                  className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
                >
                  {mode === "signin" ? "Create a new account" : "Use an existing account"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}
