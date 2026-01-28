/**
 * Custom error classes for Recipe to Reality
 * Provides user-friendly error messages and recovery suggestions
 */

/**
 * Base application error with user-friendly messaging
 */
export abstract class AppError extends Error {
  abstract readonly userMessage: string
  abstract readonly recoverySuggestion: string
  abstract readonly isRetryable: boolean

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * API key is missing or invalid
 */
export class APIKeyError extends AppError {
  readonly userMessage: string
  readonly recoverySuggestion: string
  readonly isRetryable = false
  readonly provider: string

  constructor(provider: string, message?: string) {
    super(message || `Invalid or missing API key for ${provider}`)
    this.provider = provider
    this.userMessage = `No API key configured for ${provider}`
    this.recoverySuggestion = `Go to Settings > AI Provider to add your ${provider} API key`
  }
}

/**
 * Rate limit exceeded
 */
export class RateLimitError extends AppError {
  readonly userMessage = 'Too many requests'
  readonly recoverySuggestion = 'Please wait a moment and try again'
  readonly isRetryable = true
  readonly retryAfterMs?: number

  constructor(message?: string, retryAfterMs?: number) {
    super(message || 'Rate limit exceeded')
    this.retryAfterMs = retryAfterMs
  }
}

/**
 * Network connection issues
 */
export class NetworkError extends AppError {
  readonly userMessage = 'Connection failed'
  readonly recoverySuggestion = 'Check your internet connection and try again'
  readonly isRetryable = true

  constructor(message?: string) {
    super(message || 'Network request failed')
  }
}

/**
 * Recipe extraction failed
 */
export class ExtractionError extends AppError {
  readonly userMessage: string
  readonly recoverySuggestion: string
  readonly isRetryable: boolean
  readonly sourceURL?: string

  constructor(
    message: string,
    options?: {
      userMessage?: string
      recoverySuggestion?: string
      isRetryable?: boolean
      sourceURL?: string
    }
  ) {
    super(message)
    this.sourceURL = options?.sourceURL
    this.isRetryable = options?.isRetryable ?? true
    this.userMessage = options?.userMessage || 'Failed to extract recipe'
    this.recoverySuggestion =
      options?.recoverySuggestion || 'Try a different URL or manually enter the recipe'
  }
}

/**
 * Video transcript extraction failed
 */
export class TranscriptError extends AppError {
  readonly userMessage: string
  readonly recoverySuggestion: string
  readonly isRetryable: boolean
  readonly platform: string

  constructor(
    platform: string,
    message?: string,
    options?: {
      userMessage?: string
      recoverySuggestion?: string
      isRetryable?: boolean
    }
  ) {
    super(message || `Failed to extract transcript from ${platform}`)
    this.platform = platform
    this.isRetryable = options?.isRetryable ?? true
    this.userMessage = options?.userMessage || `Could not get ${platform} transcript`

    if (platform === 'youtube') {
      this.recoverySuggestion =
        options?.recoverySuggestion || 'This video may not have captions. Try a different video.'
    } else {
      this.recoverySuggestion =
        options?.recoverySuggestion ||
        'Check your Supadata API key in Settings, or try a different video.'
    }
  }
}

/**
 * Server error (5xx responses)
 */
export class ServerError extends AppError {
  readonly userMessage = 'Server error'
  readonly recoverySuggestion = 'Please try again later'
  readonly isRetryable = true
  readonly statusCode?: number

  constructor(message?: string, statusCode?: number) {
    super(message || 'Server error occurred')
    this.statusCode = statusCode
  }
}

/**
 * Request timeout
 */
export class TimeoutError extends AppError {
  readonly userMessage = 'Request timed out'
  readonly recoverySuggestion = 'Check your connection and try again'
  readonly isRetryable = true

  constructor(message?: string) {
    super(message || 'Request timed out')
  }
}

/**
 * Categorize an unknown error into a typed AppError
 */
export function categorizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  const message = error instanceof Error ? error.message : String(error)
  const lowerMessage = message.toLowerCase()

  // Check for API key errors
  if (
    lowerMessage.includes('api key') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('401')
  ) {
    return new APIKeyError('unknown', message)
  }

  // Check for rate limit errors
  if (
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('429')
  ) {
    return new RateLimitError(message)
  }

  // Check for network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('offline')
  ) {
    return new NetworkError(message)
  }

  // Check for timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('aborted')) {
    return new TimeoutError(message)
  }

  // Check for server errors
  if (lowerMessage.includes('500') || lowerMessage.includes('server')) {
    return new ServerError(message)
  }

  // Default to extraction error for unknown errors
  return new ExtractionError(message, {
    userMessage: 'Something went wrong',
    recoverySuggestion: 'Please try again',
    isRetryable: true,
  })
}

/**
 * Get user-friendly error info from any error
 */
export function getErrorInfo(error: unknown): {
  title: string
  message: string
  suggestion: string
  isRetryable: boolean
} {
  const appError = categorizeError(error)

  return {
    title: appError.name.replace(/Error$/, ' Error'),
    message: appError.userMessage,
    suggestion: appError.recoverySuggestion,
    isRetryable: appError.isRetryable,
  }
}
