/**
 * Utilities for extracting YouTube playlist IDs, fetching playlist metadata and tracks,
 * and converting them into Nomatic Track and Playlist objects.
 */
import { Track, Playlist } from '../types';
import { normalizeYouTubeThumbnail } from './youtube';

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
 * Handles mobile YouTube shares (m.youtube.com, youtu.be/?list=, etc.), URL encoded links,
 * and surrounding share text from Android/iOS YouTube apps.
 */
export function extractYouTubePlaylistId(input: string): string | null {
  if (!input) return null;
  let decoded = input.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // ignore decode error
  }

  // 1. Direct query parameter ?list=... or &list=...
  const listParamMatch = decoded.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  if (listParamMatch && listParamMatch[1]) {
    return listParamMatch[1];
  }

  // 2. /playlist/ID or /playlist?list=ID
  const slashMatch = decoded.match(/\/playlist\/([a-zA-Z0-9_-]+)/i);
  if (slashMatch && slashMatch[1]) {
    return slashMatch[1];
  }

  // 3. Clean raw playlist prefixes (PL, RD, OLAK5uy_, UU, LL, FL, TL)
  const prefixMatch = decoded.match(/\b(PL|RD|OLAK5uy_|UU|LL|FL|TL)[a-zA-Z0-9_-]{10,}\b/i);
  if (prefixMatch && prefixMatch[0]) {
    return prefixMatch[0];
  }

  // 4. Exact raw ID string
  if (/^(?:PL|RD|OLAK5uy_|UU|LL|FL|TL)[a-zA-Z0-9_-]+$/i.test(decoded)) {
    return decoded;
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

          // Always generate canonical, permanent, unexpired YouTube thumbnail
          const thumbnail = normalizeYouTubeThumbnail('', videoId);

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
          const thumbnail = normalizeYouTubeThumbnail('', videoId);

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
          thumbnail: normalizeYouTubeThumbnail('', vid),
        });
      }
    }
  }

  const playlistThumbnail = tracks[0]?.thumbnail || normalizeYouTubeThumbnail('', playlistId);

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
 * Parses JSON response from open Invidious instances (which support CORS on mobile browsers)
 */
export function parseInvidiousPlaylist(data: any, playlistId: string): YouTubePlaylistResult {
  const tracks: YouTubePlaylistItem[] = [];
  const seenIds = new Set<string>();

  if (Array.isArray(data?.videos)) {
    for (const v of data.videos) {
      const vid = v.videoId;
      if (vid && typeof vid === 'string' && !seenIds.has(vid)) {
        seenIds.add(vid);
        // Canonical YouTube thumbnail from official Google CDN, bypassing fragile Invidious proxy paths
        const thumbnail = normalizeYouTubeThumbnail('', vid);
        tracks.push({
          videoId: vid,
          title: v.title || `Track (${vid})`,
          author: v.author || data.author || 'YouTube',
          duration: v.lengthSeconds || 180,
          thumbnail,
        });
      }
    }
  }

  return {
    id: playlistId,
    title: data?.title || `YouTube Playlist (${playlistId.slice(0, 8)})`,
    author: data?.author || 'YouTube',
    description: data?.description || 'Imported YouTube playlist',
    thumbnail: tracks[0]?.thumbnail || normalizeYouTubeThumbnail('', playlistId),
    itemCount: tracks.length,
    tracks,
  };
}

/**
 * Fetches playlist details and items from YouTube:
 * 1. Checks local or deployed server API /api/youtube/playlist?id=... (with JSON check & timeout)
 * 2. If blocked or on static/mobile preview, queries high-speed open Invidious instances (CORS enabled)
 * 3. Tries direct browser fetch (if environment allows)
 * 4. Tries updated CORS proxies with short timeout
 */
export async function fetchYouTubePlaylist(playlistIdOrUrl: string): Promise<YouTubePlaylistResult> {
  const playlistId = extractYouTubePlaylistId(playlistIdOrUrl);
  if (!playlistId) {
    throw new Error('Invalid YouTube Playlist URL or ID. Please check the link.');
  }

  // 1. Try local/deployed server API (Dev server or Vercel serverless)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const apiRes = await fetch(`/api/youtube/playlist?id=${encodeURIComponent(playlistId)}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);

    const contentType = apiRes.headers.get('content-type') || '';
    if (apiRes.ok && contentType.includes('application/json')) {
      const data = await apiRes.json();
      if (data && Array.isArray(data.tracks) && data.tracks.length > 0) {
        return data as YouTubePlaylistResult;
      }
    }
  } catch {
    // Continue to next tier
  }

  // 2. High-speed Invidious CORS APIs (Works directly in Mobile Chrome and Brave without cookies/tokens)
  const invidiousEndpoints = [
    `https://invidious.f5.si/api/v1/playlists/${encodeURIComponent(playlistId)}`,
  ];

  for (const invEndpoint of invidiousEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(invEndpoint, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const parsed = parseInvidiousPlaylist(data, playlistId);
        if (parsed.tracks.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Try next
    }
  }

  // 3. Try direct fetch (works if running without CORS restriction or behind reverse proxy)
  const targetUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const directRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeoutId);
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

  // 4. Fallback CORS Proxies (Using active, keyless endpoints with fast timeout)
  const proxyEndpoints = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
  ];

  for (const proxyUrl of proxyEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        let html = '';
        if (proxyUrl.includes('allorigins.win/get')) {
          const json = await res.json();
          html = json?.contents || '';
        } else {
          html = await res.text();
        }

        if (html) {
          const parsed = parseYouTubePlaylistHtml(html, playlistId);
          if (parsed.tracks.length > 0) {
            return parsed;
          }
        }
      }
    } catch {
      // Try next
    }
  }

  throw new Error(
    'Could not retrieve songs from this YouTube playlist. Mobile browser shields (like Brave Shields or Chrome tracking prevention) may be blocking public proxy endpoints. Try using the "Bulk Add" tab to paste links directly, or disable Brave Shields for this domain.'
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
      thumbnail: normalizeYouTubeThumbnail(item.thumbnail, item.videoId),
      duration: item.duration || 180,
      addedAt: now + index, // preserve order
      modePreference: defaultMode,
      tags: tag ? [tag] : ['YouTube Playlist'],
    };
  });
}

export interface SyncPlaylistResult {
  updatedPlaylist: Playlist;
  newTracks: Track[];
  addedCount: number;
  totalRemoteCount: number;
}

/**
 * Synchronizes an existing Nomatic playlist with its upstream YouTube playlist.
 * Fetches the latest track list, discovers any songs added by the YouTube playlist owner,
 * creates track models for any new videos, and appends them to the playlist.
 */
export async function syncYouTubePlaylistWithLibrary(
  playlist: Playlist,
  existingTracks: Track[]
): Promise<SyncPlaylistResult> {
  const playlistId = playlist.youtubePlaylistId;
  if (!playlistId) {
    throw new Error('This playlist is not linked to a YouTube playlist.');
  }

  // Fetch latest playlist tracks from YouTube
  const result = await fetchYouTubePlaylist(playlistId);
  const remoteTracks = result.tracks;

  // Build lookup maps
  const trackByYtId = new Map<string, Track>();
  for (const t of existingTracks) {
    trackByYtId.set(t.youtubeId, t);
  }

  const existingTrackIdsInPlaylist = new Set(playlist.trackIds);
  const newTracksCreated: Track[] = [];
  const updatedTrackIds = [...playlist.trackIds];
  const now = Date.now();

  for (let idx = 0; idx < remoteTracks.length; idx++) {
    const rItem = remoteTracks[idx];
    let matchedTrack = trackByYtId.get(rItem.videoId);

    if (!matchedTrack) {
      // Create new Track object
      matchedTrack = {
        id: `yt-${rItem.videoId}`,
        youtubeId: rItem.videoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${rItem.videoId}`,
        title: rItem.title,
        artist: rItem.author || playlist.name,
        thumbnail: normalizeYouTubeThumbnail(rItem.thumbnail, rItem.videoId),
        duration: rItem.duration || 180,
        addedAt: now + idx,
        modePreference: 'audio',
        tags: [playlist.name, 'Synced YouTube Playlist'],
      };
      newTracksCreated.push(matchedTrack);
      trackByYtId.set(matchedTrack.youtubeId, matchedTrack);
    }

    if (!existingTrackIdsInPlaylist.has(matchedTrack.id)) {
      existingTrackIdsInPlaylist.add(matchedTrack.id);
      updatedTrackIds.push(matchedTrack.id);
    }
  }

  const updatedPlaylist: Playlist = {
    ...playlist,
    trackIds: updatedTrackIds,
    lastSyncedAt: Date.now(),
    updatedAt: Date.now(),
  };

  return {
    updatedPlaylist,
    newTracks: newTracksCreated,
    addedCount: updatedTrackIds.length - playlist.trackIds.length,
    totalRemoteCount: remoteTracks.length,
  };
}
