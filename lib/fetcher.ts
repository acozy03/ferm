const SAFE_HTTP_METHODS = new Set(["GET", "HEAD", "OPTIONS"])
const CSRF_COOKIE_NAME = "csrf-token"
const CSRF_HEADER_NAME = "x-csrf-token"

const getCookieValue = (name: string): string | null => {
  if (typeof document === "undefined") {
    return null
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1]

  return cookieValue ? decodeURIComponent(cookieValue) : null
}

const shouldAttachCsrf = (method: string, headers: Headers): boolean => {
  if (SAFE_HTTP_METHODS.has(method)) {
    return false
  }

  const authHeader = headers.get("authorization") || ""
  if (authHeader.startsWith("Bearer ")) {
    return false
  }

  return !headers.has(CSRF_HEADER_NAME)
}

export const withCsrfHeaders = (init: RequestInit = {}): RequestInit => {
  const headers = new Headers(init.headers)
  const method = (init.method || "GET").toUpperCase()

  if (shouldAttachCsrf(method, headers)) {
    const csrfToken = getCookieValue(CSRF_COOKIE_NAME)
    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken)
    }
  }

  return {
    ...init,
    headers,
  }
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, withCsrfHeaders(init))
}

export async function apiFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })

  if (!response.ok) {
    let errorMessage = "Request failed"

    try {
      const body = await response.json()
      errorMessage = body.error ?? errorMessage
    } catch {
      // ignore json parsing error
    }

    const error = new Error(errorMessage) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  return response.json() as Promise<T>
}
