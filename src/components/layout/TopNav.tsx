import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  Headphones, 
  Film, 
  Settings2,
  HardDrive,
  Layers,
  Radio,
  ListMusic
} from 'lucide-react';
import { ActiveView, PlaybackMode } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { NomaticLogo } from '../common/NomaticLogo';

interface TopNavProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  playbackMode: PlaybackMode;
  onTogglePlaybackMode: () => void;
  onOpenAddModal: () => void;
  onOpenAddModalWithMode?: (mode: 'single' | 'playlist' | 'bulk') => void;
  onOpenConfigModal: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onBack: () => void;
  onForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeView,
  setActiveView,
  playbackMode,
  onTogglePlaybackMode,
  onOpenAddModal,
  onOpenAddModalWithMode,
  onOpenConfigModal,
  searchQuery,
  setSearchQuery,
  onBack,
  onForward,
  canGoBack,
  canGoForward,
}) => {
  return (
    <header 
      id="spotify-topnav"
      className="h-14 sm:h-16 px-3 sm:px-6 bg-[#121212]/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between border-b border-neutral-900/80 gap-2 sm:gap-4 select-none"
    >
      {/* Left: Mobile Brand Logo & Navigation arrows & Search bar */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-xl">
        {/* Mobile-only brand icon when sidebar is hidden */}
        <div 
          onClick={() => setActiveView({ type: 'home' })}
          className="flex md:hidden items-center gap-1.5 cursor-pointer flex-shrink-0"
          title="Nomatic Music player"
        >
          <NomaticLogo size="sm" />
        </div>

        {/* Navigation arrows (hidden on small mobile to save space) */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            id="nav-back-btn"
            onClick={onBack}
            disabled={!canGoBack}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 flex items-center justify-center transition cursor-pointer ${
              canGoBack ? 'text-white hover:bg-neutral-800' : 'text-neutral-600 cursor-not-allowed'
            }`}
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            id="nav-forward-btn"
            onClick={onForward}
            disabled={!canGoForward}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 flex items-center justify-center transition cursor-pointer ${
              canGoForward ? 'text-white hover:bg-neutral-800' : 'text-neutral-600 cursor-not-allowed'
            }`}
            title="Go forward"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 pointer-events-none" />
          <input
            id="global-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeView.type !== 'search') {
                setActiveView({ type: 'search' });
              }
            }}
            placeholder="Search tracks or paste link..."
            className="w-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2e2e2e] text-white text-xs sm:text-sm rounded-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
          />
        </div>
      </div>

      {/* Right Controls: Play Mode Switcher, Quick Add, CFG Local, PWA Install */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Play Option Switcher: Audio Only vs Video Only */}
        <div 
          id="play-mode-toggle"
          className="flex items-center bg-[#242424] p-0.5 sm:p-1 rounded-full border border-neutral-800 shadow-inner"
        >
          <button
            id="mode-audio-btn"
            onClick={() => playbackMode !== 'audio' && onTogglePlaybackMode()}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              playbackMode === 'audio'
                ? 'bg-[#1ed760] text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Audio Only Mode: Save bandwidth & enables smooth background audio"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Audio</span>
          </button>

          <button
            id="mode-video-btn"
            onClick={() => playbackMode !== 'video' && onTogglePlaybackMode()}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              playbackMode === 'video'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Video Only Mode: Watch YouTube video directly"
          >
            <Film className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Video</span>
          </button>
        </div>

        {/* Quick Add YouTube Link Button */}
        <button
          id="top-add-youtube-btn"
          onClick={onOpenAddModal}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-xs font-bold hover:scale-105 active:scale-95 transition cursor-pointer shadow"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="hidden md:inline">Add Track</span>
        </button>

        {/* Quick Import Playlist Button */}
        <button
          id="top-add-playlist-btn"
          onClick={() => {
            if (onOpenAddModalWithMode) {
              onOpenAddModalWithMode('playlist');
            } else {
              onOpenAddModal();
            }
          }}
          className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 hover:text-white text-xs font-bold transition cursor-pointer border border-emerald-500/40"
          title="Import YouTube playlist automatically"
        >
          <ListMusic className="w-3.5 h-3.5 text-[#1ed760]" />
          <span>Import Playlist</span>
        </button>

        {/* Bulk URLs Button */}
        <button
          id="top-bulk-urls-btn"
          onClick={() => {
            if (onOpenAddModalWithMode) {
              onOpenAddModalWithMode('bulk');
            } else {
              onOpenAddModal();
            }
          }}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-bold transition cursor-pointer border border-neutral-700 hover:border-neutral-500"
          title="Paste multiple YouTube links with duplicate filtering"
        >
          <Layers className="w-3.5 h-3.5 text-[#1ed760]" />
          <span>Bulk URLs</span>
        </button>

        {/* PWA Install Button (Always visible on mobile & desktop) */}
        <PWAInstallButton compact={true} />

        {/* Local Storage Config Button */}
        <button
          id="top-config-btn"
          onClick={onOpenConfigModal}
          className="hidden md:flex w-8 h-8 rounded-full bg-[#242424] hover:bg-[#2e2e2e] items-center justify-center text-neutral-300 hover:text-white transition cursor-pointer"
          title="Local Storage Config & JSON Backup"
        >
          <HardDrive className="w-4 h-4 text-emerald-400" />
        </button>
      </div>
    </header>
  );
};
