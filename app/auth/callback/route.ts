// app/auth/callback/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getBaseUrl(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host')!
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const next = url.searchParams.get('next') || '/'
  const target = new URL(next, getBaseUrl(req)).toString()

  const res = NextResponse.redirect(target)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const code = url.searchParams.get('code')
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  return res
}
