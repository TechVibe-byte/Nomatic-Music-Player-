/**
 * Utilities for extracting YouTube playlist IDs, fetching playlist metadata and tracks,
 * and converting them into Nomatic Track and Playlist objects.
 */
import { Track } from '../types';

export interface YouTubePlaylistItem {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  duration?: number;
}

export interface YouTubePlaylistResult {
  id: string;
  title: string;
  author: string;
  description: string;
  thumbnail: string;
  itemCount: number;
  tracks: YouTubePlaylistItem[];
}

/**
 * Extracts a YouTube playlist ID from various URL formats or raw ID string.
 */
export function extractYouTubePlaylistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. Direct query parameter ?list=... or &list=...
  const listParamMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  if (listParamMatch && listParamMatch[1]) {
    return listParamMatch[1];
  }

  // 2. Standard playlist prefixes when pasted directly
  // PL (Standard playlists), RD (Mixes), OLAK5uy (YouTube Music albums), UU (Uploads), LL, FL
  if (/^(?:PL|RD|OLAK5uy_|UU|LL|FL|TL)[a-zA-Z0-9_-]+$/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Checks if a given URL or string represents a YouTube playlist.
 */
export function isYouTubePlaylistUrl(input: string): boolean {
  return extractYouTubePlaylistId(input) !== null;
}

/**
 * Parses raw YouTube HTML containing ytInitialData to extract playlist information and tracks.
 */
export function parseYouTubePlaylistHtml(html: string, playlistId: string): YouTubePlaylistResult {
  let data: any = null;

  // Try extracting ytInitialData
  const match = 
    html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
    html.match(/window\["ytInitialData"\]\s*=\s*({.+?});/s) ||
    html.match(/ytInitialData\s*=\s*({.+?});/s);

  if (match && match[1]) {
    try {
      data = JSON.parse(match[1]);
    } catch {
      data = null;
    }
  }

  // Check if YouTube returned alerts (e.g. "The playlist does not exist.", "Playlist is private.")
  if (data?.alerts && Array.isArray(data.alerts)) {
    for (const a of data.alerts) {
      const alertText =
        a?.alertRenderer?.text?.runs?.map((r: any) => r.text).join('') ||
        a?.alertRenderer?.text?.simpleText;
      if (alertText) {
        throw new Error(`YouTube: ${alertText}`);
      }
    }
  }

  // Extract playlist title
  let playlistTitle = 
    data?.metadata?.playlistMetadataRenderer?.title ||
    data?.header?.playlistHeaderRenderer?.title?.simpleText ||
    data?.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text;

  if (!playlistTitle) {
    const titleTagMatch = html.match(/<title>(.*?)(?: - YouTube)?<\/title>/i);
    if (titleTagMatch && titleTagMatch[1]) {
      playlistTitle = titleTagMatch[1].replace(/ - YouTube$/i, '').trim();
    }
  }
  if (!playlistTitle) {
    playlistTitle = `YouTube Playlist (${playlistId.slice(0, 8)}...)`;
  }

  // Extract author / owner
  let playlistAuthor =
    data?.header?.playlistHeaderRenderer?.ownerText?.runs?.[0]?.text ||
    data?.metadata?.playlistMetadataRenderer?.channelName ||
    'YouTube';

  // Extract description
  const description =
    data?.metadata?.playlistMetadataRenderer?.description ||
    data?.header?.playlistHeaderRenderer?.descriptionText?.runs?.[0]?.text ||
    `Imported YouTube playlist with songs detected automatically.`;

  const tracks: YouTubePlaylistItem[] = [];
  const seenIds = new Set<string>();

  if (data) {
    function walk(obj: any) {
      if (!obj || typeof obj !== 'object') return;

      // 1. Modern lockupViewModel (2025/2026 YouTube desktop/mobile web)
      if (obj.lockupViewModel) {
        const lv = obj.lockupViewModel;
        const videoId = 
          lv.contentId || 
          lv.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId;

        if (videoId && !seenIds.has(videoId)) {
          seenIds.add(videoId);
          const label = lv.rendererContext?.accessibilityContext?.label || '';
          const author = 
            lv.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || 
            playlistAuthor;

          // Clean accessibility label: remove trailing duration e.g. "Song Name 3 minutes, 40 seconds"
          let title = label.replace(/\s+\d+\s+(?:minutes?|seconds?|hours?)(?:,\s*\d+\s+seconds?)?$/i, '').trim();
          if (!title) title = `Track (${videoId})`;

          const thumbSources = lv.contentImage?.thumbnailViewModel?.image?.sources;
          const thumbnail = thumbSources && thumbSources.length > 0
            ? thumbSources[thumbSources.length - 1].url
            : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

          tracks.push({ videoId, title, author, thumbnail });
        }
      }

      // 2. Classic playlistVideoRenderer
      if (obj.playlistVideoRenderer) {
        const pvr = obj.playlistVideoRenderer;
        const videoId = pvr.videoId;
        if (videoId && !seenIds.has(videoId)) {
          seenIds.add(videoId);
          const title = pvr.title?.runs?.[0]?.text || pvr.title?.simpleText || `Track (${videoId})`;
          const author = pvr.shortBylineText?.runs?.[0]?.text || playlistAuthor;
          const duration = parseInt(pvr.lengthSeconds || '0', 10);
          const thumbSources = pvr.thumbnail?.thumbnails;
          const thumbnail = thumbSources && thumbSources.length > 0
            ? thumbSources[thumbSources.length - 1].url
            : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

          tracks.push({ videoId, title, author, duration, thumbnail });
        }
      }

      for (const k of Object.keys(obj)) {
        walk(obj[k]);
      }
    }

    walk(data);
  }

  // 3. Fallback regex extraction if structured renderers weren't caught
  if (tracks.length === 0) {
    const videoIdMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
    for (const vm of videoIdMatches) {
      const vid = vm[1];
      if (vid && !seenIds.has(vid)) {
        seenIds.add(vid);
        tracks.push({
          videoId: vid,
          title: `Track ${tracks.length + 1} (${vid})`,
          author: playlistAuthor,
          thumbnail: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
        });
      }
    }
  }

  const playlistThumbnail = tracks[0]?.thumbnail || `https://img.youtube.com/vi/${playlistId}/hqdefault.jpg`;

  return {
    id: playlistId,
    title: playlistTitle,
    author: playlistAuthor,
    description,
    thumbnail: playlistThumbnail,
    itemCount: tracks.length,
    tracks,
  };
}

/**
 * Fetches playlist details and items from YouTube:
 * 1. Checks local proxy endpoint /api/youtube/playlist?id=...
 * 2. If that fails or isn't available, falls back to public proxies
 */
export async function fetchYouTubePlaylist(playlistIdOrUrl: string): Promise<YouTubePlaylistResult> {
  const playlistId = extractYouTubePlaylistId(playlistIdOrUrl);
  if (!playlistId) {
    throw new Error('Invalid YouTube Playlist URL or ID.');
  }

  // 1. Try local server API
  try {
    const apiRes = await fetch(`/api/youtube/playlist?id=${encodeURIComponent(playlistId)}`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && Array.isArray(data.tracks) && data.tracks.length > 0) {
        return data as YouTubePlaylistResult;
      }
    }
  } catch {
    // Continue to fallbacks
  }

  // 2. Try direct fetch (works if running without CORS restriction or behind reverse proxy)
  const targetUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
  try {
    const directRes = await fetch(targetUrl, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (directRes.ok) {
      const html = await directRes.text();
      const parsed = parseYouTubePlaylistHtml(html, playlistId);
      if (parsed.tracks.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Continue to proxy fallback
  }

  // 3. Fallback CORS proxy
  const proxyEndpoints = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
  ];

  for (const proxyUrl of proxyEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const html = await res.text();
        const parsed = parseYouTubePlaylistHtml(html, playlistId);
        if (parsed.tracks.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Try next
    }
  }

  throw new Error(
    'Could not retrieve songs from this YouTube playlist. Please check that the playlist is Public or Unlisted, or try copying individual track links.'
  );
}

/**
 * Converts detected YouTubePlaylistItem objects into SpotFlow Track models.
 */
export function convertPlaylistItemsToTracks(
  items: YouTubePlaylistItem[],
  defaultMode: 'audio' | 'video' = 'audio',
  tag?: string
): Track[] {
  const now = Date.now();
  return items.map((item, index) => {
    return {
      id: `track-${now}-${index}-${item.videoId}`,
      youtubeId: item.videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
      title: item.title,
      artist: item.author,
      thumbnail: item.thumbnail,
      duration: item.duration || 180,
      addedAt: now + index, // preserve order
      modePreference: defaultMode,
      tags: tag ? [tag] : ['YouTube Playlist'],
    };
  });
}
