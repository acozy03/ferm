import type React from "react"
import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"
import { MinimalScrollRail } from "@/components/minimal-scroll-rail"
import { Providers } from "./providers"
import { Toaster } from "@/components/ui/toaster"

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const revalidate = 60
export const runtime = "nodejs"

export const metadata: Metadata = {
  title: "ferm.dev - Job Application Tracker",
  description: "Minimalistic job application tracking platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${jetBrainsMono.variable} antialiased`} suppressHydrationWarning>
        <Providers>
          <Suspense fallback={null}>{children}</Suspense>
          <Toaster />
        </Providers>
        <MinimalScrollRail />
      </body>
    </html>
  )
}
