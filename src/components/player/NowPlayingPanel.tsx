import React from 'react';
import { 
  X, 
  Heart, 
  ExternalLink, 
  Headphones, 
  Film, 
  Share2, 
  Check, 
  Music2, 
  Radio, 
  PlusCircle,
  Sparkles,
  PictureInPicture2,
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  ListMusic,
  Activity,
  Moon
} from 'lucide-react';
import { Track, PlaybackMode, RepeatMode } from '../../types';

interface NowPlayingPanelProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  playbackMode: PlaybackMode;
  onTogglePlaybackMode: () => void;
  isLiked: boolean;
  onToggleLike: (trackId: string) => void;
  onClose: () => void;
  onOpenAddToPlaylist: (track: Track) => void;
  videoElementContainer?: React.ReactNode;
  onTogglePiP?: () => void;
  isPiPActive?: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (seconds: number) => void;
  onTogglePlay?: () => void;
  onPlayNext?: () => void;
  onPlayPrevious?: () => void;
  isShuffled?: boolean;
  onToggleShuffle?: () => void;
  repeatMode?: RepeatMode;
  onToggleRepeat?: () => void;
  onOpenQueue?: () => void;
  onOpenVisualizer?: () => void;
  onOpenSleepTimer?: () => void;
  isSleepTimerActive?: boolean;
  sleepTimerRemaining?: string | null;
}

export const NowPlayingPanel: React.FC<NowPlayingPanelProps> = ({
  currentTrack,
  isPlaying,
  playbackMode,
  onTogglePlaybackMode,
  isLiked,
  onToggleLike,
  onClose,
  onOpenAddToPlaylist,
  videoElementContainer,
  onTogglePiP,
  isPiPActive = false,
  currentTime = 0,
  duration = 0,
  onSeek,
  onTogglePlay,
  onPlayNext,
  onPlayPrevious,
  isShuffled = false,
  onToggleShuffle,
  repeatMode = 'off',
  onToggleRepeat,
  onOpenQueue,
  onOpenVisualizer,
  onOpenSleepTimer,
  isSleepTimerActive = false,
  sleepTimerRemaining,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!currentTrack) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentTrack.youtubeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const effectiveDuration = duration > 0 ? duration : currentTrack.duration || 180;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSeek) {
      onSeek(Number(e.target.value));
    }
  };

  return (
    <aside 
      id="now-playing-panel"
      className="fixed inset-0 z-50 bg-[#121212] overflow-y-auto flex flex-col md:relative md:w-80 md:inset-auto md:z-auto md:border-l md:border-neutral-900 select-none custom-scrollbar p-5 pb-16 md:pb-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80">
        {/* Mobile Collapse Chevron */}
        <button
          onClick={onClose}
          className="md:hidden text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-neutral-800 transition cursor-pointer"
          title="Collapse player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white tracking-wide">Now Playing</span>
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
            playbackMode === 'audio' 
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
              : 'bg-red-950 text-red-400 border border-red-800'
          }`}>
            {playbackMode === 'audio' ? 'Audio Only' : 'Video Mode'}
          </span>
        </div>

        {/* Desktop Close Button */}
        <button
          id="close-now-playing-btn"
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition cursor-pointer"
          title="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Display: Audio vs Video Mode */}
      <div className="mt-5 flex flex-col items-center max-w-md mx-auto w-full">
        {playbackMode === 'video' ? (
          /* Video Mode Display */
          <div className="w-full space-y-3">
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-neutral-800 relative">
              {videoElementContainer}
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1 text-red-400 font-semibold">
                <Film className="w-3.5 h-3.5" /> Video Feed Active
              </span>
              <button
                onClick={onTogglePlaybackMode}
                className="text-[#1ed760] hover:underline cursor-pointer flex items-center gap-1 font-medium"
              >
                <Headphones className="w-3.5 h-3.5" /> Switch to Audio
              </button>
            </div>
          </div>
        ) : (
          /* Audio Mode Display (Spotify Artwork & Equalizer) */
          <div className="w-full space-y-4">
            {/* Artwork Card */}
            <div className="relative group w-full aspect-square max-w-xs sm:max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl bg-neutral-900 border border-neutral-800">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
              />

              {/* Vinyl center badge */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-end p-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#1ed760] flex items-center justify-center text-black">
                    <Music2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white tracking-wide">
                    Audio Only Stream
                  </span>
                </div>
              </div>
            </div>

            {/* Simulated Live Equalizer Waveform */}
            <div className="w-full bg-[#181818] p-3.5 rounded-xl border border-neutral-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-medium flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#1ed760]" />
                  Spectrum Equalizer
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {isPlaying ? 'ACTIVE 48kHz' : 'PAUSED'}
                </span>
              </div>

              {/* Animated Equalizer Bars */}
              <div className="h-8 sm:h-10 flex items-end justify-between gap-1 px-1">
                {[45, 75, 90, 60, 30, 85, 95, 70, 50, 80, 65, 40, 90, 55, 35, 75].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-[#1db954] to-emerald-300 rounded-t-sm transition-all"
                    style={{
                      height: isPlaying ? `${Math.max(12, (height * ((i % 3) + 1)) % 100)}%` : '15%',
                      animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                      animationIterationCount: 'infinite',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Track Title & Artist & Like */}
        <div className="w-full mt-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-white text-base sm:text-lg font-bold leading-tight truncate" title={currentTrack.title}>
                {currentTrack.title}
              </h3>
              <p className="text-neutral-400 text-sm font-medium mt-1 truncate" title={currentTrack.artist}>
                {currentTrack.artist}
              </p>
            </div>
            <button
              onClick={() => onToggleLike(currentTrack.id)}
              className={`p-2 rounded-full hover:bg-neutral-800 transition cursor-pointer flex-shrink-0 ${
                isLiked ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
              }`}
              title={isLiked ? 'Liked' : 'Like'}
            >
              <Heart className={`w-6 h-6 sm:w-5 sm:h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Tags */}
          {currentTrack.tags && currentTrack.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {currentTrack.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Mobile-Only Interactive Playback Controls */}
        <div className="w-full md:hidden mt-5 space-y-3">
          {/* Progress Bar & Timers */}
          <div className="w-full space-y-1">
            <input
              type="range"
              min="0"
              max={effectiveDuration}
              value={currentTime}
              onChange={handleSeekChange}
              className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#1ed760]"
            />
            <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(effectiveDuration)}</span>
            </div>
          </div>

          {/* Primary Controls: Shuffle, Prev, Play/Pause, Next, Repeat */}
          <div className="flex items-center justify-between px-2 pt-1">
            <button
              onClick={onToggleShuffle}
              className={`p-2 transition cursor-pointer ${
                isShuffled ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              onClick={onPlayPrevious}
              className="p-2 text-neutral-300 hover:text-white transition cursor-pointer active:scale-95"
              title="Previous"
            >
              <SkipBack className="w-7 h-7 fill-current" />
            </button>

            <button
              onClick={onTogglePlay}
              className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center transition active:scale-95 shadow-lg cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current translate-x-0.5" />
              )}
            </button>

            <button
              onClick={onPlayNext}
              className="p-2 text-neutral-300 hover:text-white transition cursor-pointer active:scale-95"
              title="Next"
            >
              <SkipForward className="w-7 h-7 fill-current" />
            </button>

            <button
              onClick={onToggleRepeat}
              className={`p-2 transition cursor-pointer ${
                repeatMode !== 'off' ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
              }`}
              title="Repeat"
            >
              <Repeat className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Secondary Controls: Queue, Visualizer & Sleep Timer */}
          <div className="flex items-center justify-around pt-2 border-t border-neutral-800/80">
            {onOpenQueue && (
              <button
                onClick={onOpenQueue}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white p-2"
              >
                <ListMusic className="w-4 h-4 text-neutral-300" />
                <span>Queue</span>
              </button>
            )}

            {onOpenVisualizer && (
              <button
                onClick={onOpenVisualizer}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white p-2"
              >
                <Activity className="w-4 h-4 text-[#1ed760]" />
                <span>Visualizer</span>
              </button>
            )}

            {onOpenSleepTimer && (
              <button
                onClick={onOpenSleepTimer}
                className={`flex items-center gap-1.5 text-xs p-2 transition cursor-pointer ${
                  isSleepTimerActive ? 'text-[#1ed760]' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Moon className={`w-4 h-4 ${isSleepTimerActive ? 'fill-current text-[#1ed760]' : ''}`} />
                <span>{isSleepTimerActive ? (sleepTimerRemaining || 'Timer') : 'Sleep Timer'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-2 mt-5">
          <button
            onClick={() => onOpenAddToPlaylist(currentTrack)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#1ed760]" />
            <span>Add to Playlist</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#1ed760]" />
                <span className="text-[#1ed760]">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share Link</span>
              </>
            )}
          </button>
        </div>

        {/* Sleep Timer Button */}
        {onOpenSleepTimer && (
          <button
            id="now-playing-sleep-timer-btn"
            onClick={onOpenSleepTimer}
            className={`w-full flex items-center justify-center gap-2 mt-3 py-2 px-3 rounded-lg border text-xs font-bold transition cursor-pointer ${
              isSleepTimerActive
                ? 'bg-emerald-950/70 border-[#1ed760]/60 text-[#1ed760]'
                : 'bg-neutral-800/80 border-neutral-700 hover:bg-neutral-700 text-white'
            }`}
          >
            <Moon className={`w-3.5 h-3.5 ${isSleepTimerActive ? 'fill-current text-[#1ed760]' : ''}`} />
            <span>
              {isSleepTimerActive
                ? `Sleep Timer Active (${sleepTimerRemaining || 'Running'})`
                : 'Set Sleep Timer'}
            </span>
          </button>
        )}

        {/* Picture-in-Picture Floating Player */}
        {onTogglePiP && (
          <button
            id="now-playing-pip-btn"
            onClick={onTogglePiP}
            className={`w-full flex items-center justify-center gap-2 mt-3 py-2 px-3 rounded-lg border text-xs font-bold transition cursor-pointer ${
              isPiPActive
                ? 'bg-emerald-950 border-[#1ed760] text-[#1ed760]'
                : 'bg-neutral-800/80 border-neutral-700 hover:bg-neutral-700 text-white'
            }`}
          >
            <PictureInPicture2 className="w-3.5 h-3.5" />
            <span>{isPiPActive ? 'Exit Floating Mini-Player' : 'Pop-out Floating Mini-Player (PiP)'}</span>
          </button>
        )}

        {/* Open in YouTube External Link */}
        <a
          href={currentTrack.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 mt-2 py-2 px-3 rounded-lg border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-400 hover:text-white transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open in YouTube</span>
        </a>

        {/* Mode Switch Card */}
        <div className="w-full mt-6 p-4 rounded-xl bg-gradient-to-br from-neutral-900 to-[#181818] border border-neutral-800 text-xs text-neutral-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#1ed760]" />
              Playback Engine
            </span>
            <button
              onClick={onTogglePlaybackMode}
              className="text-xs font-bold text-[#1ed760] hover:underline cursor-pointer"
            >
              Switch Mode
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            {playbackMode === 'audio'
              ? 'Audio-Only mode bypasses video rendering to conserve mobile bandwidth, battery life, and provide uninterrupted playback.'
              : 'Video mode renders the full-resolution YouTube stream.'}
          </p>
        </div>
      </div>
    </aside>
  );
};
