"use client"

import Image from "next/image"
import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { useSupabase } from "@/components/supabase-provider"
import fermLogo from "@/public/logo.png"
const navigation = [
  { name: "Overview", href: "#overview" },
  { name: "Features", href: "#features" },
  { name: "Workflow", href: "#workflow" },
  { name: "Tools", href: "#tools" },
  { name: "Pricing", href: "#pricing" },
]

const featureHighlights = [
  {
    title: "Track every application",
    description:
      "Log roles, statuses, and compensation details while keeping everything organized by stage.",
  },
  {
    title: "Stay ready for interviews",
    description:
      "Prep with context from notes, attachments, and scheduled conversations in a single timeline.",
  },
  {
    title: "See progress at a glance",
    description:
      "Dashboard metrics surface how many applications are active, paused, or waiting on you.",
  },
]

const solutionDetails = [
  {
    heading: "Pipeline views that keep you focused",
    body:
      "Filter and sort applications by stage, priority, or company so you always know where to spend your energy next.",
  },
  {
    heading: "Interview timelines with real context",
    body:
      "Upcoming interviews, recruiter touchpoints, and personal notes live together so you walk into every conversation prepared.",
  },
  {
    heading: "Quick updates when plans change",
    body:
      "Bulk status changes, archived roles, and reminders help you reflect reality without diving into spreadsheets.",
  },
]

const includedTools = [
  {
    title: "Stats overview",
    description: "Understand active applications, next steps, and recently won roles without building a custom tracker.",
  },
  {
    title: "Activity timeline",
    description: "Capture interview feedback, outreach notes, and follow-ups so nothing slips through the cracks.",
  },
  {
    title: "Bulk actions",
    description: "Move groups of applications forward or close them out with a single update when decisions land at once.",
  },
]

const pricingTiers = [
  {
    name: "Personal beta",
    price: "Free",
    description: "Everything you need to manage your search today.",
    details: ["Unlimited application tracking", "Interview and reminder timeline", "Dashboard insights"],
    cta: "Create an account",
    available: true,
  },
  {
    name: "Collaborative spaces",
    price: "In development",
    description: "Shared pipelines for mentors and coaches coming soon.",
    details: ["Invite collaborators", "Shared notes and tasks", "Role-level permissions"],
    cta: "Coming soon",
    available: false,
  },
]

const modalCopy = {
  signin: {
    title: "Welcome back",
    subtitle: "Log in to access your workspace.",
  },
  signup: {
    title: "Create your Ferm account",
    subtitle: "Sign up with your work email to collaborate with your team.",
  },
  reset: {
    title: "Reset your password",
    subtitle: "Enter the email associated with your account and we'll send a reset link.",
  },
} as const

type ModalView = keyof typeof modalCopy

const submitLabels: Record<ModalView, { default: string; pending: string }> = {
  signin: {
    default: "Log in",
    pending: "Logging in...",
  },
  signup: {
    default: "Create account",
    pending: "Creating account...",
  },
  reset: {
    default: "Send reset link",
    pending: "Sending email...",
  },
}

const PASSWORD_SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9]/
const PASSWORD_REQUIREMENT_MESSAGE = "Password must include at least one special character (e.g. !@#$%)."
const DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists. Try logging in or resetting your password."

export default function LandingPage() {
  const router = useRouter()
  const { supabase, session, isLoading } = useSupabase()
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get("redirectedFrom")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalView, setModalView] = useState<ModalView>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const passwordHasRequiredSpecial = PASSWORD_SPECIAL_CHAR_PATTERN.test(password)

  useEffect(() => {
    if (!isLoading && session) {
      router.replace(redirectedFrom || "/")
    }
  }, [isLoading, redirectedFrom, router, session])

  const resetFormFields = () => {
    setEmail("")
    setPassword("")
    setConfirmPassword("")
  }

  const openModal = (view: ModalView = "signin") => {
    setModalView(view)
    setIsModalOpen(true)
    setAuthError(null)
    setFormMessage(null)
    resetFormFields()
    setIsSubmitting(false)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalView("signin")
    setAuthError(null)
    setFormMessage(null)
    resetFormFields()
    setIsSubmitting(false)
  }

  const switchView = (view: ModalView) => {
    setModalView(view)
    setAuthError(null)
    setFormMessage(null)
    if (view !== "signup") {
      setConfirmPassword("")
    }
    if (view !== "signin") {
      setPassword("")
    }
    setIsSubmitting(false)
  }

  const handleGoogleSignIn = async () => {
    if (typeof window === "undefined") {
      return
    }

    const origin = window.location.origin
    const next = redirectedFrom ? `?next=${encodeURIComponent(redirectedFrom)}` : ""

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback${next}`,
      },
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setAuthError(null)
    setFormMessage(null)

    if (modalView === "signup" && password !== confirmPassword) {
      setAuthError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)

    const sanitizedEmail = email.trim()
    const origin = typeof window === "undefined" ? "" : window.location.origin
    const next = redirectedFrom ? `?next=${encodeURIComponent(redirectedFrom)}` : ""
    const currentView = modalView
    let shouldCloseModal = false

    try {
      if (currentView === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password,
        })

        if (error) {
          setAuthError(error.message)
          return
        }

        shouldCloseModal = true
      } else if (currentView === "signup") {
        if (!passwordHasRequiredSpecial) {
          setAuthError(PASSWORD_REQUIREMENT_MESSAGE)
          return
        }

        let emailExists = false

        try {
          console.log("[signup] Checking email availability", sanitizedEmail)
          const response = await fetch("/api/auth/check-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: sanitizedEmail }),
          })

          if (response.ok) {
            const data = (await response.json()) as { exists?: boolean }
            console.log("[signup] Availability response", data)
            emailExists = Boolean(data.exists)
          } else {
            console.warn("[signup] Availability request failed", response.status)
            const errorPayload = (await response.json().catch(() => ({}))) as { error?: string }
            if (errorPayload?.error) {
              console.error("Email availability check failed:", errorPayload.error)
            }
          }
        } catch (error) {
          console.error("Email availability check failed:", error)
        }

        if (emailExists) {
          setAuthError(DUPLICATE_EMAIL_MESSAGE)
          return
        }

        const { error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback${next}`,
          },
        })

        if (error) {
          const message = error.message ?? ""
          if (message.toLowerCase().includes("already")) {
            setAuthError(DUPLICATE_EMAIL_MESSAGE)
          } else if (message) {
            setAuthError(message)
          } else {
            setAuthError("We couldn't create your account. Please try again.")
          }
          return
        }

        setFormMessage("Check your email for a verification link to finish setting up your account.")
        setModalView("signin")
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
          redirectTo: `${origin}/auth/update-password`,
        })

        if (error) {
          setAuthError(error.message)
          return
        }

        setFormMessage("Check your inbox for a link to reset your password.")
      }

      if (currentView === "reset") {
        setPassword("")
        setConfirmPassword("")
      } else {
        resetFormFields()
      }
    } finally {
      setIsSubmitting(false)

      if (shouldCloseModal) {
        handleCloseModal()
      }
    }
  }

  const { default: submitLabel, pending: pendingLabel } = submitLabels[modalView]
  const { title, subtitle } = modalCopy[modalView]

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
          <Link href="/landing" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-white">
            <Image src={fermLogo} alt="Ferm logo" width={36} height={36} className="h-9 w-9" />
                     </Link>
          <nav className="hidden gap-8 text-sm font-medium text-zinc-300 md:flex">
            {navigation.map((item) => (
              <a key={item.name} href={item.href} className="transition hover:text-zinc-50">
                {item.name}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            {session ? (
              <button
                onClick={() => router.replace(redirectedFrom || "/")}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:text-white"
              >
                Go to dashboard
              </button>
            ) : (
              <button
                onClick={() => openModal("signin")}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:text-white"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        <section id="overview" className="relative overflow-hidden border-b border-zinc-800 bg-zinc-950">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">JOB SEARCH OPERATIONS</p>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Stay on top of every application without another spreadsheet.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-zinc-400">
                Ferm centralizes your applications, interview prep, and follow-ups so you always know what happened, what is next, and where to focus your time.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="#pricing"
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
                >
                  View pricing
                </a>
                <a
                  href="#features"
                  className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:text-white"
                >
                  See features
                </a>
              </div>
              <div className="mt-16 grid gap-8 sm:grid-cols-3">
                {featureHighlights.map((feature) => (
                  <div key={feature.title} className="border-l border-zinc-800 pl-6">
                    <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm text-zinc-400">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-10">
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Built for the details</h2>
                <p className="text-sm text-zinc-400">
                  Track applications, interview feedback, and offer decisions with precision. Ferm keeps your search accurate without the back-and-forth of scattered docs.
                </p>
                <ul className="space-y-4 text-sm text-zinc-300">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-6 bg-zinc-500" aria-hidden />
                    Automated reminders keep interviews on schedule.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-6 bg-zinc-500" aria-hidden />
                    Analytics reveal how your outreach is performing as you update statuses.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-6 bg-zinc-500" aria-hidden />
                    Application profiles aggregate notes, resumes, and communication threads.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-b border-zinc-800">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="space-y-8">
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Features</p>
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                  Everything you need to manage an active job search.
                </h2>
                <p className="text-lg text-zinc-400">
                  Ferm centralizes your sourcing notes, application progress, and interview prep so you can move quickly without losing context.
                </p>
                <div className="grid gap-8 sm:grid-cols-2">
                  {solutionDetails.map((solution) => (
                    <div key={solution.heading} className="rounded-2xl border border-zinc-800 p-6">
                      <h3 className="text-lg font-semibold text-white">{solution.heading}</h3>
                      <p className="mt-3 text-sm text-zinc-400">{solution.body}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Pipeline overview</h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      Visualize stages, focus on aging applications, and adjust priorities in minutes.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {[
                      "Status breakdowns that surface what needs your attention.",
                      "Saved filters for roles, companies, or locations you want to revisit.",
                      "Notes, documents, and decisions pinned to every opportunity.",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-zinc-500" aria-hidden />
                        <p className="text-sm text-zinc-300">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="border-b border-zinc-800 bg-zinc-950">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-center">
              <div className="lg:w-2/5">
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Workflow</p>
                <h2 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">
                  Designed around the way job seekers actually work.
                </h2>
                <p className="mt-4 text-lg text-zinc-400">
                  Ferm fits alongside whatever mix of outreach, referrals, and interview loops you are navigating today.
                </p>
              </div>
              <div className="grid flex-1 gap-8 sm:grid-cols-2">
                {[
                  {
                    title: "Active searchers",
                    description:
                      "Track dozens of open roles, attach resumes or notes, and know which conversations are still warm.",
                  },
                  {
                    title: "Career switchers",
                    description:
                      "Organize networking follow-ups and interview prep alongside applications as you pivot into something new.",
                  },
                  {
                    title: "Mentored journeys",
                    description:
                      "Share updates with mentors or career coaches by exporting progress, no custom spreadsheet formulas required.",
                  },
                  {
                    title: "Offer tracking",
                    description:
                      "Document compensation details and decisions so you can compare opportunities with confidence.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm text-zinc-400">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="tools" className="border-b border-zinc-800">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
              <div className="lg:w-1/3">
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Tools</p>
                <h2 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">
                  Practical tools that ship with Ferm today.
                </h2>
                <p className="mt-4 text-lg text-zinc-400">
                  Ferm focuses on the workflows that matter right now: keeping applications organized and making the next decision easy.
                </p>
              </div>
              <div className="grid flex-1 gap-8 sm:grid-cols-3">
                {includedTools.map((tool) => (
                  <div key={tool.title} className="rounded-2xl border border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold text-white">{tool.title}</h3>
                    <p className="mt-3 text-sm text-zinc-400">{tool.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-b border-zinc-800 bg-zinc-950">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Pricing</p>
              <h2 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">
                Start free while we build alongside you.
              </h2>
              <p className="mt-4 text-lg text-zinc-400">
                Ferm is currently in open beta. Join today and help shape the roadmap.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2">
              {pricingTiers.map((tier) => (
                <div key={tier.name} className="flex flex-col justify-between rounded-2xl border border-zinc-800 p-8">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                    <p className="mt-2 text-2xl font-semibold text-white">{tier.price}</p>
                    <p className="mt-3 text-sm text-zinc-400">{tier.description}</p>
                    <ul className="mt-6 space-y-3 text-sm text-zinc-400">
                      {tier.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (tier.available) {
                        openModal("signup")
                      }
                    }}
                    disabled={!tier.available}
                    className="mt-10 rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
                  >
                    {tier.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-zinc-800">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center">
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">Ready to run your search with confidence?</h2>
              <p className="mt-4 text-lg text-zinc-400">
                Create a Ferm workspace to centralize applications, prepare for interviews, and make decisions with clarity.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <button
                  type="button"
                  onClick={() => openModal("signup")}
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
                >
                  Create an account
                </button>
                <button
                  type="button"
                  onClick={() => openModal("signin")}
                  className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:text-white"
                >
                  Log in
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Ferm. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="transition hover:text-zinc-300">
              Privacy
            </a>
            <a href="#" className="transition hover:text-zinc-300">
              Terms
            </a>
            <a href="#" className="transition hover:text-zinc-300">
              Security
            </a>
          </div>
        </div>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-12" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="rounded-full border border-transparent p-1 text-zinc-400 transition hover:text-white"
                aria-label="Close login modal"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="mt-8 space-y-6">
              {modalView === "signin" && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="flex w-full items-center justify-center gap-3 rounded-full border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:text-white"
                  >
                    <span className="flex h-5 w-5 items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                        <path fill="#EA4335" d="M12 5.1c1.47 0 2.78.51 3.82 1.52l2.86-2.86C17 1.63 14.7.64 12 .64 7.99.64 4.62 2.66 2.98 6.09l3.39 2.54C7.16 6.56 9.38 5.1 12 5.1z" />
                        <path fill="#FBBC05" d="M6.37 13.09c-.2-.6-.31-1.25-.31-1.91 0-.66.11-1.31.31-1.91V7.04H2.98C2.33 8.36 2 9.8 2 11.49c0 1.69.33 3.13.98 4.45l3.39-2.54z" />
                        <path fill="#34A853" d="M12 22.31c2.7 0 4.98-.9 6.64-2.42l-3.22-2.3c-.89.6-2.04.96-3.42.96-2.62 0-4.84-1.77-5.63-4.15H2.98v2.54C4.62 20.29 7.99 22.31 12 22.31z" />
                        <path fill="#4285F4" d="M21.35 11.41H12v3.1h5.35c-.23 1.15-.94 2.12-2 2.78v2.3h3.22c1.89-1.74 2.98-4.3 2.98-7.4 0-.68-.06-1.34-.2-1.98z" />
                      </svg>
                    </span>
                    Continue with Google
                  </button>
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-zinc-500">
                    <span className="h-px flex-1 bg-zinc-800" />
                    <span>or</span>
                    <span className="h-px flex-1 bg-zinc-800" />
                  </div>
                </div>
              )}
              {formMessage && (
                <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {formMessage}
                </p>
              )}
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="login-email" className="block text-sm font-medium text-zinc-200">
                      Email
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      autoComplete="email"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-zinc-500 focus:ring-0"
                    />
                  </div>
                  {modalView !== "reset" && (
                    <div className="space-y-2">
                      <label htmlFor="login-password" className="block text-sm font-medium text-zinc-200">
                        Password
                      </label>
                      <input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        autoComplete={modalView === "signup" ? "new-password" : "current-password"}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-zinc-500 focus:ring-0"
                      />
                    </div>
                  )}
                  {modalView === "signup" && (
                    <>
                      <p className={`text-xs ${passwordHasRequiredSpecial ? "text-emerald-400" : "text-zinc-400"}`}>
                        {PASSWORD_REQUIREMENT_MESSAGE}
                      </p>
                      <div className="space-y-2">
                        <label htmlFor="login-confirm-password" className="block text-sm font-medium text-zinc-200">
                          Confirm password
                        </label>
                        <input
                          id="login-confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          required
                          autoComplete="new-password"
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-zinc-500 focus:ring-0"
                        />
                      </div>
                    </>
                  )}
                  {modalView === "signin" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => switchView("reset")}
                        className="text-sm font-medium text-zinc-300 transition hover:text-white"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
                {authError && (
                  <p className="text-sm text-red-400">{authError}</p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? pendingLabel : submitLabel}
                </button>
              </form>
              <div className="text-center text-sm text-zinc-400">
                {modalView === "signin" && (
                  <p>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchView("signup")}
                      className="font-medium text-zinc-100 transition hover:text-white"
                    >
                      Create one
                    </button>
                  </p>
                )}
                {modalView === "signup" && (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchView("signin")}
                      className="font-medium text-zinc-100 transition hover:text-white"
                    >
                      Log in
                    </button>
                  </p>
                )}
                {modalView === "reset" && (
                  <p>
                    Remember your password?{" "}
                    <button
                      type="button"
                      onClick={() => switchView("signin")}
                      className="font-medium text-zinc-100 transition hover:text-white"
                    >
                      Back to log in
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




