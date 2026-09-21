import { Track } from '../types';

/**
 * Background Audio & Keep-Alive Manager for Nomatic Music player
 * Ensures YouTube audio does not suspend when tabs switch, screen locks, or user minimizes app.
 */

let audioCtx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let silentAudioEl: HTMLAudioElement | null = null;
let wakeLockSentinel: any = null;

// Picture-in-Picture Offscreen Canvas & Video
let pipCanvas: HTMLCanvasElement | null = null;
let pipVideo: HTMLVideoElement | null = null;
let pipAnimationId: number | null = null;
let onPipPlayToggleCallback: ((play: boolean) => void) | null = null;

/**
 * Initialize the Web Audio API inaudible tone keep-alive.
 * This anchors the browser's audio daemon so OS doesn't sleep the tab process.
 */
export function initBackgroundAudioKeepAlive(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    if (!oscillator && audioCtx) {
      oscillator = audioCtx.createOscillator();
      gainNode = audioCtx.createGain();

      // Inaudible sub-bass frequency (20Hz) at infinitesimal gain (0.00001)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(20, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.00001, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
    }

    // Also prime silent audio loop element
    if (!silentAudioEl) {
      const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      silentAudioEl = new Audio(silentWav);
      silentAudioEl.loop = true;
      silentAudioEl.volume = 0.01;
    }
  } catch (e) {
    console.warn('Background audio keep-alive init warning:', e);
  }
}

/**
 * Activate or pause the background keep-alive based on playback state
 */
export function setBackgroundAudioActive(active: boolean): void {
  try {
    if (active) {
      initBackgroundAudioKeepAlive();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      silentAudioEl?.play().catch(() => {});
    } else {
      silentAudioEl?.pause();
    }
  } catch {
    // Ignore audio activation restrictions
  }
}

/**
 * Screen Wake Lock API: Prevents display from sleeping during music sessions
 */
export async function requestScreenWakeLock(): Promise<boolean> {
  if (!('wakeLock' in navigator)) return false;
  try {
    if (wakeLockSentinel) {
      return true;
    }
    wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
    return true;
  } catch {
    return false;
  }
}

export function releaseScreenWakeLock(): void {
  if (wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch {}
    wakeLockSentinel = null;
  }
}

/**
 * Picture-in-Picture (PiP) Engine for Background Playback
 * Generates an active canvas with album art and visualizer to give the user
 * a floating mini-player that guarantees uninterrupted background execution.
 */
export function isPiPSupported(): boolean {
  return typeof document !== 'undefined' && ('pictureInPictureEnabled' in document);
}

export function isPiPActive(): boolean {
  if (typeof document === 'undefined') return false;
  return document.pictureInPictureElement !== null;
}

export async function togglePictureInPicture(
  track: Track | null,
  isPlaying: boolean,
  onTogglePlay: (play: boolean) => void
): Promise<boolean> {
  if (!isPiPSupported()) return false;

  onPipPlayToggleCallback = onTogglePlay;

  // If already in PiP, exit
  if (document.pictureInPictureElement) {
    try {
      await document.exitPictureInPicture();
      stopPiPCanvasLoop();
      return false;
    } catch {
      return false;
    }
  }

  // Create canvas & video elements if not existing
  if (!pipCanvas) {
    pipCanvas = document.createElement('canvas');
    pipCanvas.width = 640;
    pipCanvas.height = 360;
  }

  if (!pipVideo) {
    pipVideo = document.createElement('video');
    pipVideo.muted = true;
    pipVideo.playsInline = true;
    pipVideo.autoplay = true;

    pipVideo.addEventListener('play', () => {
      onPipPlayToggleCallback?.(true);
    });
    pipVideo.addEventListener('pause', () => {
      onPipPlayToggleCallback?.(false);
    });
    pipVideo.addEventListener('leavepictureinpicture', () => {
      stopPiPCanvasLoop();
    });
  }

  // Pre-draw initial frame
  drawPiPFrame(track, isPlaying);

  // Capture stream from canvas
  try {
    const stream = (pipCanvas as any).captureStream(20);
    pipVideo.srcObject = stream;
    await pipVideo.play();
    await pipVideo.requestPictureInPicture();
    startPiPCanvasLoop(track, isPlaying);
    return true;
  } catch (err) {
    console.warn('Could not launch Picture-in-Picture:', err);
    return false;
  }
}

// Track image cache for canvas drawing
let cachedImg: HTMLImageElement | null = null;
let cachedImgUrl: string | null = null;

function getTrackImage(url: string): HTMLImageElement {
  if (cachedImg && cachedImgUrl === url) {
    return cachedImg;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  cachedImg = img;
  cachedImgUrl = url;
  return img;
}

function drawPiPFrame(track: Track | null, isPlaying: boolean) {
  if (!pipCanvas) return;
  const ctx = pipCanvas.getContext('2d');
  if (!ctx) return;

  const w = pipCanvas.width;
  const h = pipCanvas.height;

  // 1. Dark Spotify background
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#121212');
  bgGrad.addColorStop(1, '#080808');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Draw Album Artwork
  const imgSize = 220;
  const imgX = 40;
  const imgY = (h - imgSize) / 2;

  if (track?.thumbnail) {
    try {
      const img = getTrackImage(track.thumbnail);
      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        // Rounded corner clip
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgSize, imgSize, 16);
        ctx.clip();
        ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        ctx.restore();
      } else {
        ctx.fillStyle = '#222';
        ctx.fillRect(imgX, imgY, imgSize, imgSize);
      }
    } catch {
      ctx.fillStyle = '#222';
      ctx.fillRect(imgX, imgY, imgSize, imgSize);
    }
  }

  // 3. Track Info Typography
  const textX = imgX + imgSize + 30;
  ctx.fillStyle = '#1ed760';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SPOTFLOW BACKGROUND AUDIO', textX, imgY + 40);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const title = track?.title || 'YouTube Music';
  ctx.fillText(title.length > 22 ? title.slice(0, 22) + '...' : title, textX, imgY + 80);

  ctx.fillStyle = '#a3a3a3';
  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const artist = track?.artist || 'Nomatic Player';
  ctx.fillText(artist.length > 26 ? artist.slice(0, 26) + '...' : artist, textX, imgY + 115);

  // 4. Equalizer Waveform Bars
  const barY = imgY + 160;
  const numBars = 16;
  const barWidth = 8;
  const barGap = 6;
  const time = Date.now() / 150;

  for (let i = 0; i < numBars; i++) {
    const barX = textX + i * (barWidth + barGap);
    const wave = isPlaying ? Math.sin(time + i * 0.5) * 0.5 + 0.5 : 0.1;
    const barH = Math.max(6, wave * 38);

    ctx.fillStyle = i % 2 === 0 ? '#1ed760' : '#22c55e';
    ctx.fillRect(barX, barY - barH, barWidth, barH);
  }

  // 5. Status Text
  ctx.fillStyle = '#666';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(isPlaying ? '● Playing in Background' : '⏸ Paused', textX, barY + 30);
}

function startPiPCanvasLoop(track: Track | null, isPlaying: boolean) {
  stopPiPCanvasLoop();
  const loop = () => {
    drawPiPFrame(track, isPlaying);
    pipAnimationId = requestAnimationFrame(loop);
  };
  loop();
}

function stopPiPCanvasLoop() {
  if (pipAnimationId) {
    cancelAnimationFrame(pipAnimationId);
    pipAnimationId = null;
  }
}

export function updatePiPDisplay(track: Track | null, isPlaying: boolean): void {
  if (document.pictureInPictureElement) {
    drawPiPFrame(track, isPlaying);
  }
}
