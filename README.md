# Nomatic Music Player 🎵

> A modern, high-performance Spotify-inspired Progressive Web App (PWA) for playing YouTube audio and video with uninterrupted background playback, local playlist curation, sleep timer, and seamless mobile responsiveness.

---

## 🌟 Highlights & Key Features

- **🎧 3-Tier Background Audio Architecture**:
  - **Web Audio Heartbeat**: Prevents mobile browsers and inactive tabs from terminating the audio thread using an inaudible oscillator loop.
  - **MediaSession API Integration**: Full lock-screen and notification controls (Play/Pause, Skip Next/Previous, Seek, Track artwork, Title, Artist).
  - **Picture-in-Picture (PiP) Mode**: Floating mini-video player that continues playing when switching apps or desktop workspaces.
  - **Screen Wake Lock API**: Keeps the screen active during playback sessions if preferred.

- **🚀 YouTube Integration**:
  - **Single Video Import**: Add any YouTube URL or Video ID; automatically extracts high-res thumbnails and metadata.
  - **Full Playlist Import**: Paste YouTube playlist URLs (e.g., `list=PL...`) to automatically fetch all tracks and create a dedicated playlist.
  - **Bulk URL Extraction**: Paste raw text containing dozens of YouTube links; automatically parses, validates, and discards duplicates.
  - **Audio ↔ Video Toggle**: Switch between lightweight audio-only playback mode and high-resolution video mode on the fly.

- **📱 Mobile-First Pinned Interface**:
  - **Unified Pinned Bottom Dock**: Mobile mini-player and bottom navigation tabs are locked to the bottom with zero gap and zero overlap.
  - **Safe-Area Inset Support**: Automatically conforms to iPhone home indicators and Android gesture navigation bars (`env(safe-area-inset-bottom)`).
  - **Overscroll & Viewport Stability**: Uses `100dvh` and `overscroll-behavior: none` to prevent mobile address bar rubber-banding from displacing controls.

- **⚡ Full Music Suite**:
  - **Playlists & Liked Songs**: Create custom gradient playlists and like your favorite songs.
  - **Interactive Queue**: Drag, reorder, and inspect upcoming tracks.
  - **Sleep Timer**: Set timed shutoff (15m, 30m, 45m, 60m) or stop playback at the end of the current track.
  - **Audio Visualizer**: Real-time frequency bar and wave visualizer modal.
  - **Search & Filter**: Search songs and playlists with instant filtering.

- **📲 Progressive Web App (PWA)**:
  - Installable directly on iOS (Add to Home Screen) and Android/Desktop Chrome.
  - Offline asset caching with Workbox service workers.
  - Custom SVG and maskable high-resolution icon suite.

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox)
- **Player**: YouTube IFrame Player API

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** or **bun** / **yarn**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/nomatic-music-player.git
cd nomatic-music-player

# 2. Install dependencies
npm install

# 3. Start local development server (runs on port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💻 Code Snippets & Architecture

### 1. 3-Tier Background Audio Heartbeat

Keeps YouTube audio running smoothly when tabs switch or the mobile screen turns off:

```typescript
// src/utils/backgroundAudio.ts
let audioCtx: AudioContext | null = null;
let heartbeatOscillator: OscillatorNode | null = null;

export function initBackgroundAudioKeepAlive(): void {
  if (audioCtx) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    audioCtx = new AudioContextClass();
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime); // Inaudible gain

    heartbeatOscillator = audioCtx.createOscillator();
    heartbeatOscillator.type = 'sine';
    heartbeatOscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    heartbeatOscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    heartbeatOscillator.start();
  } catch (err) {
    console.warn('AudioContext keep-alive initialization failed:', err);
  }
}
```

### 2. YouTube Video ID & Playlist Parser

Supports standard video URLs, Short links, mobile links, and playlist IDs:

```typescript
// src/utils/youtube.ts
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // Pure 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex matches: youtu.be, youtube.com/watch?v=, youtube.com/embed/, youtube.com/shorts/
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

export function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
```

### 3. Unified Mobile Bottom Dock

Combines the mini-player scrubber and bottom navigation tabs into a stationary container with safe-area spacing:

```tsx
// src/App.tsx
<div 
  id="mobile-pinned-bottom-dock"
  className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex flex-col pointer-events-auto select-none bg-[#121212] border-t border-neutral-800 shadow-2xl"
  style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
>
  {/* Mobile Mini Player directly stacked above navigation bar */}
  {currentTrack && (
    <MobileMiniPlayer
      currentTrack={currentTrack}
      isPlaying={isPlaying}
      onTogglePlay={handleTogglePlay}
      onPlayNext={handlePlayNext}
      currentTime={currentTime}
      duration={duration}
      onSeek={handleSeek}
      playbackMode={playbackMode}
      isLiked={likedTrackIds.includes(currentTrack.id)}
      onToggleLike={handleToggleLike}
      onToggleNowPlaying={() => setIsNowPlayingOpen(true)}
      isSleepTimerActive={sleepTimerState.isActive}
      sleepTimerRemaining={sleepTimerLabel}
    />
  )}

  {/* Mobile Navigation Tabs (Home, Search, Add, Library, Config) */}
  <MobileBottomNav
    activeView={activeView}
    setActiveView={setActiveView}
    onOpenAddModal={() => handleOpenAddModal('single')}
    onOpenAddModalWithMode={handleOpenAddModal}
    onOpenConfigModal={() => setIsConfigModalOpen(true)}
    likedCount={likedTrackIds.length}
    playlistsCount={playlists.length}
  />
</div>
```

### 4. Lock-Screen MediaSession Controls

Synchronizes native OS media controls with YouTube playback:

```typescript
// src/components/player/YouTubePlayerEngine.tsx
if ('mediaSession' in navigator && currentTrack) {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: currentTrack.title,
    artist: currentTrack.artist,
    album: 'Nomatic Music player',
    artwork: [
      { src: currentTrack.thumbnail, sizes: '96x96', type: 'image/jpeg' },
      { src: currentTrack.thumbnail, sizes: '128x128', type: 'image/jpeg' },
      { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }
    ]
  });

  navigator.mediaSession.setActionHandler('play', () => onPlayStateChange(true));
  navigator.mediaSession.setActionHandler('pause', () => onPlayStateChange(false));
  navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
  navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
}
```

---

## 📦 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs the Vite development server on `http://localhost:3000` |
| `npm run build` | Builds the production bundle with optimized static chunks in `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs TypeScript type checks (`tsc --noEmit`) |

---

## 🚢 Production Deployment

### Deploying to Vercel (Recommended)

This project includes a fully pre-configured `vercel.json` optimized for Single Page Application routing, Edge caching, security headers, and YouTube playlist proxy serverless functions.

#### Option 1: Vercel Web Dashboard (Git Integration)
1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your repository.
4. Vercel will automatically detect **Vite** with the following preset settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click **Deploy**. Your app will be live with full SSL, global CDN, and PWA capabilities.

#### Option 2: Vercel CLI
```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy to preview
vercel

# Deploy directly to production
vercel --prod
```

### Static Hosts & Docker / Cloud Run

```bash
# Build the production bundle
npm run build

# The output is generated inside /dist
# Ready for serving via Nginx, Caddy, Cloud Run, or any static host
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
