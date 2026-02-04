import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const CHECK_EMAIL_RATE_LIMIT_MAX_ATTEMPTS = 5
const CHECK_EMAIL_RATE_LIMIT_WINDOW_SECONDS = 10 * 60

let cachedLimiter: Ratelimit | null = null
let cachedInitError: string | null = null

function getRateLimiter() {
  if (cachedLimiter || cachedInitError) {
    return cachedLimiter
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    cachedInitError = "Missing Upstash Redis configuration."
    return null
  }

  const redis = new Redis({ url: redisUrl, token: redisToken })

  cachedLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      CHECK_EMAIL_RATE_LIMIT_MAX_ATTEMPTS,
      `${CHECK_EMAIL_RATE_LIMIT_WINDOW_SECONDS} s`,
    ),
    analytics: false,
    prefix: "ratelimit:check-email",
  })

  return cachedLimiter
}

export type RateLimitResult = {
  success: boolean
  remaining?: number
  reset?: number
  error?: string
}

export async function checkEmailRateLimit(key: string): Promise<RateLimitResult> {
  const limiter = getRateLimiter()

  if (!limiter) {
    return {
      success: false,
      error: cachedInitError ?? "Rate limiter is not configured.",
    }
  }

  try {
    const result = await limiter.limit(key)
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch {
    return { success: false, error: "Rate limiter request failed." }
  }
}
