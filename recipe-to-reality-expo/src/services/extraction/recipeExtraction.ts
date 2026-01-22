/**
 * Recipe Extraction Service
 * Uses server-side API routes for extraction
 */

import { ExtractedRecipe, AIProviderType } from '../../types';
import { useSettingsStore } from '../../stores/settingsStore';
import { getAPIKey } from '../ai';
import { extractVideoTranscript, isVideoURL, getVideoPlatform } from '../video/videoTranscript';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

/**
 * Extract recipe from a URL using the API route
 */
export async function extractRecipe(urlString: string): Promise<ExtractedRecipe> {
  const url = new URL(urlString);
  const provider = useSettingsStore.getState().aiProvider;
  const apiKey = await getAPIKey(provider);

  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}. Please add your API key in Settings.`);
  }

  // Check if this is a video platform URL
  if (isVideoURL(url)) {
    return extractFromVideo(url, { apiKey, provider });
  }

  // Standard webpage extraction via API route
  return extractFromWebpage(url, { apiKey, provider });
}

/**
 * Extract recipe from a video transcript via API route
 */
async function extractFromVideo(
  url: URL,
  settings: { apiKey: string; provider: AIProviderType }
): Promise<ExtractedRecipe> {
  const platform = getVideoPlatform(url);

  try {
    // First get the transcript
    const transcript = await extractVideoTranscript(url);

    // Then call the extract API with the transcript
    const response = await fetch(`${API_BASE}/api/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url.toString(),
        provider: settings.provider,
        apiKey: settings.apiKey,
        isTranscript: true,
        transcript,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // For TikTok/Instagram, fall back to HTML scraping if transcript fails
    if (platform === 'tiktok' || platform === 'instagram') {
      const errorMessage = (error as Error).message;
      // Re-throw API key errors - user needs to configure
      if (errorMessage.includes('API key required')) {
        throw error;
      }
      // Try HTML fallback for other errors
      return extractFromWebpage(url, settings);
    }
    throw error;
  }
}

/**
 * Extract recipe from a webpage via API route
 */
async function extractFromWebpage(
  url: URL,
  settings: { apiKey: string; provider: AIProviderType }
): Promise<ExtractedRecipe> {
  const response = await fetch(`${API_BASE}/api/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url.toString(),
      provider: settings.provider,
      apiKey: settings.apiKey,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}
