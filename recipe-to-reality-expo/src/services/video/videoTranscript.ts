/**
 * Video Transcript Service
 * Ported from VideoTranscriptService.swift
 */

import * as SecureStore from 'expo-secure-store';
import { VideoPlatform, TranscriptSegment } from '../../types';

// Secure storage keys
const SUPADATA_API_KEY = 'supadata_api_key';

/**
 * Check if URL is a video platform URL
 */
export function isVideoURL(url: URL): boolean {
  return getVideoPlatform(url) !== 'unknown';
}

/**
 * Detect video platform from URL
 */
export function getVideoPlatform(url: URL): VideoPlatform {
  const host = url.hostname.toLowerCase();

  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    return 'youtube';
  } else if (host.includes('tiktok.com')) {
    return 'tiktok';
  } else if (host.includes('instagram.com')) {
    return 'instagram';
  }

  return 'unknown';
}

/**
 * Extract transcript from a video URL
 */
export async function extractVideoTranscript(url: URL): Promise<string> {
  const platform = getVideoPlatform(url);

  switch (platform) {
    case 'youtube':
      return extractYouTubeTranscript(url);
    case 'tiktok':
      return extractSupadataTranscript(url, 'tiktok');
    case 'instagram':
      return extractSupadataTranscript(url, 'instagram');
    default:
      throw new Error('Unsupported video platform');
  }
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: URL): string | null {
  const urlString = url.toString();

  // Handle youtu.be/VIDEO_ID
  if (url.hostname.includes('youtu.be')) {
    return url.pathname.replace('/', '');
  }

  // Handle youtube.com/watch?v=VIDEO_ID
  const vParam = url.searchParams.get('v');
  if (vParam) {
    return vParam;
  }

  // Handle youtube.com/shorts/VIDEO_ID
  if (urlString.includes('/shorts/')) {
    const parts = url.pathname.split('/');
    return parts[parts.length - 1];
  }

  // Handle youtube.com/embed/VIDEO_ID
  if (urlString.includes('/embed/')) {
    const parts = url.pathname.split('/');
    return parts[parts.length - 1];
  }

  return null;
}

/**
 * Extract YouTube transcript using innertube API
 */
async function extractYouTubeTranscript(url: URL): Promise<string> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Could not extract video ID from URL');
  }

  try {
    // Fetch the video page to get the transcript
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });

    const html = await pageResponse.text();

    // Extract captions URL from the page
    const captionsMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionsMatch) {
      throw new Error('No captions available for this video');
    }

    const captionTracks = JSON.parse(captionsMatch[1]);
    if (!captionTracks || captionTracks.length === 0) {
      throw new Error('No captions available for this video');
    }

    // Prefer English captions
    const englishTrack = captionTracks.find(
      (track: Record<string, unknown>) =>
        (track.languageCode as string)?.startsWith('en') ||
        (track.vssId as string)?.includes('.en')
    );
    const track = englishTrack || captionTracks[0];

    if (!track?.baseUrl) {
      throw new Error('No caption URL found');
    }

    // Fetch the captions
    const captionsResponse = await fetch(track.baseUrl);
    const captionsXml = await captionsResponse.text();

    // Parse XML captions
    const textMatches = captionsXml.matchAll(/<text[^>]*>([^<]*)<\/text>/g);
    const segments: string[] = [];

    for (const match of textMatches) {
      const text = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, ' ')
        .trim();

      if (text) {
        segments.push(text);
      }
    }

    if (segments.length === 0) {
      throw new Error('No transcript content found');
    }

    return segments.join(' ');
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('captions') || errorMessage.includes('transcript')) {
      throw error;
    }
    throw new Error(`Failed to extract transcript: ${errorMessage}`);
  }
}

/**
 * Extract transcript using Supadata API (for TikTok and Instagram)
 */
async function extractSupadataTranscript(url: URL, platform: 'tiktok' | 'instagram'): Promise<string> {
  const apiKey = await getSupadataAPIKey();

  if (!apiKey) {
    const platformName = platform === 'tiktok' ? 'TikTok' : 'Instagram';
    throw new Error(`Supadata API key required for ${platformName} videos. Configure it in Settings.`);
  }

  const response = await fetch('https://api.supadata.ai/v1/transcript', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url.toString(),
    }),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid Supadata API key');
    if (response.status === 429) throw new Error('Rate limited. Please try again later.');
    if (response.status === 404) throw new Error('No transcript available for this video');

    const error = await response.json();
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();

  // Handle different response formats
  if (Array.isArray(data.transcript)) {
    const segments = data.transcript.map(
      (item: Record<string, unknown>) => item.text as string
    );
    return segments.join(' ');
  } else if (typeof data.text === 'string') {
    return data.text;
  }

  throw new Error('Failed to parse transcript response');
}

/**
 * Supadata API Key Management
 */
export async function saveSupadataAPIKey(apiKey: string): Promise<void> {
  await SecureStore.setItemAsync(SUPADATA_API_KEY, apiKey);
}

export async function getSupadataAPIKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SUPADATA_API_KEY);
  } catch {
    return null;
  }
}

export async function hasSupadataAPIKey(): Promise<boolean> {
  const key = await getSupadataAPIKey();
  return key !== null && key.length > 0;
}

export async function deleteSupadataAPIKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SUPADATA_API_KEY);
}
