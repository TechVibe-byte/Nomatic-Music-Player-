import React, { useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Volume2, 
  VolumeX, 
  Heart, 
  Maximize2, 
  ListMusic, 
  Headphones, 
  Film,
  Activity,
  Sparkles,
  PictureInPicture2,
  Sun,
  Moon
} from 'lucide-react';
import { Track, PlaybackMode, RepeatMode } from '../../types';
import { formatTime } from '../../utils/youtube';
import { VlcConeIcon } from './VlcVideoPlayer';
import { TrackThumbnail } from '../common/TrackThumbnail';

interface BottomPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  playbackMode: PlaybackMode;
  onTogglePlaybackMode: () => void;
  repeatMode: RepeatMode;
  onToggleRepeat: () => void;
  isShuffled: boolean;
  onToggleShuffle: () => void;
  isLiked: boolean;
  onToggleLike: (trackId: string) => void;
  isNowPlayingOpen: boolean;
  onToggleNowPlaying: () => void;
  isQueueOpen: boolean;
  onToggleQueue: () => void;
  isVisualizerOpen: boolean;
  onToggleVisualizer: () => void;
  isPiPActive?: boolean;
  onTogglePiP?: () => void;
  wakeLockActive?: boolean;
  onToggleWakeLock?: () => void;
  isSleepTimerActive?: boolean;
  sleepTimerRemaining?: string | null;
  onOpenSleepTimer?: () => void;
  onOpenVlcFullMode?: () => void;
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onPlayNext,
  onPlayPrevious,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  playbackMode,
  onTogglePlaybackMode,
  repeatMode,
  onToggleRepeat,
  isShuffled,
  onToggleShuffle,
  isLiked,
  onToggleLike,
  isNowPlayingOpen,
  onToggleNowPlaying,
  isQueueOpen,
  onToggleQueue,
  isVisualizerOpen,
  onToggleVisualizer,
  isPiPActive = false,
  onTogglePiP,
  wakeLockActive = false,
  onToggleWakeLock,
  isSleepTimerActive = false,
  sleepTimerRemaining,
  onOpenSleepTimer,
  onOpenVlcFullMode,
}) => {
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const effectiveDuration = duration > 0 ? duration : (currentTrack?.duration || 180);
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) || 0;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const ratio = Math.max(0, Math.min(1, clickX / width));
    onSeek(ratio * effectiveDuration);
  };

  return (
    <footer 
      id="spotify-bottom-player"
      className="hidden md:flex h-22 bg-[#181818] border-t border-neutral-800/80 px-4 items-center justify-between z-40 select-none relative"
    >
      {/* 1. Left: Track Info & Artwork */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-[200px] max-w-[320px]">
        {currentTrack ? (
          <>
            <div 
              onClick={onToggleNowPlaying}
              className="relative group w-14 h-14 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0 cursor-pointer shadow-md"
            >
              <TrackThumbnail
                src={currentTrack.thumbnail}
                videoId={currentTrack.youtubeId}
                alt={currentTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 
                  onClick={onToggleNowPlaying}
                  className="text-white text-sm font-semibold truncate hover:underline cursor-pointer"
                  title={currentTrack.title}
                >
                  {currentTrack.title}
                </h4>
              </div>
              <p 
                className="text-neutral-400 text-xs truncate hover:text-white hover:underline cursor-pointer"
                title={currentTrack.artist}
              >
                {currentTrack.artist}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <button
                  onClick={() => {
                    if (playbackMode === 'video' && onOpenVlcFullMode) {
                      onOpenVlcFullMode();
                    } else {
                      onTogglePlaybackMode();
                    }
                  }}
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase cursor-pointer transition ${
                    playbackMode === 'audio' 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' 
                      : 'bg-orange-950 text-orange-400 border border-orange-800/50 hover:bg-orange-900/60'
                  }`}
                  title={playbackMode === 'video' ? 'Click to open VLC Dedicated Full Video Player' : 'Switch playback mode'}
                >
                  {playbackMode === 'audio' ? '🎵 Audio' : '🎬 VLC Video'}
                </button>
                <span 
                  className="hidden sm:inline-flex items-center gap-1 text-[9px] font-semibold text-neutral-400 bg-neutral-800/70 px-1.5 py-0.2 rounded border border-neutral-700/50"
                  title="Background audio & tab-switch protection enabled"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-[#1ed760] animate-pulse' : 'bg-neutral-500'}`} />
                  BG Active
                </span>
                {isPlaying && (
                  <span className="flex items-end gap-0.5 h-2.5">
                    <span className="w-0.5 h-full bg-[#1ed760] animate-pulse" />
                    <span className="w-0.5 h-2/3 bg-[#1ed760] animate-pulse delay-75" />
                    <span className="w-0.5 h-4/5 bg-[#1ed760] animate-pulse delay-150" />
                  </span>
                )}
              </div>
            </div>

            <button
              id="player-like-btn"
              onClick={() => onToggleLike(currentTrack.id)}
              className={`p-1.5 rounded-full hover:scale-110 transition cursor-pointer ${
                isLiked ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
              }`}
              title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 text-neutral-500 text-xs">
            <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-neutral-600" />
            </div>
            <span>No track selected. Paste a YouTube link or choose from library!</span>
          </div>
        )}
      </div>

      {/* 2. Center: Controls & Progress Scrubber */}
      <div className="flex flex-col items-center gap-1.5 max-w-xl w-2/4 px-4">
        {/* Playback Buttons */}
        <div className="flex items-center gap-5">
          {/* Shuffle */}
          <button
            id="player-shuffle-btn"
            onClick={onToggleShuffle}
            className={`p-1.5 rounded-full transition cursor-pointer relative ${
              isShuffled ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
            }`}
            title={isShuffled ? 'Disable Shuffle' : 'Enable Shuffle'}
          >
            <Shuffle className="w-4 h-4" />
            {isShuffled && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760]" />
            )}
          </button>

          {/* Previous Track */}
          <button
            id="player-prev-btn"
            onClick={onPlayPrevious}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:scale-110 transition cursor-pointer"
            title="Previous track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Play / Pause Primary Button */}
          <button
            id="player-play-pause-btn"
            onClick={onTogglePlay}
            disabled={!currentTrack}
            className={`w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg transition-transform duration-150 cursor-pointer ${
              currentTrack ? 'hover:scale-105 active:scale-95' : 'opacity-50 cursor-not-allowed'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current text-black" />
            ) : (
              <Play className="w-4 h-4 fill-current text-black translate-x-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            id="player-next-btn"
            onClick={onPlayNext}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:scale-110 transition cursor-pointer"
            title="Next track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            id="player-repeat-btn"
            onClick={onToggleRepeat}
            className={`p-1.5 rounded-full transition cursor-pointer relative ${
              repeatMode !== 'off' ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
            {repeatMode !== 'off' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760]" />
            )}
          </button>
        </div>

        {/* Scrubber Progress Bar */}
        <div className="w-full flex items-center gap-2 text-[11px] text-neutral-400 font-mono">
          <span className="w-10 text-right">{formatTime(currentTime)}</span>

          <div
            ref={progressBarRef}
            onClick={handleProgressBarClick}
            onMouseEnter={() => setIsHoveringProgress(true)}
            onMouseLeave={() => setIsHoveringProgress(false)}
            className="relative flex-1 h-3 flex items-center cursor-pointer group py-1"
          >
            {/* Background track */}
            <div className="w-full h-1 bg-neutral-700 rounded-full overflow-hidden relative">
              {/* Active fill */}
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  isHoveringProgress ? 'bg-[#1ed760]' : 'bg-white'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Draggable indicator thumb */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-md transition-opacity duration-150 ${
                isHoveringProgress ? 'opacity-100 scale-110' : 'opacity-0'
              }`}
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          <span className="w-10">{formatTime(effectiveDuration)}</span>
        </div>
      </div>

      {/* 3. Right: Play Mode Toggle, Visualizer, Queue, Volume */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
        {/* Audio / Video Switcher button */}
        <button
          id="player-toggle-mode-btn"
          onClick={onTogglePlaybackMode}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
            playbackMode === 'audio'
              ? 'bg-neutral-800 border-emerald-500/50 text-emerald-400 hover:bg-neutral-700'
              : 'bg-neutral-800 border-orange-500/60 text-orange-400 hover:bg-neutral-700'
          }`}
          title="Toggle Audio / Video playback option"
        >
          {playbackMode === 'audio' ? (
            <>
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Audio Only</span>
            </>
          ) : (
            <>
              <Film className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Video Mode</span>
            </>
          )}
        </button>

        {/* If in video mode, add dedicated VLC Full Player button */}
        {playbackMode === 'video' && onOpenVlcFullMode && (
          <button
            onClick={onOpenVlcFullMode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#ff8800] hover:bg-[#ea580c] text-white shadow-md transition cursor-pointer border border-orange-400/40"
            title="Open Dedicated VLC Video Player in Full Mode"
          >
            <VlcConeIcon className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">VLC Full Player</span>
          </button>
        )}

        {/* Picture-in-Picture / Floating Background Player */}
        {onTogglePiP && (
          <button
            id="player-pip-btn"
            onClick={onTogglePiP}
            className={`p-1.5 rounded hover:scale-105 transition cursor-pointer ${
              isPiPActive ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
            }`}
            title={isPiPActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture (Floating Background Mini-Player)'}
          >
            <PictureInPicture2 className="w-4 h-4" />
          </button>
        )}

        {/* Screen Wake Lock Toggle */}
        {onToggleWakeLock && (
          <button
            id="player-wakelock-btn"
            onClick={onToggleWakeLock}
            className={`p-1.5 rounded hover:scale-105 transition cursor-pointer hidden md:block ${
              wakeLockActive ? 'text-amber-400' : 'text-neutral-400 hover:text-white'
            }`}
            title={wakeLockActive ? 'Screen Wake Lock: Active (Screen will not sleep)' : 'Keep Screen Awake during music'}
          >
            <Sun className="w-4 h-4" />
          </button>
        )}

        {/* Sleep Timer Button */}
        {onOpenSleepTimer && (
          <button
            id="player-sleep-timer-btn"
            onClick={onOpenSleepTimer}
            className={`p-1.5 rounded hover:scale-105 transition cursor-pointer relative flex items-center gap-1 ${
              isSleepTimerActive ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
            }`}
            title={
              isSleepTimerActive
                ? `Sleep Timer active (${sleepTimerRemaining || 'Running'}) - Click to manage`
                : 'Sleep Timer (stop music automatically)'
            }
          >
            <Moon className={`w-4 h-4 ${isSleepTimerActive ? 'fill-current text-[#1ed760]' : ''}`} />
            {isSleepTimerActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] absolute top-1 right-1 animate-pulse" />
            )}
            {isSleepTimerActive && sleepTimerRemaining && (
              <span className="text-[10px] font-mono font-bold text-[#1ed760] hidden xl:inline">
                {sleepTimerRemaining}
              </span>
            )}
          </button>
        )}

        {/* Audio Visualizer Toggle */}
        <button
          id="player-visualizer-btn"
          onClick={onToggleVisualizer}
          className={`p-1.5 rounded hover:scale-105 transition cursor-pointer ${
            isVisualizerOpen ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
          }`}
          title="Toggle Music Visualizer & Equalizer"
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Queue Drawer Toggle */}
        <button
          id="player-queue-btn"
          onClick={onToggleQueue}
          className={`p-1.5 rounded hover:scale-105 transition cursor-pointer ${
            isQueueOpen ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
          }`}
          title="Queue / Up Next"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Now Playing Panel Toggle */}
        <button
          id="player-panel-toggle-btn"
          onClick={onToggleNowPlaying}
          className={`p-1.5 rounded hover:scale-105 transition cursor-pointer ${
            isNowPlayingOpen ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
          }`}
          title="Now Playing View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Volume Slider */}
        <div className="flex items-center gap-2 w-28 group">
          <button
            id="player-mute-btn"
            onClick={onToggleMute}
            className="text-neutral-400 hover:text-white cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            id="player-volume-slider"
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#1ed760] group-hover:accent-[#1ed760]"
            title={`Volume: ${isMuted ? 0 : volume}%`}
          />
        </div>
      </div>
    </footer>
  );
};
