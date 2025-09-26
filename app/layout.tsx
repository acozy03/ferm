import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"
import { MinimalScrollRail } from "@/components/minimal-scroll-rail"
import { Providers } from "./providers"

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: "ferm.dev - Job Application Tracker",
  description: "Minimalistic job application tracking platform"
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Providers>
          <Suspense fallback={null}>{children}</Suspense>
        </Providers>
        <MinimalScrollRail />
        <Analytics />
      </body>
    </html>
  )
}
