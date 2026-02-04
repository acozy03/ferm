import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX_REQUESTS = 30
const DEFAULT_PREFIX = "default"

let cachedRedis: Redis | null = null
let cachedInitError: string | null = null
const cachedLimiters = new Map<string, Ratelimit>()

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

function getRedisClient() {
  if (cachedRedis || cachedInitError) {
    return cachedRedis
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    cachedInitError = "Missing Upstash Redis configuration."
    return null
  }

  cachedRedis = new Redis({ url: redisUrl, token: redisToken })
  return cachedRedis
}

function getRateLimiter({
  maxRequests,
  windowMs,
  keyPrefix,
}: {
  maxRequests: number
  windowMs: number
  keyPrefix: string
}) {
  const redis = getRedisClient()
  if (!redis) return null

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000))
  const limiterKey = `${keyPrefix}:${maxRequests}:${windowSeconds}`
  const cachedLimiter = cachedLimiters.get(limiterKey)
  if (cachedLimiter) return cachedLimiter

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
    analytics: false,
    prefix: `ratelimit:${keyPrefix}`,
  })

  cachedLimiters.set(limiterKey, limiter)
  return limiter
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

async function evaluateRateLimit({
  request,
  userId,
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS,
  keyPrefix = DEFAULT_PREFIX,
}: RateLimitConfig): RateLimitResult {
  const ip = getClientIp(request)
  const key = `${userId}:${ip}`
  const now = Date.now()
  const limiter = getRateLimiter({ maxRequests, windowMs, keyPrefix })

  if (!limiter) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: maxRequests,
      limit: maxRequests,
      resetAt: now + windowMs,
    }
  }

  try {
    const result = await limiter.limit(key)
    if (!result.success) {
      const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - now) / 1000))
      return {
        allowed: false,
        retryAfterSeconds,
        remaining: 0,
        limit: result.limit,
        resetAt: result.reset,
      }
    }

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: result.remaining,
      limit: result.limit,
      resetAt: result.reset,
    }
  } catch {
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: maxRequests,
      limit: maxRequests,
      resetAt: now + windowMs,
    }
  }
}

export async function enforceRateLimit(config: RateLimitConfig): Promise<NextResponse | null> {
  const result = await evaluateRateLimit(config)
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
