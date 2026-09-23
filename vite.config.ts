import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import {parseYouTubePlaylistHtml, parseInvidiousPlaylist, extractYouTubePlaylistId} from './src/utils/youtubePlaylist';

function youtubePlaylistServerPlugin() {
  const handler = async (req: any, res: any, next: any) => {
    if (req.url && req.url.startsWith('/api/youtube/playlist')) {
      // Set wide CORS headers so mobile devices, local IP, or embeds are never blocked
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
      }

      try {
        const urlObj = new URL(req.url, 'http://localhost:3000');
        const param = urlObj.searchParams.get('id') || urlObj.searchParams.get('list') || urlObj.searchParams.get('url');
        const playlistId = param ? extractYouTubePlaylistId(param) || param : null;
        if (!playlistId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing or invalid playlist parameter' }));
          return;
        }

        const ytUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
        let html = '';
        let fetchedOk = false;

        try {
          const fetchRes = await fetch(ytUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });

          if (fetchRes.ok) {
            html = await fetchRes.text();
            fetchedOk = true;
          }
        } catch {
          // Continue to Invidious fallback below
        }

        if (fetchedOk && html) {
          try {
            const parsed = parseYouTubePlaylistHtml(html, playlistId);
            if (parsed.tracks.length > 0) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(parsed));
              return;
            }
          } catch {
            // Continue to Invidious fallback
          }
        }

        // Server-side fallback: Invidious API
        try {
          const invRes = await fetch(`https://invidious.f5.si/api/v1/playlists/${encodeURIComponent(playlistId)}`);
          if (invRes.ok) {
            const invData = await invRes.json();
            const parsed = parseInvidiousPlaylist(invData, playlistId);
            if (parsed.tracks.length > 0) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(parsed));
              return;
            }
          }
        } catch {
          // ignore
        }

        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to retrieve playlist tracks from YouTube or mirrors' }));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err?.message || 'Failed to parse playlist' }));
      }
    } else {
      next();
    }
  };

  return {
    name: 'youtube-playlist-server-plugin',
    configureServer(server: any) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      youtubePlaylistServerPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png', 'favicon.ico', 'favicon-32x32.png'],
        manifest: {
          id: '/',
          name: 'Nomatic Music player',
          short_name: 'Nomatic',
          description: 'Nomatic Music player - modern music PWA with YouTube audio and video playback, sleep timer, playlists, and background playback capabilities.',
          theme_color: '#121212',
          background_color: '#121212',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallbackDenylist: [/^\/api/],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
