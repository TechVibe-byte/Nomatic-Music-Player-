import React, { useRef } from 'react';
import { Play, Pause, SkipForward, Heart, Moon } from 'lucide-react';
import { Track, PlaybackMode } from '../../types';

interface MobileMiniPlayerProps {
  currentTrack: Track;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  playbackMode: PlaybackMode;
  isLiked: boolean;
  onToggleLike: (trackId: string) => void;
  onToggleNowPlaying: () => void;
  isSleepTimerActive?: boolean;
  sleepTimerRemaining?: string | null;
  onOpenVlcFullMode?: () => void;
}

export const MobileMiniPlayer: React.FC<MobileMiniPlayerProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onPlayNext,
  currentTime,
  duration,
  onSeek,
  playbackMode,
  isLiked,
  onToggleLike,
  onToggleNowPlaying,
  isSleepTimerActive = false,
  sleepTimerRemaining,
  onOpenVlcFullMode,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  const effectiveDuration = duration > 0 ? duration : (currentTrack.duration || 180);
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) || 0;

  const handleMiniProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    if (width <= 0) return;
    const ratio = Math.max(0, Math.min(1, clickX / width));
    onSeek(ratio * effectiveDuration);
  };

  return (
    <div 
      id="mobile-mini-player"
      className="w-full bg-[#202020]/98 backdrop-blur-xl border-t border-neutral-800 select-none flex-shrink-0 touch-manipulation relative shadow-md"
    >
      {/* Top Scrubber Progress Bar */}
      <div 
        ref={progressBarRef}
        onClick={handleMiniProgressClick}
        className="w-full h-[3px] bg-neutral-700/60 relative cursor-pointer group"
        title="Tap to seek"
      >
        <div 
          className="h-full bg-[#1ed760] transition-all duration-75"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="h-14 px-3 flex items-center justify-between gap-2.5">
        {/* Left: Artwork & Track Info (Tap to expand full screen player) */}
        <div 
          onClick={() => {
            if (playbackMode === 'video' && onOpenVlcFullMode) {
              onOpenVlcFullMode();
            } else {
              onToggleNowPlaying();
            }
          }}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer py-1 active:opacity-80 transition-opacity"
        >
          <div className="relative w-10 h-10 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0 shadow-sm border border-neutral-700/50">
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-bold truncate leading-tight">
              {currentTrack.title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-neutral-400 truncate max-w-[130px]">
                {currentTrack.artist}
              </span>
              <span className={`text-[8px] font-bold px-1 rounded uppercase ${
                playbackMode === 'audio' 
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' 
                  : 'bg-red-950 text-red-400 border border-red-800/40'
              }`}>
                {playbackMode === 'audio' ? 'Audio' : 'Video'}
              </span>
              {isSleepTimerActive && (
                <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.2 rounded bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30">
                  <Moon className="w-2 h-2 fill-current" />
                  {sleepTimerRemaining ? sleepTimerRemaining.split(' ')[0] : 'timer'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Like, Play/Pause, Next */}
        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            id="mobile-mini-like-btn"
            onClick={() => onToggleLike(currentTrack.id)}
            className={`w-9 h-9 flex items-center justify-center rounded-full active:scale-90 transition cursor-pointer ${
              isLiked ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
            }`}
            title={isLiked ? 'Remove from Liked' : 'Add to Liked'}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>

          <button
            id="mobile-mini-play-btn"
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition active:scale-90 shadow-md cursor-pointer ml-0.5"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current translate-x-0.5" />
            )}
          </button>

          <button
            id="mobile-mini-next-btn"
            onClick={onPlayNext}
            className="w-9 h-9 flex items-center justify-center rounded-full text-neutral-400 hover:text-white active:scale-90 transition cursor-pointer"
            title="Next track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
