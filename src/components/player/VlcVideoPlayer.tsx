import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Headphones, 
  X, 
  ChevronDown, 
  Repeat, 
  Shuffle, 
  Tv,
  Check
} from 'lucide-react';
import { Track, RepeatMode } from '../../types';

export const VlcConeIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="20.5" rx="8.5" ry="2.2" fill="#ea580c" />
    <ellipse cx="12" cy="19.8" rx="7.5" ry="1.8" fill="#f97316" />
    <path d="M12 2.5L6.5 19H17.5L12 2.5Z" fill="#f97316" />
    <path d="M10.2 7.8L8.8 12.2H15.2L13.8 7.8H10.2Z" fill="#ffffff" />
    <path d="M8.1 14.2L7 17.6H17L15.9 14.2H8.1Z" fill="#ffffff" />
  </svg>
);

export function formatVlcTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export interface VlcHeaderProps {
  currentTrack: Track | null;
  aspectRatio: '16:9' | 'fill' | '4:3';
  isFullscreen: boolean;
  showControls: boolean;
  onTogglePlaybackMode: () => void;
  onToggleAspectRatio: () => void;
  onMinimizeToLibrary: () => void;
  onToggleFullscreen: () => void;
}

export const VlcHeader: React.FC<VlcHeaderProps> = ({
  currentTrack,
  aspectRatio,
  isFullscreen,
  showControls,
  onTogglePlaybackMode,
  onToggleAspectRatio,
  onMinimizeToLibrary,
  onToggleFullscreen,
}) => {
  return (
    <div
      className={`h-12 bg-[#1b1c20] border-b border-[#2d2f35] px-4 flex items-center justify-between transition-opacity duration-300 z-20 shrink-0 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0 bg-neutral-900/90 px-2.5 py-1 rounded border border-orange-500/40 shadow-sm">
          <VlcConeIcon className="w-5 h-5 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
          <span className="font-extrabold text-xs tracking-wider text-orange-400 uppercase">VLC Media Player</span>
        </div>
        <span className="text-neutral-500 hidden sm:inline">•</span>
        <span className="text-white text-xs font-medium truncate max-w-[160px] sm:max-w-md" title={currentTrack?.title}>
          {currentTrack?.title || 'Playing Media'}
        </span>
        <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded border border-neutral-700">
          1080p HD Direct
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Switch to Audio button */}
        <button
          onClick={onTogglePlaybackMode}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-[#2a2b30] hover:bg-[#383a42] text-neutral-300 hover:text-white rounded border border-neutral-700 transition cursor-pointer"
          title="Switch to Audio Mode"
        >
          <Headphones className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Audio Mode</span>
        </button>

        {/* Aspect Ratio Toggle */}
        <button
          onClick={onToggleAspectRatio}
          className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[#2a2b30] hover:bg-[#383a42] text-neutral-300 rounded border border-neutral-700 transition cursor-pointer"
          title={`Aspect Ratio: ${aspectRatio}`}
        >
          <Tv className="w-3.5 h-3.5 text-orange-400" />
          <span className="uppercase text-[11px]">{aspectRatio}</span>
        </button>

        {/* Minimize to Library */}
        <button
          onClick={onMinimizeToLibrary}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#2a2b30] hover:bg-[#383a42] text-orange-400 hover:text-orange-300 rounded border border-neutral-700 transition cursor-pointer"
          title="Browse Library (keep playing)"
        >
          <ChevronDown className="w-4 h-4" />
          <span className="hidden sm:inline">Browse Library</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Close to Library */}
        <button
          onClick={onMinimizeToLibrary}
          className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition cursor-pointer"
          title="Minimize to Library"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export interface VlcControlsBarProps {
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  repeatMode?: RepeatMode;
  isShuffled?: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  showControls: boolean;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onPlayPrevious: () => void;
  onPlayNext: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleRepeat?: () => void;
  onToggleShuffle?: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleFullscreen: () => void;
}

export const VlcControlsBar: React.FC<VlcControlsBarProps> = ({
  currentTime,
  duration,
  volume,
  isMuted,
  isPlaying,
  repeatMode = 'off',
  isShuffled = false,
  playbackRate,
  isFullscreen,
  showControls,
  onSeek,
  onTogglePlay,
  onStop,
  onPlayPrevious,
  onPlayNext,
  onVolumeChange,
  onToggleMute,
  onToggleRepeat,
  onToggleShuffle,
  onPlaybackRateChange,
  onToggleFullscreen,
}) => {
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onSeek(val);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const target = Math.max(0, Math.min(duration, pos * duration));
    setHoverSeekTime(target);
  };

  const handleSeekMouseLeave = () => {
    setHoverSeekTime(null);
  };

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div
      className={`bg-[#1b1c20] border-t border-[#2d2f35] px-4 py-3 flex flex-col gap-2 transition-opacity duration-300 z-20 shrink-0 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Timeline Scrubber */}
      <div className="flex items-center gap-3 w-full">
        <span className="text-xs font-mono text-neutral-300 min-w-[42px] text-right">
          {formatVlcTime(currentTime)}
        </span>

        <div className="relative flex-1 group py-1 flex items-center">
          {hoverSeekTime !== null && (
            <div 
              className="absolute -top-7 -translate-x-1/2 bg-neutral-900 border border-orange-500/50 text-orange-400 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow pointer-events-none"
              style={{ left: `${(hoverSeekTime / (duration || 1)) * 100}%` }}
            >
              {formatVlcTime(hoverSeekTime)}
            </div>
          )}

          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeekChange}
            onMouseMove={handleSeekMouseMove}
            onMouseLeave={handleSeekMouseLeave}
            className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#ff8800] hover:h-2 transition-all"
          />
        </div>

        <button
          onClick={() => setShowRemainingTime(!showRemainingTime)}
          className="text-xs font-mono text-neutral-300 min-w-[50px] text-left hover:text-orange-400 transition cursor-pointer"
          title="Click to toggle Total / Remaining Time"
        >
          {showRemainingTime ? `-${formatVlcTime(Math.max(0, duration - currentTime))}` : formatVlcTime(duration)}
        </button>
      </div>

      {/* Toolbar Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Left cluster: Stop, Jump, Prev, Big Play, Next, Jump, Loop */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* VLC Stop Button */}
          <button
            onClick={onStop}
            className="p-2 rounded hover:bg-[#2e3036] text-neutral-300 hover:text-white transition cursor-pointer"
            title="Stop (Reset to 0:00)"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>

          {/* Jump -10s */}
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 10))}
            className="p-2 rounded hover:bg-[#2e3036] text-neutral-300 hover:text-white transition cursor-pointer relative"
            title="Rewind 10 seconds"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="absolute text-[8px] font-bold bottom-1 right-1">10</span>
          </button>

          {/* Previous */}
          <button
            onClick={onPlayPrevious}
            className="p-2 rounded hover:bg-[#2e3036] text-neutral-300 hover:text-white transition cursor-pointer"
            title="Previous Track"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          {/* Big VLC Play / Pause Button */}
          <button
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-[#ff8800] to-[#ea580c] hover:from-[#ffa033] hover:to-[#f97316] text-white flex items-center justify-center shadow-lg transition transform hover:scale-105 active:scale-95 cursor-pointer border border-orange-400/50"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={onPlayNext}
            className="p-2 rounded hover:bg-[#2e3036] text-neutral-300 hover:text-white transition cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          {/* Jump +10s */}
          <button
            onClick={() => onSeek(Math.min(duration, currentTime + 10))}
            className="p-2 rounded hover:bg-[#2e3036] text-neutral-300 hover:text-white transition cursor-pointer relative"
            title="Forward 10 seconds"
          >
            <RotateCw className="w-4 h-4" />
            <span className="absolute text-[8px] font-bold bottom-1 right-1">10</span>
          </button>

          {/* Repeat */}
          {onToggleRepeat && (
            <button
              onClick={onToggleRepeat}
              className={`p-2 rounded transition cursor-pointer relative ${
                repeatMode !== 'off' ? 'text-orange-400 bg-orange-950/40' : 'text-neutral-400 hover:text-white hover:bg-[#2e3036]'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode === 'one' && (
                <span className="absolute text-[9px] font-black top-1 right-1 text-orange-400">1</span>
              )}
            </button>
          )}

          {/* Shuffle */}
          {onToggleShuffle && (
            <button
              onClick={onToggleShuffle}
              className={`p-2 rounded transition cursor-pointer ${
                isShuffled ? 'text-orange-400 bg-orange-950/40' : 'text-neutral-400 hover:text-white hover:bg-[#2e3036]'
              }`}
              title={`Shuffle: ${isShuffled ? 'On' : 'Off'}`}
            >
              <Shuffle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right cluster: Volume, Speed, Fullscreen */}
        <div className="flex items-center gap-3">
          {/* VLC Volume Slider */}
          <div className="flex items-center gap-2 group">
            <button
              onClick={onToggleMute}
              className="p-1.5 rounded hover:bg-[#2e3036] text-neutral-300 hover:text-white transition cursor-pointer"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
              className="w-16 sm:w-24 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#ff8800]"
              title={`Volume: ${isMuted ? 0 : volume}%`}
            />
            <span className="text-[11px] font-mono text-neutral-400 w-8 text-right hidden sm:inline">
              {isMuted ? '0%' : `${volume}%`}
            </span>
          </div>

          {/* Speed Selector */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="px-2 py-1 rounded bg-[#2a2b30] hover:bg-[#383a42] text-xs font-mono font-semibold text-neutral-200 border border-neutral-700 transition cursor-pointer flex items-center gap-1"
              title="Playback Speed"
            >
              <span>{playbackRate}x</span>
            </button>

            {showSpeedMenu && (
              <div className="absolute bottom-full mb-2 right-0 bg-[#1e1f24] border border-[#2e3036] rounded-lg shadow-2xl py-1 w-28 z-40">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                  Playback Speed
                </div>
                {speedOptions.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      onPlaybackRateChange(rate);
                      setShowSpeedMenu(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-neutral-800 transition ${
                      playbackRate === rate ? 'text-orange-400 font-bold bg-orange-950/30' : 'text-neutral-300'
                    }`}
                  >
                    <span>{rate}x</span>
                    {playbackRate === rate && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded hover:bg-[#2e3036] text-neutral-300 hover:text-white transition cursor-pointer"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface VlcDockedPillProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onExpand: () => void;
  onTogglePlaybackMode: () => void;
}

export const VlcDockedPill: React.FC<VlcDockedPillProps> = ({
  currentTrack,
  isPlaying,
  onExpand,
}) => {
  return (
    <div
      id="vlc-docked-pill"
      onClick={onExpand}
      className="fixed bottom-24 right-5 z-40 bg-[#1b1c20]/95 hover:bg-[#25272e] backdrop-blur-md border border-orange-500/70 shadow-2xl rounded-full px-3.5 py-1.5 flex items-center gap-2.5 cursor-pointer hover:scale-105 active:scale-95 transition-all text-white group"
      title="Click to enter VLC Full Video Mode"
    >
      <VlcConeIcon className="w-5 h-5 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
      <div className="flex flex-col text-left max-w-[150px] sm:max-w-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400">VLC Video Player</span>
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-neutral-500'}`} />
        </div>
        <span className="text-xs font-medium text-neutral-200 truncate">
          {currentTrack?.title || 'Video Active'}
        </span>
      </div>
      <span className="text-[10px] font-bold bg-orange-600 hover:bg-orange-500 text-white px-2 py-0.5 rounded-full shadow uppercase tracking-wide">
        Full Mode
      </span>
    </div>
  );
};
