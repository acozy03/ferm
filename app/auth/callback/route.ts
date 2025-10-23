// app/auth/callback/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";


function getBaseUrl(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return req.nextUrl.origin; 
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const baseUrl = getBaseUrl(req);

  const next = url.searchParams.get("next") || "/";
  const target = new URL(next, baseUrl);

  const res = NextResponse.redirect(target);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            const safeOptions =
              process.env.NODE_ENV === "development"
                ? { ...options, secure: false }
                : options;
            res.cookies.set(name, value, safeOptions);
          });
        },
      },
    }
  );

  const code = url.searchParams.get("code");
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(new URL("/auth?error=oauth", baseUrl));
      }
    } catch (error) {
      console.error("Failed to exchange OAuth code for Supabase session", error);
      return NextResponse.redirect(new URL("/auth?error=oauth", baseUrl));
    }
  }

  return res;
}
