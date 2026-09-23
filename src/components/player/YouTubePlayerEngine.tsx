import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Track, PlaybackMode, RepeatMode } from '../../types';
import { 
  setBackgroundAudioActive, 
  updatePiPDisplay 
} from '../../utils/backgroundAudio';
import { VlcHeader, VlcControlsBar, VlcDockedPill } from './VlcVideoPlayer';
import { Play, Pause } from 'lucide-react';

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
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
  onTogglePlay?: () => void;
  onVolumeChange?: (volume: number) => void;
  onToggleMute?: () => void;
  onTogglePlaybackMode?: () => void;
  repeatMode?: RepeatMode;
  isShuffled?: boolean;
  onToggleRepeat?: () => void;
  onToggleShuffle?: () => void;
  isVlcFullModeOpen?: boolean;
  onToggleVlcFullMode?: (open: boolean) => void;
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
  currentTime = 0,
  duration = 0,
  onSeek,
  onTogglePlay,
  onVolumeChange,
  onToggleMute,
  onTogglePlaybackMode,
  repeatMode = 'off',
  isShuffled = false,
  onToggleRepeat,
  onToggleShuffle,
  isVlcFullModeOpen = true,
  onToggleVlcFullMode,
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isApiLoaded = useRef(false);
  const currentVideoIdRef = useRef<string | null>(null);
  const isPlayingRef = useRef(isPlaying);

  // VLC Player Controls State
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | 'fill' | '4:3'>('16:9');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [flashAction, setFlashAction] = useState<'play' | 'pause' | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isVlcActive = playbackMode === 'video' && isVlcFullModeOpen;

  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      if (isPlayingRef.current) {
        setShowControls(false);
      }
    }, 3500);
  }, []);

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      try {
        playerRef.current.setPlaybackRate(rate);
      } catch (e) {
        console.warn('Could not set playback rate:', e);
      }
    }
  };

  const handleStop = () => {
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
        playerRef.current.seekTo(0, true);
        onPlayStateChange(false);
        onTimeUpdate(0, duration || 0);
      } catch (e) {
        console.warn('Could not stop player:', e);
      }
    }
  };

  const handleToggleFullscreen = () => {
    const elem = document.getElementById('yt-player-persistent-wrapper');
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleVideoStageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleUserActivity();
    if (onTogglePlay) {
      onTogglePlay();
      setFlashAction(isPlaying ? 'pause' : 'play');
      setTimeout(() => setFlashAction(null), 600);
    }
  };

  // Synchronize fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts when VLC is active in full mode
  useEffect(() => {
    if (!isVlcActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }

      handleUserActivity();

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (onTogglePlay) {
            onTogglePlay();
            setFlashAction(isPlaying ? 'pause' : 'play');
            setTimeout(() => setFlashAction(null), 600);
          }
          break;
        case 'KeyF':
          e.preventDefault();
          handleToggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          if (onToggleMute) onToggleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (onSeek) onSeek(Math.max(0, currentTime - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (onSeek) onSeek(Math.min(duration, currentTime + 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (onVolumeChange) onVolumeChange(Math.min(100, volume + 10));
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (onVolumeChange) onVolumeChange(Math.max(0, volume - 10));
          break;
        case 'Escape':
          if (!document.fullscreenElement && onToggleVlcFullMode) {
            onToggleVlcFullMode(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVlcActive, isPlaying, volume, currentTime, duration, onTogglePlay, onToggleMute, onSeek, onVolumeChange, onToggleVlcFullMode, handleUserActivity]);

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

  // Dedicated VLC Video Player vs Invisible Audio Thread:
  // When in video mode and full mode is open, expand into the dedicated VLC Video Player.
  // When in audio mode or minimized, stay in the invisible background thread with persistent iframe.
  const wrapperClass = isVlcActive
    ? 'fixed inset-0 z-50 bg-[#121316] text-white flex flex-col select-none overflow-hidden font-sans'
    : 'fixed bottom-1 right-1 w-32 h-20 opacity-[0.005] pointer-events-none z-[-1] overflow-hidden';

  return (
    <>
      <div 
        id="yt-player-persistent-wrapper" 
        className={wrapperClass}
        onMouseMove={isVlcActive ? handleUserActivity : undefined}
        onTouchStart={isVlcActive ? handleUserActivity : undefined}
      >
        {/* 1. VLC Window Header Bar */}
        {isVlcActive && (
          <VlcHeader
            currentTrack={currentTrack}
            aspectRatio={aspectRatio}
            isFullscreen={isFullscreen}
            showControls={showControls}
            onTogglePlaybackMode={() => onTogglePlaybackMode && onTogglePlaybackMode()}
            onToggleAspectRatio={() => setAspectRatio(prev => prev === '16:9' ? 'fill' : prev === 'fill' ? '4:3' : '16:9')}
            onMinimizeToLibrary={() => onToggleVlcFullMode && onToggleVlcFullMode(false)}
            onToggleFullscreen={handleToggleFullscreen}
          />
        )}

        {/* 2. Video Viewport Stage */}
        <div
          className={
            isVlcActive
              ? 'flex-1 relative flex items-center justify-center bg-black overflow-hidden cursor-pointer'
              : 'w-full h-full'
          }
          onClick={isVlcActive ? handleVideoStageClick : undefined}
          onDoubleClick={isVlcActive ? handleToggleFullscreen : undefined}
        >
          <div
            className={
              isVlcActive
                ? aspectRatio === 'fill'
                  ? 'w-full h-full pointer-events-auto'
                  : aspectRatio === '4:3'
                  ? 'h-full aspect-[4/3] max-w-full pointer-events-auto'
                  : 'w-full max-w-6xl aspect-video max-h-full shadow-2xl pointer-events-auto'
                : 'w-full h-full'
            }
          >
            <div ref={containerRef} className="w-full h-full" />
          </div>

          {/* Central Flash Indicator (Play/Pause) */}
          {flashAction && isVlcActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-out fade-out zoom-out-95 duration-500">
              <div className="w-20 h-20 rounded-full bg-black/80 border border-orange-500/60 backdrop-blur-md flex items-center justify-center text-orange-400 shadow-2xl">
                {flashAction === 'play' ? (
                  <Play className="w-10 h-10 fill-current translate-x-1" />
                ) : (
                  <Pause className="w-10 h-10 fill-current" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. VLC Bottom Control Toolbar */}
        {isVlcActive && (
          <VlcControlsBar
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            isPlaying={isPlaying}
            repeatMode={repeatMode}
            isShuffled={isShuffled}
            playbackRate={playbackRate}
            isFullscreen={isFullscreen}
            showControls={showControls}
            onSeek={(t) => onSeek && onSeek(t)}
            onTogglePlay={() => onTogglePlay && onTogglePlay()}
            onStop={handleStop}
            onPlayPrevious={playPrevious}
            onPlayNext={playNext}
            onVolumeChange={(v) => onVolumeChange && onVolumeChange(v)}
            onToggleMute={() => onToggleMute && onToggleMute()}
            onToggleRepeat={onToggleRepeat}
            onToggleShuffle={onToggleShuffle}
            onPlaybackRateChange={handlePlaybackRateChange}
            onToggleFullscreen={handleToggleFullscreen}
          />
        )}
      </div>

      {/* 4. Minimized VLC Docked Pill (when user browses library in video mode) */}
      {playbackMode === 'video' && !isVlcFullModeOpen && (
        <VlcDockedPill
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onExpand={() => onToggleVlcFullMode && onToggleVlcFullMode(true)}
          onTogglePlaybackMode={() => onTogglePlaybackMode && onTogglePlaybackMode()}
        />
      )}
    </>
  );
};
