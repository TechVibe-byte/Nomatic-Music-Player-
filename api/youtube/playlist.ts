import { parseYouTubePlaylistHtml, parseInvidiousPlaylist, extractYouTubePlaylistId } from '../../src/utils/youtubePlaylist';

export default async function handler(req: any, res: any) {
  // Enable CORS for Vercel Serverless deployment
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const id = req.query?.id || req.query?.list || req.query?.url;
    const playlistId = typeof id === 'string' ? (extractYouTubePlaylistId(id) || id) : null;

    if (!playlistId) {
      return res.status(400).json({ error: 'Missing or invalid playlist parameter' });
    }

    const ytUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
    try {
      const fetchRes = await fetch(ytUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (fetchRes.ok) {
        const html = await fetchRes.text();
        const parsed = parseYouTubePlaylistHtml(html, playlistId);
        if (parsed.tracks.length > 0) {
          res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
          return res.status(200).json(parsed);
        }
      }
    } catch {
      // Fall through to Invidious mirror
    }

    // Fallback to Invidious
    try {
      const invRes = await fetch(`https://invidious.f5.si/api/v1/playlists/${encodeURIComponent(playlistId)}`);
      if (invRes.ok) {
        const invData = await invRes.json();
        const parsed = parseInvidiousPlaylist(invData, playlistId);
        if (parsed.tracks.length > 0) {
          res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
          return res.status(200).json(parsed);
        }
      }
    } catch {
      // Ignore
    }

    return res.status(502).json({ error: 'Could not retrieve songs from YouTube or mirrors' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to parse playlist' });
  }
}
