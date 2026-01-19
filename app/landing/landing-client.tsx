"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowUpRight, Check, Youtube, Linkedin, Play, Twitter } from "lucide-react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSupabase } from "@/components/supabase-provider"
import fermLogo from "@/public/logo.png"
import heroPlaceholder from "@/public/hero.webp"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/\d/, "Include at least one number")
  .regex(/[!@#$%^&*()_+[\]{};:'",.<>/?`~\\|-]/, "Include at least one special character")

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

const signUpSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  })

export default function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get("redirectedFrom")
  const { supabase, session, isLoading } = useSupabase()
  const [isSignUpOpen, setIsSignUpOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isVideoOpen, setIsVideoOpen] = useState(false)

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
  const baseRedirectUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/auth/callback`
  }, [])

  return (
    <div className="dark">
      <div className="min-h-screen text-foreground">
        <Section className="bg-background">
          <header className="border-b border-border bg-card/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
              <Link href="/landing" className="flex items-center gap-3 text-base font-semibold">
                <Image src={fermLogo} alt="Ferm logo" width={36} height={36} className="h-9 w-9" />
              </Link>
              <div className="flex items-center gap-3">
                {hasSession ? (
                  <Button
                    variant="ghost"
                    onClick={() => router.replace(redirectedFrom || "/")}
                    className="text-foreground/80"
                  >
                    Go to dashboard
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={() => setIsSignUpOpen(true)} className="text-foreground/80">
                    Create an account
                  </Button>
                )}
                {hasSession ? (
                  <Button onClick={() => router.replace(redirectedFrom || "/")} className="gap-2">
                    Open ferm
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </Button>
                ) : (
                  <Button onClick={() => setIsLoginOpen(true)} className="gap-2">
                    Sign in
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            </div>
          </header>

          <main className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-24 pt-20 text-center sm:pt-28">
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Stop forgetting where every application stands.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              ferm collects your applications, interviews, and follow-ups into a single workspace so you can move every
              opportunity forward without another spreadsheet.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button variant="secondary" asChild>
                <Link href="https://ko-fi.com/adriancosentino" target="_blank" rel="noreferrer">
                  Support Me
                </Link>
              </Button>
              <Button onClick={() => setIsLoginOpen(true)} className="gap-2">
                Get Started
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-4 text-muted-foreground">
              <SocialLink href="https://www.linkedin.com/company/111001355" label="LinkedIn">
                <Linkedin className="h-6 w-6" aria-hidden />
              </SocialLink>
              <SocialLink href="https://www.youtube.com/@ferm-dot-dev" label="Youtube">
                <Youtube className="h-6 w-6" aria-hidden />
              </SocialLink>
              <SocialLink href="https://x.com/fermdotdev" label="Twitter">
                <Twitter className="h-6 w-6" aria-hidden />
              </SocialLink>
            </div>

            <div className="mt-12 w-full max-w-4xl">
              <div className="relative overflow-hidden rounded-2xl border border-border shadow-xl">
                <Image src={heroPlaceholder} alt="ferm hero preview" className="h-full w-full object-cover" priority />
                <button
                  type="button"
                  onClick={() => setIsVideoOpen(true)}
                  className="absolute inset-0 flex items-center justify-center rounded-2xl outline-none transition hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg ring-1 ring-black/10">
                    <Play className="h-7 w-7 fill-current" aria-hidden />
                    <VisuallyHidden>Play ferm overview video</VisuallyHidden>
                  </span>
                </button>
              </div>
            </div>
          </main>
        </Section>

        <div className="h-8 bg-black" />

        <Section className="bg-background">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div className="flex flex-col gap-6">
              <h2 className="text-2xl font-semibold">Chrome extension demo</h2>
              <div className="rounded-2xl border border-border bg-card/60 p-6">
                <div
                  aria-label="Chrome extension demo detail slot 1"
                  className="h-24 rounded-xl border border-dashed border-border/70 bg-background/40"
                />
              </div>
              <div className="rounded-2xl border border-border bg-card/60 p-6">
                <div
                  aria-label="Chrome extension demo detail slot 2"
                  className="h-24 rounded-xl border border-dashed border-border/70 bg-background/40"
                />
              </div>
              <div className="rounded-2xl border border-border bg-card/60 p-6">
                <div
                  aria-label="Chrome extension demo detail slot 3"
                  className="h-24 rounded-xl border border-dashed border-border/70 bg-background/40"
                />
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-card/70 p-4 shadow-xl">
              <div
                aria-label="Chrome extension GIF container"
                className="aspect-[16/10] w-full rounded-2xl border border-dashed border-border/70 bg-background/40"
              />
            </div>
          </div>
        </Section>

        <Section className="bg-card/60">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="rounded-[32px] border border-border bg-background/70 p-8 shadow-2xl">
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <h2 className="text-2xl font-semibold">AI overview</h2>
                  <div aria-label="AI overview lead space" className="h-6 max-w-md rounded-full bg-muted/40" />
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-card/70 p-6">
                    <h3 className="text-lg font-semibold">AI interviews</h3>
                    <div
                      aria-label="AI interviews module container"
                      className="mt-4 h-32 rounded-xl border border-dashed border-border/70 bg-background/40"
                    />
                  </div>
                  <div className="rounded-2xl border border-border bg-card/70 p-6 lg:translate-y-6">
                    <h3 className="text-lg font-semibold">AI follow-up emails</h3>
                    <div
                      aria-label="AI follow-up emails module container"
                      className="mt-4 h-32 rounded-xl border border-dashed border-border/70 bg-background/40"
                    />
                  </div>
                  <div className="rounded-2xl border border-border bg-card/70 p-6 lg:-translate-y-4">
                    <h3 className="text-lg font-semibold">AI job scoring</h3>
                    <div
                      aria-label="AI job scoring module container"
                      className="mt-4 h-32 rounded-xl border border-dashed border-border/70 bg-background/40"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section className="bg-background">
          <div className="mx-auto max-w-4xl px-6 py-20">
            <h2 className="text-2xl font-semibold">FAQ</h2>
            <div className="mt-8 rounded-2xl border border-border bg-card/60 p-6">
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="faq-item-1">
                  <AccordionTrigger>
                    <span aria-hidden className="block h-4 w-40 rounded-full bg-muted/50" />
                    <span className="sr-only">FAQ question placeholder</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div
                      aria-label="FAQ answer placeholder"
                      className="h-16 rounded-xl border border-dashed border-border/70 bg-background/40"
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-item-2">
                  <AccordionTrigger>
                    <span aria-hidden className="block h-4 w-48 rounded-full bg-muted/50" />
                    <span className="sr-only">FAQ question placeholder</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div
                      aria-label="FAQ answer placeholder"
                      className="h-16 rounded-xl border border-dashed border-border/70 bg-background/40"
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="faq-item-3">
                  <AccordionTrigger>
                    <span aria-hidden className="block h-4 w-36 rounded-full bg-muted/50" />
                    <span className="sr-only">FAQ question placeholder</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div
                      aria-label="FAQ answer placeholder"
                      className="h-16 rounded-xl border border-dashed border-border/70 bg-background/40"
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </Section>

        <Section className="bg-card/70">
          <footer className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
            <div className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-center md:justify-between">
              <Link href="/landing" className="flex items-center gap-3 text-base font-semibold">
                <Image src={fermLogo} alt="Ferm logo" width={32} height={32} className="h-8 w-8" />
                <span>ferm</span>
              </Link>
              <div className="flex flex-wrap gap-3">
                <span aria-label="Footer primary link placeholder" className="h-3 w-20 rounded-full bg-muted/40" />
                <span aria-label="Footer primary link placeholder" className="h-3 w-16 rounded-full bg-muted/40" />
                <span aria-label="Footer primary link placeholder" className="h-3 w-24 rounded-full bg-muted/40" />
                <span aria-label="Footer primary link placeholder" className="h-3 w-16 rounded-full bg-muted/40" />
              </div>
            </div>
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3">
                <span aria-label="Footer meta placeholder" className="h-3 w-40 rounded-full bg-muted/40" />
                <span aria-label="Footer meta placeholder" className="h-3 w-56 rounded-full bg-muted/40" />
              </div>
              <div className="flex flex-wrap gap-3">
                <span aria-label="Footer secondary link placeholder" className="h-3 w-16 rounded-full bg-muted/40" />
                <span aria-label="Footer secondary link placeholder" className="h-3 w-20 rounded-full bg-muted/40" />
                <span aria-label="Footer secondary link placeholder" className="h-3 w-24 rounded-full bg-muted/40" />
                <span aria-label="Footer secondary link placeholder" className="h-3 w-16 rounded-full bg-muted/40" />
                <span aria-label="Footer secondary link placeholder" className="h-3 w-24 rounded-full bg-muted/40" />
              </div>
            </div>
          </footer>
        </Section>
      </div>

      <SignUpDialog
        open={isSignUpOpen && !hasSession}
        onOpenChange={setIsSignUpOpen}
        supabaseRedirectUrl={baseRedirectUrl}
      />
      <LoginDialog open={isLoginOpen && !hasSession} onOpenChange={setIsLoginOpen} onGoogleSignIn={handleGoogle} />
      <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
        <DialogContent
          className="w-[90vw] max-w-6xl overflow-hidden border-border p-0 sm:max-w-[1100px]"
          showCloseButton={false}
          style={{ maxHeight: "90vh" }}
        >
          <div className="relative aspect-video w-full">
            <iframe
              src="https://www.youtube.com/embed/u7I-SKNEru0?si=QStMv39a6HddGXhM"
              title="ferm overview video"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Section({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={["w-full", className].filter(Boolean).join(" ")}>{children}</section>
}

function SignUpDialog({
  open,
  onOpenChange,
  supabaseRedirectUrl,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  supabaseRedirectUrl: string
}) {
  const { supabase } = useSupabase()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const isSubmitting = form.formState.isSubmitting
  const passwordValue = form.watch("password")
  const confirmValue = form.watch("confirmPassword")

  const hasMinLength = passwordValue.length >= 8
  const hasUppercase = /[A-Z]/.test(passwordValue)
  const hasLowercase = /[a-z]/.test(passwordValue)
  const hasCaseMix = hasUppercase && hasLowercase
  const hasNumber = /\d/.test(passwordValue)
  const hasSpecial = /[!@#$%^&*()_+[\]{};:'",.<>/?`~\\|-]/.test(passwordValue)
  const meetsAllRequirements = hasMinLength && hasCaseMix && hasNumber && hasSpecial
  const passwordsMatch = confirmValue.length > 0 && confirmValue === passwordValue

  const handleSubmit = async (values: z.infer<typeof signUpSchema>) => {
    setSubmitError(null)

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: supabaseRedirectUrl
        ? {
            emailRedirectTo: supabaseRedirectUrl,
          }
        : undefined,
    })

    if (data?.user?.identities?.length === 0) {
      setSubmitError("An account with this email already exists. Please sign in instead.")
      return
    }

    if (error) {
      setSubmitError(error.message)
      return
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <VisuallyHidden>Create your account</VisuallyHidden>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      className={
                        meetsAllRequirements
                          ? "border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/50"
                          : undefined
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-left text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Password requirements</p>
                    <ul className="mt-2 space-y-1">
                      <RequirementRow met={hasMinLength} label="At least 8 characters long" />
                      <RequirementRow met={hasCaseMix} label="Contains uppercase and lowercase letters" />
                      <RequirementRow met={hasNumber} label="Includes a number" />
                      <RequirementRow met={hasSpecial} label="Includes a special character" />
                    </ul>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter your password"
                      className={
                        passwordsMatch
                          ? "border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/50"
                          : undefined
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

            <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function LoginDialog({
  open,
  onOpenChange,
  onGoogleSignIn,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  onGoogleSignIn: () => void
}) {
  const { supabase } = useSupabase()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const isSubmitting = form.formState.isSubmitting

  const handleSubmit = async (values: z.infer<typeof signInSchema>) => {
    setSubmitError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setSubmitError(error.message)
      return
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <VisuallyHidden>Sign in</VisuallyHidden>
        </DialogHeader>

        <div className="space-y-4">
          <Button type="button" variant="outline" className="w-full justify-center" onClick={onGoogleSignIn}>
            <GoogleIcon className="h-4 w-4" />
            Sign in with Google
          </Button>

          <div className="relative py-1 text-center">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden />
            <span className="relative bg-card px-2 text-xs uppercase tracking-wide text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" placeholder="Your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

            <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      prefetch={false}
      target="_blank"
      rel="noreferrer"
      className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/70 transition hover:bg-accent/50 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
    >
      {children}
    </Link>
  )
}

function RequirementRow({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <Check className={`h-4 w-4 ${met ? "text-emerald-400" : "text-muted-foreground"}`} aria-hidden />
      <span className={met ? "text-emerald-400" : "text-muted-foreground"}>{label}</span>
    </li>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="#4285F4"
        d="M23.6 12.27c0-.82-.07-1.64-.2-2.44H12v4.62h6.5a5.56 5.56 0 0 1-2.4 3.65v3.03h3.86c2.26-2.1 3.64-5.2 3.64-8.86Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.86-3.03c-1.08.72-2.47 1.14-4.08 1.14-3.14 0-5.8-2.1-6.75-4.94H1.24v3.1A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.25c-.24-.72-.38-1.49-.38-2.25s.14-1.53.38-2.25V6.65H1.24a11.99 11.99 0 0 0 0 10.7l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.07 15.24 0 12 0A11.99 11.99 0 0 0 1.24 6.65l4.01 3.1C6.2 6.85 8.86 4.75 12 4.75Z"
      />
    </svg>
  )
}
