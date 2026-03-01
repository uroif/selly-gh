

export interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  onRetry?: (attempt: number, error: Error) => void
}


export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, onRetry } = options
  
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      
      if (attempt === maxAttempts) {
        break
      }
      
      
      onRetry?.(attempt, lastError)
      
      
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  throw lastError
}


export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  
  const errorMessage = error.message.toLowerCase()
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection')
  )
}
