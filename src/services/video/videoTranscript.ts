/**
 * Video Transcript Service
 * Ported from VideoTranscriptService.swift
 * Enhanced with retry logic, timeout handling, and comprehensive error handling
 */

import * as SecureStore from 'expo-secure-store'
import { VideoPlatform, TranscriptSegment } from '../../types'

// Secure storage keys
const SUPADATA_API_KEY = 'supadata_api_key'

// Configuration constants
const SUPADATA_TIMEOUT_MS = 20000 // 20 seconds for Supadata API calls
const YOUTUBE_TIMEOUT_MS = 15000 // 15 seconds for YouTube scraping
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 1000

/**
 * Custom error class for video transcript operations
 */
export class VideoTranscriptError extends Error {
  readonly platform: VideoPlatform
  readonly isRetryable: boolean
  readonly recoverySuggestion: string
  readonly originalError?: Error

  constructor(
    message: string,
    platform: VideoPlatform,
    options?: {
      isRetryable?: boolean
      recoverySuggestion?: string
      originalError?: Error
    }
  ) {
    super(message)
    this.name = 'VideoTranscriptError'
    this.platform = platform
    this.isRetryable = options?.isRetryable ?? false
    this.originalError = options?.originalError

    // Default recovery suggestions based on platform
    if (options?.recoverySuggestion) {
      this.recoverySuggestion = options.recoverySuggestion
    } else if (platform === 'youtube') {
      this.recoverySuggestion = 'Try a different video or check if captions are available.'
    } else if (platform === 'tiktok' || platform === 'instagram') {
      this.recoverySuggestion = 'Check your Supadata API key in Settings, or try again later.'
    } else {
      this.recoverySuggestion = 'Try using a supported video platform (YouTube, TikTok, Instagram).'
    }
  }
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

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
 * Retry wrapper with exponential backoff and jitter
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries: number
    baseDelayMs: number
    shouldRetry: (error: unknown) => boolean
    operationName: string
  }
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Don't retry if this isn't a retryable error
      if (!options.shouldRetry(error)) {
        throw error
      }

      // Don't retry after the last attempt
      if (attempt === options.maxRetries) {
        break
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = options.baseDelayMs * Math.pow(2, attempt)
      const jitter = Math.random() * options.baseDelayMs
      const delay = exponentialDelay + jitter

      console.log(
        `[VideoTranscript] ${options.operationName} attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Determine if an error is retryable (network issues, timeouts, rate limits)
 */
function isRetryableError(error: unknown): boolean {
  // AbortError indicates timeout
  if (error instanceof Error && error.name === 'AbortError') {
    return true
  }

  // Network errors
  if (error instanceof TypeError && error.message.includes('Network request failed')) {
    return true
  }

  // Check for rate limiting (429) or server errors (5xx)
  if (error instanceof VideoTranscriptError && error.isRetryable) {
    return true
  }

  return false
}

/**
 * Validate API key format
 */
function validateApiKey(apiKey: string | null): apiKey is string {
  if (!apiKey) {
    return false
  }
  const trimmed = apiKey.trim()
  // API key should be non-empty and at least 10 characters
  return trimmed.length >= 10
}

/**
 * Get platform-specific error details
 */
function getPlatformErrorDetails(
  platform: 'tiktok' | 'instagram',
  statusCode: number,
  errorMessage?: string
): { message: string; isRetryable: boolean; recoverySuggestion: string } {
  const platformName = platform === 'tiktok' ? 'TikTok' : 'Instagram'

  switch (statusCode) {
    case 401:
      return {
        message: 'Invalid Supadata API key',
        isRetryable: false,
        recoverySuggestion:
          'Check your API key in Settings > Video Platforms and ensure it is correct.',
      }
    case 403:
      return {
        message: 'Access forbidden. Your API key may not have permission for this content.',
        isRetryable: false,
        recoverySuggestion: 'Verify your Supadata plan includes access to this platform.',
      }
    case 404:
      return {
        message: `No transcript available for this ${platformName} video`,
        isRetryable: false,
        recoverySuggestion: `This ${platformName} video may not have speech or captions. Try a different video.`,
      }
    case 429:
      return {
        message: 'Rate limit exceeded',
        isRetryable: true,
        recoverySuggestion:
          'You have exceeded your API rate limit. Please wait a few minutes and try again.',
      }
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        message: `Supadata service temporarily unavailable (${statusCode})`,
        isRetryable: true,
        recoverySuggestion:
          'The transcript service is experiencing issues. Please try again in a few minutes.',
      }
    default:
      return {
        message: errorMessage || `Unexpected error (HTTP ${statusCode})`,
        isRetryable: statusCode >= 500,
        recoverySuggestion:
          'An unexpected error occurred. Please try again or contact support if the issue persists.',
      }
  }
}

/**
 * Check if URL is a video platform URL
 */
export function isVideoURL(url: URL): boolean {
  return getVideoPlatform(url) !== 'unknown'
}

/**
 * Detect video platform from URL
 */
export function getVideoPlatform(url: URL): VideoPlatform {
  const host = url.hostname.toLowerCase()

  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    return 'youtube'
  } else if (host.includes('tiktok.com')) {
    return 'tiktok'
  } else if (host.includes('instagram.com')) {
    return 'instagram'
  }

  return 'unknown'
}

/**
 * Extract transcript from a video URL
 */
export async function extractVideoTranscript(url: URL): Promise<string> {
  const platform = getVideoPlatform(url)

  switch (platform) {
    case 'youtube':
      return extractYouTubeTranscript(url)
    case 'tiktok':
      return extractSupadataTranscript(url, 'tiktok')
    case 'instagram':
      return extractSupadataTranscript(url, 'instagram')
    default:
      throw new VideoTranscriptError('Unsupported video platform', 'unknown', {
        isRetryable: false,
        recoverySuggestion: 'Please use a YouTube, TikTok, or Instagram video URL.',
      })
  }
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: URL): string | null {
  const urlString = url.toString()

  // Handle youtu.be/VIDEO_ID
  if (url.hostname.includes('youtu.be')) {
    return url.pathname.replace('/', '')
  }

  // Handle youtube.com/watch?v=VIDEO_ID
  const vParam = url.searchParams.get('v')
  if (vParam) {
    return vParam
  }

  // Handle youtube.com/shorts/VIDEO_ID
  if (urlString.includes('/shorts/')) {
    const parts = url.pathname.split('/')
    return parts[parts.length - 1]
  }

  // Handle youtube.com/embed/VIDEO_ID
  if (urlString.includes('/embed/')) {
    const parts = url.pathname.split('/')
    return parts[parts.length - 1]
  }

  return null
}

/**
 * Extract YouTube transcript using innertube API
 */
async function extractYouTubeTranscript(url: URL): Promise<string> {
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) {
    throw new VideoTranscriptError('Could not extract video ID from URL', 'youtube', {
      isRetryable: false,
      recoverySuggestion: 'Please check the URL format is correct.',
    })
  }

  const operation = async (): Promise<string> => {
    // Fetch the video page to get the transcript
    const pageResponse = await fetchWithTimeout(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      },
      YOUTUBE_TIMEOUT_MS
    )

    const html = await pageResponse.text()

    // Extract captions URL from the page
    const captionsMatch = html.match(/"captionTracks":\s*(\[.*?\])/)
    if (!captionsMatch) {
      throw new VideoTranscriptError('No captions available for this video', 'youtube', {
        isRetryable: false,
        recoverySuggestion: 'This video does not have captions enabled. Try a different video.',
      })
    }

    const captionTracks = JSON.parse(captionsMatch[1])
    if (!captionTracks || captionTracks.length === 0) {
      throw new VideoTranscriptError('No captions available for this video', 'youtube', {
        isRetryable: false,
        recoverySuggestion: 'This video does not have captions enabled. Try a different video.',
      })
    }

    // Prefer English captions
    const englishTrack = captionTracks.find(
      (track: Record<string, unknown>) =>
        (track.languageCode as string)?.startsWith('en') || (track.vssId as string)?.includes('.en')
    )
    const track = englishTrack || captionTracks[0]

    if (!track?.baseUrl) {
      throw new VideoTranscriptError('No caption URL found', 'youtube', {
        isRetryable: false,
        recoverySuggestion: 'Could not locate the captions for this video.',
      })
    }

    // Fetch the captions
    const captionsResponse = await fetchWithTimeout(track.baseUrl, {}, YOUTUBE_TIMEOUT_MS)
    const captionsXml = await captionsResponse.text()

    // Parse XML captions using regex.exec() loop for better compatibility
    const textRegex = /<text[^>]*>([^<]*)<\/text>/g
    const segments: string[] = []
    let match: RegExpExecArray | null

    while ((match = textRegex.exec(captionsXml)) !== null) {
      const text = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, ' ')
        .trim()

      if (text) {
        segments.push(text)
      }
    }

    if (segments.length === 0) {
      throw new VideoTranscriptError('No transcript content found', 'youtube', {
        isRetryable: false,
        recoverySuggestion: 'The captions appear to be empty. Try a different video.',
      })
    }

    return segments.join(' ')
  }

  try {
    return await withRetry(operation, {
      maxRetries: MAX_RETRIES,
      baseDelayMs: RETRY_BASE_DELAY_MS,
      shouldRetry: isRetryableError,
      operationName: 'YouTube transcript extraction',
    })
  } catch (error) {
    // Re-throw VideoTranscriptErrors as-is
    if (error instanceof VideoTranscriptError) {
      throw error
    }

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new VideoTranscriptError(
        'Request timed out while fetching YouTube transcript',
        'youtube',
        {
          isRetryable: true,
          recoverySuggestion: 'Check your internet connection and try again.',
          originalError: error,
        }
      )
    }

    // Wrap other errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new VideoTranscriptError(`Failed to extract transcript: ${errorMessage}`, 'youtube', {
      isRetryable: isRetryableError(error),
      originalError: error instanceof Error ? error : undefined,
    })
  }
}

/**
 * Extract transcript using Supadata API (for TikTok and Instagram)
 */
async function extractSupadataTranscript(
  url: URL,
  platform: 'tiktok' | 'instagram'
): Promise<string> {
  const platformName = platform === 'tiktok' ? 'TikTok' : 'Instagram'
  const apiKey = await getSupadataAPIKey()

  // Validate API key
  if (!validateApiKey(apiKey)) {
    throw new VideoTranscriptError(
      `Supadata API key required for ${platformName} videos`,
      platform,
      {
        isRetryable: false,
        recoverySuggestion: 'Configure your Supadata API key in Settings > Video Platforms.',
      }
    )
  }

  const operation = async (): Promise<string> => {
    const response = await fetchWithTimeout(
      'https://api.supadata.ai/v1/transcript',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.toString(),
        }),
      },
      SUPADATA_TIMEOUT_MS
    )

    if (!response.ok) {
      let errorMessage: string | undefined
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message
      } catch {
        // Ignore JSON parse errors
      }

      const errorDetails = getPlatformErrorDetails(platform, response.status, errorMessage)
      throw new VideoTranscriptError(errorDetails.message, platform, {
        isRetryable: errorDetails.isRetryable,
        recoverySuggestion: errorDetails.recoverySuggestion,
      })
    }

    const data = await response.json()

    // Handle different response formats
    if (Array.isArray(data.transcript)) {
      const segments = data.transcript.map((item: Record<string, unknown>) => item.text as string)
      const transcript = segments.join(' ')
      if (!transcript.trim()) {
        throw new VideoTranscriptError(
          `No transcript content found for this ${platformName} video`,
          platform,
          {
            isRetryable: false,
            recoverySuggestion: `This ${platformName} video may not have spoken content.`,
          }
        )
      }
      return transcript
    } else if (typeof data.text === 'string') {
      if (!data.text.trim()) {
        throw new VideoTranscriptError(
          `No transcript content found for this ${platformName} video`,
          platform,
          {
            isRetryable: false,
            recoverySuggestion: `This ${platformName} video may not have spoken content.`,
          }
        )
      }
      return data.text
    }

    throw new VideoTranscriptError('Failed to parse transcript response', platform, {
      isRetryable: false,
      recoverySuggestion: 'The transcript service returned an unexpected format.',
    })
  }

  try {
    return await withRetry(operation, {
      maxRetries: MAX_RETRIES,
      baseDelayMs: RETRY_BASE_DELAY_MS,
      shouldRetry: isRetryableError,
      operationName: `${platformName} transcript extraction`,
    })
  } catch (error) {
    // Re-throw VideoTranscriptErrors as-is
    if (error instanceof VideoTranscriptError) {
      throw error
    }

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new VideoTranscriptError(
        `Request timed out while fetching ${platformName} transcript`,
        platform,
        {
          isRetryable: true,
          recoverySuggestion: 'Check your internet connection and try again.',
          originalError: error,
        }
      )
    }

    // Wrap other errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new VideoTranscriptError(`Failed to extract transcript: ${errorMessage}`, platform, {
      isRetryable: isRetryableError(error),
      originalError: error instanceof Error ? error : undefined,
    })
  }
}

/**
 * Test Supadata API key validity
 */
export async function testSupadataAPIKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  if (!validateApiKey(apiKey)) {
    return { valid: false, error: 'API key is too short or invalid format.' }
  }

  try {
    // Use the Supadata health/validation endpoint if available, or a minimal test request
    const response = await fetchWithTimeout(
      'https://api.supadata.ai/v1/transcript',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://www.tiktok.com/@test/video/1234567890',
        }),
      },
      10000 // 10 second timeout for validation
    )

    // 401 means invalid key, other errors might just mean the test URL doesn't work
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key.' }
    }

    // Any other response (including 404 for non-existent video) means the key is valid
    return { valid: true }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { valid: false, error: 'Connection timed out. Please check your internet connection.' }
    }
    return {
      valid: false,
      error: 'Could not validate API key. Please check your internet connection.',
    }
  }
}

/**
 * Supadata API Key Management
 */
export async function saveSupadataAPIKey(apiKey: string): Promise<void> {
  const trimmedKey = apiKey.trim()
  if (!validateApiKey(trimmedKey)) {
    throw new Error('Invalid API key format')
  }
  await SecureStore.setItemAsync(SUPADATA_API_KEY, trimmedKey)
}

export async function getSupadataAPIKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SUPADATA_API_KEY)
  } catch {
    return null
  }
}

export async function hasSupadataAPIKey(): Promise<boolean> {
  const key = await getSupadataAPIKey()
  return validateApiKey(key)
}

export async function deleteSupadataAPIKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SUPADATA_API_KEY)
}
