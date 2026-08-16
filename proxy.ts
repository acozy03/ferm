import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

import { getSupabaseConfig } from "@/lib/supabase/config"

const PUBLIC_ROUTES = ["/landing", "/auth/callback", "/privacy"]
const CSRF_COOKIE_NAME = "csrf-token"
const CSRF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (/\.[a-z0-9]+$/i.test(pathname)) {
    return NextResponse.next()
  }
  // allow public routes straight through
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return NextResponse.next()
  }

  let authHeaders: Record<string, string> = {}
  let res = NextResponse.next({ request: req })
  const { url, anonKey } = getSupabaseConfig()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        authHeaders = headers
        cookiesToSet.forEach(({ name, value }) => {
          req.cookies.set(name, value)
        })
        res = NextResponse.next({ request: req })
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([key, value]) => {
          res.headers.set(key, value)
        })
      },
    },
  })

  // Touch session (may set/refresh cookies on `res`)
  const { data, error } = await supabase.auth.getClaims()
  const isAuthenticated = !error && Boolean(data?.claims.sub)

  if (!isAuthenticated) {
    if (req.cookies.get(CSRF_COOKIE_NAME)) {
      res.cookies.delete(CSRF_COOKIE_NAME)
    }
    // Build redirect and carry over cookies set on `res`
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/landing"
    if (pathname !== "/") redirectUrl.searchParams.set("redirectedFrom", pathname)

    const redirect = NextResponse.redirect(redirectUrl)
    for (const c of res.cookies.getAll()) {
      redirect.cookies.set(c)
    }
    Object.entries(authHeaders).forEach(([key, value]) => {
      redirect.headers.set(key, value)
    })
    return redirect
  }

  if (!req.cookies.get(CSRF_COOKIE_NAME)) {
    res.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: crypto.randomUUID(),
      httpOnly: false,
      sameSite: "lax",
      maxAge: CSRF_COOKIE_MAX_AGE_SECONDS,
      secure: process.env.NODE_ENV === "production",
    })
  }

  return res
}

// Keep API and static assets out of the proxy
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
