"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { useSupabase } from "@/components/supabase-provider"

const navigation = [
  { name: "Product", href: "#product" },
  { name: "Solutions", href: "#solutions" },
  { name: "Resources", href: "#resources" },
  { name: "Pricing", href: "#pricing" },
]

const featureHighlights = [
  {
    title: "Unified application tracking",
    description:
      "Organize every role, recruiter, and interview in a single, structured workspace built for momentum.",
  },
  {
    title: "Real-time collaboration",
    description:
      "Share progress with mentors and teammates while Ferm automatically keeps timelines, notes, and feedback aligned.",
  },
  {
    title: "Insights that inform decisions",
    description:
      "Monitor conversion rates and spot bottlenecks instantly with dashboards designed for modern talent teams.",
  },
]

const solutionDetails = [
  {
    heading: "Launch campaigns with clarity",
    body:
      "Plan sourcing sprints, manage outreach cadences, and keep every candidate conversation within reach. Ferm adapts to your process without getting in the way.",
  },
  {
    heading: "Streamline interviewer workflows",
    body:
      "Brief interviewers with context-rich packets, collect feedback automatically, and close loops faster with automations that respect your brand.",
  },
  {
    heading: "Deliver an elevated candidate experience",
    body:
      "Guide candidates from first touch to offer letter with timely updates, tailored communication, and a polished portal that mirrors your company standards.",
  },
]

const resources = [
  {
    title: "Guides",
    description: "Playbooks for building an equitable, data-informed hiring process across every stage of growth.",
  },
  {
    title: "Webinars",
    description: "Monthly conversations with talent leaders unpacking real-world strategies that deliver results.",
  },
  {
    title: "Templates",
    description: "Interview scorecards, outreach sequences, and analytics dashboards ready for immediate use.",
  },
]

const pricingTiers = [
  {
    name: "Starter",
    price: "Free",
    details: ["Up to 3 active roles", "Email support", "Core analytics"],
  },
  {
    name: "Growth",
    price: "$49",
    details: ["Unlimited roles", "Team collaboration", "Advanced reporting"],
  },
  {
    name: "Scale",
    price: "Talk to us",
    details: ["Custom onboarding", "Dedicated success manager", "Enterprise security"],
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

    const origin = typeof window === "undefined" ? "" : window.location.origin
    const next = redirectedFrom ? `?next=${encodeURIComponent(redirectedFrom)}` : ""
    const currentView = modalView
    let shouldCloseModal = false

    try {
      if (currentView === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setAuthError(error.message)
          return
        }

        shouldCloseModal = true
      } else if (currentView === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback${next}`,
          },
        })

        if (error) {
          setAuthError(error.message)
          return
        }

        setFormMessage("Check your email for a verification link to finish setting up your account.")
        setModalView("signin")
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
          <Link href="#" className="text-lg font-semibold tracking-tight">
            Ferm
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
        <section className="relative overflow-hidden border-b border-zinc-800 bg-zinc-950">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">HIRING INTELLIGENCE FOR MODERN TEAMS</p>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                The operating system for resilient recruiting teams.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-zinc-400">
                Ferm gives talent organizations one connected workspace to orchestrate every touchpoint, surface insights in real time, and deliver experiences candidates remember.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="#pricing"
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
                >
                  View pricing
                </a>
                <a
                  href="#product"
                  className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:text-white"
                >
                  Explore product
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
                  Track applications, interview feedback, and offer decisions with precision. Ferm keeps every stakeholder aligned without the usual spreadsheets and status meetings.
                </p>
                <ul className="space-y-4 text-sm text-zinc-300">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-6 bg-zinc-500" aria-hidden />
                    Automated reminders keep interviews on schedule.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-6 bg-zinc-500" aria-hidden />
                    Analytics reveal conversion shifts the moment they happen.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-6 bg-zinc-500" aria-hidden />
                    Candidate profiles aggregate notes, resumes, and communication.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="border-b border-zinc-800">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="space-y-8">
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Product</p>
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                  Every workflow connected. Every decision supported.
                </h2>
                <p className="text-lg text-zinc-400">
                  Ferm centralizes sourcing, pipeline management, and post-offer workflows so your team can focus on crafting candidate experiences that stand out.
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
                      Visualize stages, forecast hiring velocity, and adjust priorities in minutes.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {[
                      "Sourcing insights powered by enrichment data.",
                      "Interviews aligned with collaborative scorecards.",
                      "Offers tracked with customizable approval flows.",
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

        <section id="solutions" className="border-b border-zinc-800 bg-zinc-950">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-center">
              <div className="lg:w-2/5">
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Solutions</p>
                <h2 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">
                  Designed for teams scaling with intention.
                </h2>
                <p className="mt-4 text-lg text-zinc-400">
                  Whether you are hiring your first ten employees or expanding globally, Ferm adapts to your structure and keeps your brand consistent.
                </p>
              </div>
              <div className="grid flex-1 gap-8 sm:grid-cols-2">
                {[
                  {
                    title: "Talent operations",
                    description:
                      "Establish repeatable processes, automate handoffs, and maintain compliance without slowing down momentum.",
                  },
                  {
                    title: "People teams",
                    description:
                      "Align stakeholders with insights that connect talent planning to business outcomes in one view.",
                  },
                  {
                    title: "Recruiting agencies",
                    description:
                      "Deliver white-labeled candidate journeys and status updates for every client engagement.",
                  },
                  {
                    title: "Hiring managers",
                    description:
                      "Collaborate on job scopes, interview feedback, and final offers with clarity and accountability.",
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

        <section id="resources" className="border-b border-zinc-800">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
              <div className="lg:w-1/3">
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Resources</p>
                <h2 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">
                  Guidance for every hiring milestone.
                </h2>
                <p className="mt-4 text-lg text-zinc-400">
                  Access expert-backed frameworks and live conversations to help your team operate with confidence.
                </p>
              </div>
              <div className="grid flex-1 gap-8 sm:grid-cols-3">
                {resources.map((resource) => (
                  <div key={resource.title} className="rounded-2xl border border-zinc-800 p-6">
                    <h3 className="text-lg font-semibold text-white">{resource.title}</h3>
                    <p className="mt-3 text-sm text-zinc-400">{resource.description}</p>
                    <a
                      href="#"
                      className="mt-6 inline-block text-sm font-medium text-zinc-300 transition hover:text-white"
                    >
                      Explore {resource.title.toLowerCase()}
                    </a>
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
                Choose the plan that grows with your team.
              </h2>
              <p className="mt-4 text-lg text-zinc-400">
                Start for free and add the capabilities you need as hiring accelerates.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              {pricingTiers.map((tier) => (
                <div key={tier.name} className="flex flex-col justify-between rounded-2xl border border-zinc-800 p-8">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                    <p className="mt-2 text-2xl font-semibold text-white">{tier.price}</p>
                    <ul className="mt-6 space-y-3 text-sm text-zinc-400">
                      {tier.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                  <button className="mt-10 rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:text-white">
                    Contact sales
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-zinc-800">
          <div className="mx-auto max-w-7xl px-6 py-24">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center">
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                Ready to bring certainty to your hiring roadmap?
              </h2>
              <p className="mt-4 text-lg text-zinc-400">
                Join companies that run their recruiting operations on Ferm.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <a
                  href="#"
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
                >
                  Request a demo
                </a>
                <a
                  href="#"
                  className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:text-white"
                >
                  Talk to an expert
                </a>
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
                    Don't have an account?{" "}
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




