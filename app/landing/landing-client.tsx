"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowUpRight } from "lucide-react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSupabase } from "@/components/supabase-provider"
import fermLogo from "@/public/logo.png"

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/\d/, "Include at least one number")
  .regex(/[!@#$%^&*()_+[\]{};:'",.<>/?`~\\|-]/, "Include at least one special character")

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
                <Button variant="ghost" onClick={() => setIsSignUpOpen(true)} className="text-foreground/80">
                  Create an account
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
        </main>
      </div>

      <SignUpDialog
        open={isSignUpOpen && !hasSession}
        onOpenChange={setIsSignUpOpen}
        supabaseRedirectUrl={baseRedirectUrl}
      />
    </div>
  )
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

  const handleSubmit = async (values: z.infer<typeof signUpSchema>) => {
    setSubmitError(null)

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: supabaseRedirectUrl
        ? {
            emailRedirectTo: supabaseRedirectUrl,
          }
        : undefined,
    })

    if (error) {
      setSubmitError(error.message)
      return
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create your ferm account</DialogTitle>
          <DialogDescription>Use your email to get started. Passwords must meet the requirements below.</DialogDescription>
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
                    <Input type="password" autoComplete="new-password" placeholder="Create a strong password" {...field} />
                  </FormControl>
                  <FormMessage />
                  <div className="text-left text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Password requirements</p>
                    <ul className="mt-2 space-y-1">
                      <li>• At least 8 characters long</li>
                      <li>• Contains uppercase and lowercase letters</li>
                      <li>• Includes a number</li>
                      <li>• Includes a special character</li>
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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

            <DialogFooter>
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
