/**
 * Recipe Extraction Service
 * Ported from RecipeExtractionService.swift
 */

import { ExtractedRecipe } from '../../types';
import { getAIProvider } from '../ai';
import { extractVideoTranscript, isVideoURL, getVideoPlatform } from '../video/videoTranscript';

/**
 * Extract recipe from a URL using AI
 */
export async function extractRecipe(urlString: string): Promise<ExtractedRecipe> {
  const url = new URL(urlString);

  // Check if this is a video platform URL
  if (isVideoURL(url)) {
    return extractFromVideo(url);
  }

  // Standard webpage extraction
  return extractFromWebpage(url);
}

/**
 * Extract recipe from a video transcript
 */
async function extractFromVideo(url: URL): Promise<ExtractedRecipe> {
  const platform = getVideoPlatform(url);

  try {
    const transcript = await extractVideoTranscript(url);
    const provider = await getAIProvider();
    return provider.extractRecipeFromTranscript(transcript, url);
  } catch (error) {
    // For TikTok/Instagram, fall back to HTML scraping if transcript fails
    if (platform === 'tiktok' || platform === 'instagram') {
      const errorMessage = (error as Error).message;
      // Re-throw API key errors - user needs to configure
      if (errorMessage.includes('API key required')) {
        throw error;
      }
      // Try HTML fallback for other errors
      return extractFromWebpage(url);
    }
    throw error;
  }
}

/**
 * Extract recipe from a webpage
 */
async function extractFromWebpage(url: URL): Promise<ExtractedRecipe> {
  const content = await fetchWebContent(url);
  const provider = await getAIProvider();
  return provider.extractRecipe(content, url);
}

/**
 * Fetch and clean webpage content
 */
async function fetchWebContent(url: URL): Promise<string> {
  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status}`);
  }

  const html = await response.text();
  return stripHTML(html);
}

/**
 * Strip HTML tags and clean content for AI processing
 */
function stripHTML(html: string): string {
  let result = html;

  // Remove script tags and content
  result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove style tags and content
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML tags
  result = result.replace(/<[^>]+>/g, ' ');

  // Clean up whitespace
  result = result.replace(/\s+/g, ' ');

  // Decode HTML entities
  result = result.replace(/&nbsp;/g, ' ');
  result = result.replace(/&amp;/g, '&');
  result = result.replace(/&lt;/g, '<');
  result = result.replace(/&gt;/g, '>');
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&#39;/g, "'");

  // Limit content length to avoid token limits
  if (result.length > 15000) {
    result = result.substring(0, 15000);
  }

  return result.trim();
}
