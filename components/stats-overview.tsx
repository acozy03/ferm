"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react"
import { useDashboardStats } from "@/lib/hooks/use-dashboard-stats"
import { AnimatedNumber } from "@/components/animated-number"

export function StatsOverview() {
  const { stats, isLoading, error } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-12 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Error loading stats</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <AnimatedNumber className="text-2xl font-bold" value={stats.total_applications} />
          <p className="text-xs text-muted-foreground">
            <AnimatedNumber value={stats.applied} fallback={0} /> pending response
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Interviews</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <AnimatedNumber className="text-2xl font-bold" value={stats.interviews} />
          <p className="text-xs text-muted-foreground">
            <AnimatedNumber value={stats.upcoming_interviews} fallback={0} /> upcoming
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Offers</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <AnimatedNumber className="text-2xl font-bold" value={stats.offers} />
          <p className="text-xs text-muted-foreground">
            <AnimatedNumber value={stats.accepted} fallback={0} /> accepted
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Response Rate</CardTitle>
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <AnimatedNumber className="text-2xl font-bold" value={stats.response_rate} suffix="%" />
          <p className="text-xs text-muted-foreground">
            <AnimatedNumber value={stats.rejected} fallback={0} /> rejections
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
