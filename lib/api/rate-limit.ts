import { NextResponse } from "next/server"

const RATE_LIMIT_BUCKETS = new Map<string, { count: number; resetAt: number }>()

const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX_REQUESTS = 30

type RateLimitConfig = {
  request: Request
  userId: string
  maxRequests?: number
  windowMs?: number
  keyPrefix?: string
}

type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
  remaining: number
  limit: number
  resetAt: number
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp

  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  if (cfConnectingIp) return cfConnectingIp

  return "unknown"
}

function evaluateRateLimit({
  request,
  userId,
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS,
  keyPrefix = "default",
}: RateLimitConfig): RateLimitResult {
  const ip = getClientIp(request)
  const key = `${keyPrefix}:${userId}:${ip}`
  const now = Date.now()

  let bucket = RATE_LIMIT_BUCKETS.get(key)
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs }
    RATE_LIMIT_BUCKETS.set(key, bucket)
  }

  if (bucket.count + 1 > maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
      limit: maxRequests,
      resetAt: bucket.resetAt,
    }
  }

  bucket.count += 1

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, maxRequests - bucket.count),
    limit: maxRequests,
    resetAt: bucket.resetAt,
  }
}

export function enforceRateLimit(config: RateLimitConfig): NextResponse | null {
  const result = evaluateRateLimit(config)
  if (result.allowed) return null

  const response = NextResponse.json(
    { error: "Rate limit exceeded. Please try again later." },
    { status: 429 },
  )
  response.headers.set("Retry-After", String(result.retryAfterSeconds))
  response.headers.set("Cache-Control", "no-store")
  response.headers.set("X-RateLimit-Limit", String(result.limit))
  response.headers.set("X-RateLimit-Remaining", "0")
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)))
  return response
}
