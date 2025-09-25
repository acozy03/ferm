export async function apiFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url)

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
