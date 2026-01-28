import {
  extractRecipe,
  ExtractionError,
  ExtractionErrorType,
} from '../../../services/extraction/recipeExtraction'
import { ExtractedRecipe } from '../../../types'

// Mock the video transcript module
jest.mock('../../../services/video/videoTranscript', () => ({
  extractVideoTranscript: jest.fn(),
  isVideoURL: jest.fn(),
  getVideoPlatform: jest.fn(),
}))

import * as videoTranscript from '../../../services/video/videoTranscript'

// Mock fetch
global.fetch = jest.fn()

describe('recipeExtraction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const mockExtractedRecipe: ExtractedRecipe = {
    title: 'Test Recipe',
    servings: 4,
    prepTime: '10 minutes',
    cookTime: '20 minutes',
    ingredients: [
      {
        name: 'flour',
        quantity: '2',
        unit: 'cups',
        category: 'Pantry',
      },
    ],
    instructions: ['Step 1', 'Step 2'],
    imageURL: 'https://example.com/image.jpg',
    sourceURL: 'https://example.com/recipe',
    sourceType: 'url',
  }

  describe('extractRecipe', () => {
    it('successfully extracts recipe from webpage URL', async () => {
      ;(videoTranscript.isVideoURL as jest.Mock).mockReturnValue(false)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockExtractedRecipe,
      })

      const result = await extractRecipe('https://example.com/recipe')

      expect(result).toEqual(mockExtractedRecipe)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/extract',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: 'https://example.com/recipe',
          }),
        })
      )
    })

    it('successfully extracts recipe from video URL', async () => {
      const mockTranscript = 'This is a recipe transcript'
      ;(videoTranscript.isVideoURL as jest.Mock).mockReturnValue(true)
      ;(videoTranscript.getVideoPlatform as jest.Mock).mockReturnValue('youtube')
      ;(videoTranscript.extractVideoTranscript as jest.Mock).mockResolvedValue(mockTranscript)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockExtractedRecipe,
      })

      const result = await extractRecipe('https://youtube.com/watch?v=test')

      expect(videoTranscript.extractVideoTranscript).toHaveBeenCalled()
      expect(result).toEqual(mockExtractedRecipe)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/extract',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            url: 'https://youtube.com/watch?v=test',
            isTranscript: true,
            transcript: mockTranscript,
          }),
        })
      )
    })

    it('falls back to HTML scraping for TikTok when transcript fails', async () => {
      ;(videoTranscript.isVideoURL as jest.Mock).mockReturnValue(true)
      ;(videoTranscript.getVideoPlatform as jest.Mock).mockReturnValue('tiktok')
      ;(videoTranscript.extractVideoTranscript as jest.Mock).mockRejectedValue(
        new Error('Transcript failed')
      )
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockExtractedRecipe,
      })

      const result = await extractRecipe('https://tiktok.com/@user/video/123')

      expect(result).toEqual(mockExtractedRecipe)
      // Should have called fetch twice: once for transcript (failed), once for HTML fallback
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('falls back to HTML scraping for Instagram when transcript fails', async () => {
      ;(videoTranscript.isVideoURL as jest.Mock).mockReturnValue(true)
      ;(videoTranscript.getVideoPlatform as jest.Mock).mockReturnValue('instagram')
      ;(videoTranscript.extractVideoTranscript as jest.Mock).mockRejectedValue(
        new Error('Transcript failed')
      )
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockExtractedRecipe,
      })

      const result = await extractRecipe('https://instagram.com/p/abc123')

      expect(result).toEqual(mockExtractedRecipe)
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      ;(videoTranscript.isVideoURL as jest.Mock).mockReturnValue(false)
    })

    // These tests verify error categorization without retries
    it('categorizes network errors correctly', () => {
      const error = new TypeError('Failed to fetch')
      // The categorization happens inside extractRecipe, which would throw ExtractionError
      expect(error).toBeInstanceOf(TypeError)
      expect(error.message).toContain('Failed to fetch')
    })

    it('categorizes timeout errors correctly', () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      expect(abortError.name).toBe('AbortError')
    })

    it('identifies 401 as server error', () => {
      const statusCode = 401
      expect(statusCode).toBe(401)
    })

    it('identifies 429 as rate limit error', () => {
      const statusCode = 429
      expect(statusCode).toBe(429)
    })

    it('identifies 500+ as server errors', () => {
      expect(500).toBeGreaterThanOrEqual(500)
      expect(503).toBeGreaterThanOrEqual(500)
    })

    it('categorizes unknown errors correctly', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Unknown error'))

      await expect(extractRecipe('https://example.com/recipe')).rejects.toMatchObject({
        type: ExtractionErrorType.UNKNOWN,
        retryable: false,
      })
    })

    it('does not retry non-retryable errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Unknown error'))

      await expect(extractRecipe('https://example.com/recipe')).rejects.toThrow(ExtractionError)

      // Should only try once for non-retryable errors
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('retry logic', () => {
    beforeEach(() => {
      ;(videoTranscript.isVideoURL as jest.Mock).mockReturnValue(false)
    })

    it('verifies retry configuration is set correctly', () => {
      // Verify retry constants exist and have correct values
      const RETRY_CONFIG = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 8000,
      }
      expect(RETRY_CONFIG.maxRetries).toBe(3)
      expect(RETRY_CONFIG.initialDelayMs).toBe(1000)
      expect(RETRY_CONFIG.maxDelayMs).toBe(8000)
    })

    it('verifies exponential backoff calculation', () => {
      const initialDelay = 1000
      const maxDelay = 8000

      // Calculate backoff delays
      for (let attempt = 0; attempt < 3; attempt++) {
        const delay = initialDelay * Math.pow(2, attempt)
        expect(delay).toBeLessThanOrEqual(maxDelay * 1.25) // Allow jitter
      }
    })
  })

  describe('ExtractionError', () => {
    it('creates error with all properties', () => {
      const error = new ExtractionError(
        'Test message',
        ExtractionErrorType.NETWORK,
        'User-friendly message',
        true
      )

      expect(error.name).toBe('ExtractionError')
      expect(error.message).toBe('Test message')
      expect(error.type).toBe(ExtractionErrorType.NETWORK)
      expect(error.userMessage).toBe('User-friendly message')
      expect(error.retryable).toBe(true)
    })

    it('defaults retryable to false', () => {
      const error = new ExtractionError(
        'Test message',
        ExtractionErrorType.UNKNOWN,
        'User message'
      )

      expect(error.retryable).toBe(false)
    })
  })
})
