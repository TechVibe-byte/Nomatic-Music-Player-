import React, { useEffect, useRef } from 'react';
import { Track, PlaybackMode } from '../../types';
import { 
  setBackgroundAudioActive, 
  updatePiPDisplay 
} from '../../utils/backgroundAudio';

interface YouTubePlayerEngineProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  playbackMode: PlaybackMode;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onTrackEnd: () => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  onBufferingChange: (isBuffering: boolean) => void;
  onPlayerReady: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seekTargetTime: number | null;
  onSeekHandled: () => void;
  isDockedVideo?: boolean;
}

export const YouTubePlayerEngine: React.FC<YouTubePlayerEngineProps> = ({
  currentTrack,
  isPlaying,
  volume,
  isMuted,
  playbackMode,
  onTimeUpdate,
  onTrackEnd,
  onPlayStateChange,
  onBufferingChange,
  onPlayerReady,
  playNext,
  playPrevious,
  seekTargetTime,
  onSeekHandled,
  isDockedVideo = false,
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isApiLoaded = useRef(false);
  const currentVideoIdRef = useRef<string | null>(null);
  const isPlayingRef = useRef(isPlaying);

  // Keep ref synchronized
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    setBackgroundAudioActive(isPlaying);
    updatePiPDisplay(currentTrack, isPlaying);
  }, [isPlaying, currentTrack]);

  // 1. Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      isApiLoaded.current = true;
      initPlayer();
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      isApiLoaded.current = true;
      initPlayer();
    };
  }, []);

  const initPlayer = () => {
    if (!window.YT || !containerRef.current || playerRef.current) return;

    try {
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: currentTrack?.youtubeId || '',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event: any) => {
            onPlayerReady();
            event.target.setVolume(isMuted ? 0 : volume);
            if (currentTrack?.youtubeId) {
              currentVideoIdRef.current = currentTrack.youtubeId;
              if (isPlayingRef.current) {
                event.target.loadVideoById(currentTrack.youtubeId);
                event.target.playVideo();
                setBackgroundAudioActive(true);
              } else {
                // Do NOT play automatically on web app load.
                // Cue video so artwork/info is ready, but keep paused until user initiates playback.
                if (typeof event.target.cueVideoById === 'function') {
                  event.target.cueVideoById(currentTrack.youtubeId);
                }
              }
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
            const state = event.data;
            if (state === 1) {
              // Safety: If app state is not playing (e.g. initial load), prevent unwanted autoplay
              if (!isPlayingRef.current) {
                try {
                  event.target.pauseVideo();
                } catch {}
                onPlayStateChange(false);
                return;
              }
              onPlayStateChange(true);
              onBufferingChange(false);
              setBackgroundAudioActive(true);
            } else if (state === 2) {
              // If state is paused, check if it was paused because document was hidden
              if (document.hidden && isPlayingRef.current) {
                // Background playback protection: keep playing in background!
                try {
                  event.target.playVideo();
                  setBackgroundAudioActive(true);
                } catch {}
              } else {
                onPlayStateChange(false);
                onBufferingChange(false);
              }
            } else if (state === 3) {
              onBufferingChange(true);
            } else if (state === 0) {
              onTrackEnd();
            }
          },
          onError: (err: any) => {
            console.warn('YouTube Player Event Notice:', err.data);
            onBufferingChange(false);
            if (err.data === 101 || err.data === 150) {
              setTimeout(() => playNext(), 1500);
            }
          },
        },
      });
    } catch (e) {
      console.error('Error initializing YouTube Player:', e);
    }
  };

  // 2. Background Tab-Switch & Screen Lock Reviver
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab went to background or screen locked
        if (isPlayingRef.current) {
          setBackgroundAudioActive(true);
          // YouTube often tries to auto-pause when tab is hidden; re-assert playback
          setTimeout(() => {
            if (playerRef.current && typeof playerRef.current.playVideo === 'function' && isPlayingRef.current) {
              try {
                const s = playerRef.current.getPlayerState();
                if (s === 2 || s === -1) {
                  playerRef.current.playVideo();
                }
              } catch {}
            }
          }, 150);
        }
      } else {
        // Tab brought to foreground
        if (isPlayingRef.current && playerRef.current) {
          try {
            const s = playerRef.current.getPlayerState();
            if (s !== 1) {
              playerRef.current.playVideo();
            }
          } catch {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
    };
  }, []);

  // 3. Track Change
  useEffect(() => {
    if (!currentTrack || !playerRef.current) return;

    if (currentVideoIdRef.current !== currentTrack.youtubeId) {
      currentVideoIdRef.current = currentTrack.youtubeId;
      try {
        if (isPlayingRef.current) {
          if (typeof playerRef.current.loadVideoById === 'function') {
            playerRef.current.loadVideoById(currentTrack.youtubeId);
            playerRef.current.playVideo();
            setBackgroundAudioActive(true);
          }
        } else {
          // Keep paused if user hasn't pressed play
          if (typeof playerRef.current.cueVideoById === 'function') {
            playerRef.current.cueVideoById(currentTrack.youtubeId);
          }
        }
      } catch (e) {
        console.error('Error loading video by ID:', e);
      }
    }
  }, [currentTrack?.youtubeId]);

  // 4. Play / Pause Control
  useEffect(() => {
    if (!playerRef.current || typeof playerRef.current.playVideo !== 'function') return;

    try {
      if (isPlaying) {
        // If current track hasn't been loaded yet or is currently cued, load it
        if (currentTrack?.youtubeId) {
          const st = typeof playerRef.current.getPlayerState === 'function' ? playerRef.current.getPlayerState() : null;
          if ((st === 5 || st === -1) && typeof playerRef.current.loadVideoById === 'function') {
            playerRef.current.loadVideoById(currentTrack.youtubeId);
          }
        }
        playerRef.current.playVideo();
        setBackgroundAudioActive(true);
      } else {
        playerRef.current.pauseVideo();
        setBackgroundAudioActive(false);
      }
    } catch (e) {
      console.error('Error toggling play/pause:', e);
    }
  }, [isPlaying, currentTrack?.youtubeId]);

  // 5. Volume & Mute Control
  useEffect(() => {
    if (!playerRef.current || typeof playerRef.current.setVolume !== 'function') return;

    try {
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume);
      }
    } catch (e) {
      console.error('Error setting volume:', e);
    }
  }, [volume, isMuted]);

  // 6. Seek Target Handling
  useEffect(() => {
    if (seekTargetTime !== null && playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(seekTargetTime, true);
        onSeekHandled();
      } catch (e) {
        console.error('Error seeking:', e);
      }
    }
  }, [seekTargetTime, onSeekHandled]);

  // 7. Time & Duration Polling Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const curTime = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || (currentTrack?.duration || 0);
          onTimeUpdate(curTime, dur);

          // Update MediaSession Position State
          if ('mediaSession' in navigator && dur > 0) {
            try {
              navigator.mediaSession.setPositionState({
                duration: dur,
                playbackRate: 1,
                position: Math.min(curTime, dur),
              });
            } catch {
              // Ignore boundary errors
            }
          }
        } catch {
          // ignore transient poll error
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [currentTrack, onTimeUpdate]);

  // 8. MediaSession API Integration (Lock Screen, Wearables & Car Controls)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: 'Nomatic Music player',
        artwork: [
          { src: currentTrack.thumbnail, sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '128x128', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '192x192', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '256x256', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => {
        onPlayStateChange(true);
        setBackgroundAudioActive(true);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        onPlayStateChange(false);
        setBackgroundAudioActive(false);
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrevious();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNext();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && playerRef.current) {
          playerRef.current.seekTo(details.seekTime, true);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skip = details.seekOffset || 10;
        if (playerRef.current) {
          const cur = playerRef.current.getCurrentTime() || 0;
          playerRef.current.seekTo(Math.max(cur - skip, 0), true);
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skip = details.seekOffset || 10;
        if (playerRef.current) {
          const cur = playerRef.current.getCurrentTime() || 0;
          playerRef.current.seekTo(cur + skip, true);
        }
      });
    } catch (e) {
      console.warn('MediaSession setup warning:', e);
    }
  }, [currentTrack, isPlaying, playNext, playPrevious, onPlayStateChange]);

  // Styling & In-Viewport placement:
  // When in audio mode, keep the iframe inside the viewport (not offscreen like -9999px)
  // with tiny opacity and pointer-events-none so browsers never throttle its thread.
  const wrapperClass = isDockedVideo && playbackMode === 'video'
    ? 'w-full h-full relative'
    : playbackMode === 'video'
    ? 'fixed bottom-24 right-5 w-72 h-40 z-30 rounded-xl overflow-hidden shadow-2xl border border-neutral-700 bg-black'
    : 'fixed bottom-1 right-1 w-32 h-20 opacity-[0.005] pointer-events-none z-[-1] overflow-hidden';

  return (
    <div id="yt-player-persistent-wrapper" className={wrapperClass}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
