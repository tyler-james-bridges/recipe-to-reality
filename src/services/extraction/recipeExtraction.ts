/**
 * Recipe Extraction Service
 * Uses server-side API routes for extraction with retry logic and proper error handling
 */

import { ExtractedRecipe } from '../../types'
import { extractVideoTranscript, isVideoURL, getVideoPlatform } from '../video/videoTranscript'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || ''

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
} as const

/**
 * Request timeout in milliseconds
 */
const REQUEST_TIMEOUT_MS = 30000

/**
 * Error types for categorization
 */
export enum ExtractionErrorType {
  NETWORK = 'NETWORK',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for extraction failures
 */
export class ExtractionError extends Error {
  public readonly type: ExtractionErrorType
  public readonly userMessage: string
  public readonly retryable: boolean

  constructor(
    message: string,
    type: ExtractionErrorType,
    userMessage: string,
    retryable: boolean = false
  ) {
    super(message)
    this.name = 'ExtractionError'
    this.type = type
    this.userMessage = userMessage
    this.retryable = retryable
  }
}

/**
 * Categorize an error and return the appropriate ExtractionError
 */
function categorizeError(error: unknown, statusCode?: number): ExtractionError {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const lowerMessage = errorMessage.toLowerCase()

  // Check for timeout (AbortError from AbortController)
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
    return new ExtractionError(
      errorMessage,
      ExtractionErrorType.TIMEOUT,
      'Request timed out. Please try again.',
      true
    )
  }

  // Check for network errors
  if (
    error instanceof TypeError ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('network request failed') ||
    lowerMessage.includes('internet') ||
    lowerMessage.includes('offline')
  ) {
    return new ExtractionError(
      errorMessage,
      ExtractionErrorType.NETWORK,
      'Unable to connect. Please check your internet connection and try again.',
      true
    )
  }

  // Check for API key / server configuration errors
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    lowerMessage.includes('api key') ||
    lowerMessage.includes('apikey') ||
    lowerMessage.includes('invalid key') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('server configuration')
  ) {
    return new ExtractionError(
      errorMessage,
      ExtractionErrorType.SERVER,
      'Service temporarily unavailable. Please try again later.',
      true
    )
  }

  // Check for rate limit errors
  if (
    statusCode === 429 ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('quota exceeded')
  ) {
    return new ExtractionError(
      errorMessage,
      ExtractionErrorType.RATE_LIMIT,
      'Too many requests. Please wait a moment and try again.',
      true
    )
  }

  // Check for server errors
  if (statusCode && statusCode >= 500) {
    return new ExtractionError(
      errorMessage,
      ExtractionErrorType.SERVER,
      'Server error. Please try again later.',
      true
    )
  }

  // Default to unknown error
  return new ExtractionError(
    errorMessage,
    ExtractionErrorType.UNKNOWN,
    errorMessage || 'An unexpected error occurred. Please try again.',
    false
  )
}

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelayMs * Math.pow(2, attempt)
  // Add jitter (0-25% of delay)
  const jitter = delay * Math.random() * 0.25
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs)
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create an AbortController with timeout
 */
function createTimeoutController(timeoutMs: number): {
  controller: AbortController
  timeoutId: ReturnType<typeof setTimeout>
} {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)
  return { controller, timeoutId }
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const { controller, timeoutId } = createTimeoutController(timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Execute a fetch request with retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  let lastError: ExtractionError | null = null

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs)

      // If response is OK, return it
      if (response.ok) {
        return response
      }

      // Parse error response
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorBody = await response.json()
        errorMessage = errorBody.error || errorMessage
      } catch {
        // Ignore JSON parse errors
      }

      // Categorize the error
      const error = categorizeError(new Error(errorMessage), response.status)

      // If error is not retryable, throw immediately
      if (!error.retryable) {
        throw error
      }

      lastError = error

      // If we have retries left, wait and retry
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(attempt)
        await sleep(delay)
      }
    } catch (error) {
      // If already an ExtractionError, preserve it
      if (error instanceof ExtractionError) {
        if (!error.retryable) {
          throw error
        }
        lastError = error
      } else {
        // Categorize the error
        const extractionError = categorizeError(error)
        if (!extractionError.retryable) {
          throw extractionError
        }
        lastError = extractionError
      }

      // If we have retries left, wait and retry
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(attempt)
        await sleep(delay)
      }
    }
  }

  // All retries exhausted, throw the last error
  throw (
    lastError ||
    new ExtractionError(
      'All retries exhausted',
      ExtractionErrorType.UNKNOWN,
      'Unable to extract recipe after multiple attempts. Please try again later.',
      false
    )
  )
}

/**
 * Extract recipe from a URL using the API route
 */
export async function extractRecipe(urlString: string): Promise<ExtractedRecipe> {
  const url = new URL(urlString)

  // Check if this is a video platform URL
  if (isVideoURL(url)) {
    return extractFromVideo(url)
  }

  // Standard webpage extraction via API route
  return extractFromWebpage(url)
}

/**
 * Extract recipe from a video transcript via API route
 */
async function extractFromVideo(url: URL): Promise<ExtractedRecipe> {
  const platform = getVideoPlatform(url)

  try {
    // First get the transcript
    const transcript = await extractVideoTranscript(url)

    // Then call the extract API with the transcript
    const response = await fetchWithRetry(
      `${API_BASE}/api/extract`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.toString(),
          isTranscript: true,
          transcript,
        }),
      },
      REQUEST_TIMEOUT_MS
    )

    const data = await response.json()
    return data as ExtractedRecipe
  } catch (error) {
    // For TikTok/Instagram, fall back to HTML scraping if transcript fails
    if (platform === 'tiktok' || platform === 'instagram') {
      // Re-throw ExtractionError as-is
      if (error instanceof ExtractionError) {
        throw error
      }

      // Try HTML fallback for other errors
      return extractFromWebpage(url)
    }

    // Re-throw ExtractionError as-is
    if (error instanceof ExtractionError) {
      throw error
    }

    // Categorize and throw
    throw categorizeError(error)
  }
}

/**
 * Extract recipe from a webpage via API route
 */
async function extractFromWebpage(url: URL): Promise<ExtractedRecipe> {
  try {
    const response = await fetchWithRetry(
      `${API_BASE}/api/extract`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.toString(),
        }),
      },
      REQUEST_TIMEOUT_MS
    )

    const data = await response.json()
    return data as ExtractedRecipe
  } catch (error) {
    // Re-throw ExtractionError as-is
    if (error instanceof ExtractionError) {
      throw error
    }

    // Categorize and throw
    throw categorizeError(error)
  }
}
