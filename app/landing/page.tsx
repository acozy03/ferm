import type { Metadata } from "next"

import LandingPage from "./landing-client"

export const dynamic = "force-static"
export const revalidate = 86400

export const metadata: Metadata = {
  title: "ferm – Job Application Tracker",
  description: "Track applications, prep interviews, and manage your job search with ferm.",
}

export default function LandingPageRoute() {
  return <LandingPage />
}
