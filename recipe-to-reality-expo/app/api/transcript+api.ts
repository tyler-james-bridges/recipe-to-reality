/**
 * Video Transcript API Route
 * Server-side video transcript extraction for YouTube, TikTok, Instagram
 */

interface TranscriptRequest {
  url: string;
  platform: 'youtube' | 'tiktok' | 'instagram';
  supadataApiKey?: string;
}

interface TranscriptResponse {
  transcript: string;
  platform: string;
}

export async function POST(request: Request) {
  try {
    const body: TranscriptRequest = await request.json();
    const { url, platform, supadataApiKey } = body;

    if (!url || !platform) {
      return Response.json(
        { error: 'Missing required fields: url, platform' },
        { status: 400 }
      );
    }

    let transcript: string;

    switch (platform) {
      case 'youtube':
        transcript = await extractYouTubeTranscript(url);
        break;
      case 'tiktok':
      case 'instagram':
        if (!supadataApiKey) {
          return Response.json(
            { error: `Supadata API key required for ${platform} videos` },
            { status: 400 }
          );
        }
        transcript = await extractSupadataTranscript(url, supadataApiKey);
        break;
      default:
        return Response.json({ error: 'Unsupported platform' }, { status: 400 });
    }

    return Response.json({ transcript, platform } as TranscriptResponse);
  } catch (error) {
    console.error('Transcript extraction error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

function extractYouTubeVideoId(urlString: string): string | null {
  const url = new URL(urlString);

  if (url.hostname.includes('youtu.be')) {
    return url.pathname.replace('/', '');
  }

  const vParam = url.searchParams.get('v');
  if (vParam) {
    return vParam;
  }

  if (urlString.includes('/shorts/')) {
    const parts = url.pathname.split('/');
    return parts[parts.length - 1];
  }

  if (urlString.includes('/embed/')) {
    const parts = url.pathname.split('/');
    return parts[parts.length - 1];
  }

  return null;
}

async function extractYouTubeTranscript(urlString: string): Promise<string> {
  const videoId = extractYouTubeVideoId(urlString);
  if (!videoId) {
    throw new Error('Could not extract video ID from URL');
  }

  const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    },
  });

  const html = await pageResponse.text();

  const captionsMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
  if (!captionsMatch) {
    throw new Error('No captions available for this video');
  }

  const captionTracks = JSON.parse(captionsMatch[1]);
  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('No captions available for this video');
  }

  const englishTrack = captionTracks.find(
    (track: Record<string, unknown>) =>
      (track.languageCode as string)?.startsWith('en') ||
      (track.vssId as string)?.includes('.en')
  );
  const track = englishTrack || captionTracks[0];

  if (!track?.baseUrl) {
    throw new Error('No caption URL found');
  }

  const captionsResponse = await fetch(track.baseUrl);
  const captionsXml = await captionsResponse.text();

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
}

async function extractSupadataTranscript(
  urlString: string,
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.supadata.ai/v1/transcript', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: urlString,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid Supadata API key');
    if (response.status === 429)
      throw new Error('Rate limited. Please try again later.');
    if (response.status === 404)
      throw new Error('No transcript available for this video');

    const error = await response.json();
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();

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
