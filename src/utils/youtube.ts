/**
 * Utilities for extracting YouTube video IDs, fetching metadata via oEmbed, and formatting.
 */

export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If it's already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex for YouTube URLs (standard, shorts, embed, music, youtu.be)
  const patterns = [
    /(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function getYouTubeThumbnail(videoId: string, quality: 'high' | 'medium' | 'default' = 'high'): string {
  if (quality === 'high') {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  if (quality === 'medium') {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
  return `https://img.youtube.com/vi/${videoId}/default.jpg`;
}

export interface YouTubeMetadata {
  title: string;
  author: string;
  thumbnail: string;
  videoId: string;
}

export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const defaultThumbnail = getYouTubeThumbnail(videoId, 'high');

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const response = await fetch(oembedUrl);

    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || `Track (${videoId})`,
        author: data.author_name || 'YouTube Creator',
        thumbnail: data.thumbnail_url || defaultThumbnail,
        videoId,
      };
    }
  } catch {
    // Network or CORS fallback
  }

  return {
    title: `YouTube Track (${videoId})`,
    author: 'YouTube Audio',
    thumbnail: defaultThumbnail,
    videoId,
  };
}

export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const totalSecs = Math.floor(seconds);
  const mins = Math.floor(totalSecs / 60);
  const remainingSecs = totalSecs % 60;
  const hours = Math.floor(mins / 60);

  if (hours > 0) {
    const remainingMins = mins % 60;
    return `${hours}:${remainingMins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  }

  return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
}

export interface ParsedBulkItem {
  videoId: string;
  cleanUrl: string;
  original: string;
}

export interface BulkFilterResult {
  totalExtracted: number;
  uniqueToImport: ParsedBulkItem[];
  internalDuplicates: ParsedBulkItem[];
  existingInLibrary: ParsedBulkItem[];
}

/**
 * Parses raw multi-line or comma/space-delimited text for YouTube links and IDs.
 */
export function extractBulkYouTubeIds(rawText: string): ParsedBulkItem[] {
  if (!rawText || !rawText.trim()) return [];

  // Match all potential URLs and tokens across lines, commas, semicolons, and spaces
  const tokens = rawText
    .split(/[\r\n,;\t\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const parsed: ParsedBulkItem[] = [];

  for (const token of tokens) {
    const videoId = extractYouTubeId(token);
    if (videoId) {
      parsed.push({
        videoId,
        cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
        original: token,
      });
    }
  }

  return parsed;
}

/**
 * Filters out duplicate YouTube links:
 * 1. Duplicate URLs inside the pasted batch itself (keeps first occurrence).
 * 2. URLs that already exist in the user's Nomatic library (if filterExistingInLibrary is true).
 */
export function filterBulkYouTubeLinks(
  items: ParsedBulkItem[],
  existingYouTubeIds: Set<string> = new Set(),
  filterExistingInLibrary: boolean = true
): BulkFilterResult {
  const seenInBatch = new Set<string>();
  const uniqueToImport: ParsedBulkItem[] = [];
  const internalDuplicates: ParsedBulkItem[] = [];
  const existingInLibrary: ParsedBulkItem[] = [];

  for (const item of items) {
    // Check internal duplicate in batch
    if (seenInBatch.has(item.videoId)) {
      internalDuplicates.push(item);
      continue;
    }
    seenInBatch.add(item.videoId);

    // Check if already in user's library
    if (filterExistingInLibrary && existingYouTubeIds.has(item.videoId)) {
      existingInLibrary.push(item);
      continue;
    }

    uniqueToImport.push(item);
  }

  return {
    totalExtracted: items.length,
    uniqueToImport,
    internalDuplicates,
    existingInLibrary,
  };
}

