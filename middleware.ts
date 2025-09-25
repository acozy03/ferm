// middleware.ts
import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_ROUTES = ["/landing", "/auth/callback"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // allow public routes straight through
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return NextResponse.next()
  }

  // Create ONE response to mutate
  let res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", expires: new Date(0), ...options })
        },
      },
    }
  )

  // Touch session (may set/refresh cookies on `res`)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Build redirect and carry over cookies set on `res`
    const url = req.nextUrl.clone()
    url.pathname = "/landing"
    if (pathname !== "/") url.searchParams.set("redirectedFrom", pathname)

    const redirect = NextResponse.redirect(url)
    for (const c of res.cookies.getAll()) {
      redirect.cookies.set(c)
    }
    return redirect
  }

  return res
}

// Keep API and static assets out of middleware
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
