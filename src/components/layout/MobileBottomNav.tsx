import React from 'react';
import { Home, Search, Library, PlusCircle, Settings, Layers, ListMusic } from 'lucide-react';
import { ActiveView } from '../../types';
import { TelegramIcon } from '../common/TelegramNotification';

interface MobileBottomNavProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onOpenAddModal: () => void;
  onOpenAddModalWithMode?: (mode: 'single' | 'playlist' | 'bulk') => void;
  onOpenConfigModal: () => void;
  onOpenTelegramModal?: () => void;
  likedCount: number;
  playlistsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  setActiveView,
  onOpenAddModal,
  onOpenAddModalWithMode,
  onOpenConfigModal,
  onOpenTelegramModal,
}) => {
  const [showAddMenu, setShowAddMenu] = React.useState(false);

  const isHomeActive = activeView.type === 'home';
  const isSearchActive = activeView.type === 'search';
  const isLibraryActive =
    activeView.type === 'library' || activeView.type === 'playlist' || activeView.type === 'liked';

  return (
    <>
      {/* Quick Add Popover on Mobile if user taps (+) */}
      {showAddMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden flex flex-col justify-end p-4 animate-fadeIn"
          onClick={() => setShowAddMenu(false)}
        >
          <div
            className="w-full bg-[#202020] border border-neutral-800 rounded-2xl p-4 space-y-2 mb-16 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-2 pb-1">
              Add YouTube Music
            </div>

            <button
              id="mobile-menu-single-url-btn"
              onClick={() => {
                setShowAddMenu(false);
                if (onOpenAddModalWithMode) {
                  onOpenAddModalWithMode('single');
                } else {
                  onOpenAddModal();
                }
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-left transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1ed760]/20 text-[#1ed760] flex items-center justify-center font-bold">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Single YouTube URL</p>
                <p className="text-xs text-neutral-400">Add 1 song or music video</p>
              </div>
            </button>

            <button
              id="mobile-menu-playlist-url-btn"
              onClick={() => {
                setShowAddMenu(false);
                if (onOpenAddModalWithMode) {
                  onOpenAddModalWithMode('playlist');
                } else {
                  onOpenAddModal();
                }
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-left transition cursor-pointer border border-[#1ed760]/30"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1ed760] text-black flex items-center justify-center font-bold">
                <ListMusic className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-white">YouTube Playlist</p>
                  <span className="text-[9px] bg-black text-[#1ed760] font-extrabold px-1 rounded uppercase">Auto</span>
                </div>
                <p className="text-xs text-neutral-400">Auto-detect all songs from playlist URL</p>
              </div>
            </button>

            <button
              id="mobile-menu-bulk-urls-btn"
              onClick={() => {
                setShowAddMenu(false);
                if (onOpenAddModalWithMode) {
                  onOpenAddModalWithMode('bulk');
                } else {
                  onOpenAddModal();
                }
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-left transition cursor-pointer border border-emerald-500/20"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-950 text-[#1ed760] flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Bulk YouTube URLs</p>
                <p className="text-xs text-neutral-400">Paste multiple links with auto duplicate filter</p>
              </div>
            </button>

            {onOpenTelegramModal && (
              <button
                id="mobile-menu-telegram-btn"
                onClick={() => {
                  setShowAddMenu(false);
                  onOpenTelegramModal();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-left transition cursor-pointer border border-[#229ED9]/40"
              >
                <div className="w-9 h-9 rounded-lg bg-[#229ED9] text-white flex items-center justify-center font-bold">
                  <TelegramIcon className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Telegram Remote & Cloud Backup</p>
                  <p className="text-xs text-neutral-400">Send YouTube links via bot to load here</p>
                </div>
              </button>
            )}

            <button
              id="mobile-menu-cancel-btn"
              onClick={() => setShowAddMenu(false)}
              className="w-full mt-2 py-2 text-center text-xs font-semibold text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-nav"
        className="w-full bg-[#121212]/98 backdrop-blur-xl border-t border-neutral-850/80 flex items-center justify-around h-14 px-2 select-none touch-manipulation flex-shrink-0"
      >
        {/* Home */}
        <button
          id="mobile-nav-home-btn"
          onClick={() => setActiveView({ type: 'home' })}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors cursor-pointer ${
            isHomeActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Home className={`w-5 h-5 ${isHomeActive ? 'text-[#1ed760]' : ''}`} />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Home</span>
        </button>

        {/* Search */}
        <button
          id="mobile-nav-search-btn"
          onClick={() => setActiveView({ type: 'search' })}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors cursor-pointer ${
            isSearchActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Search className={`w-5 h-5 ${isSearchActive ? 'text-[#1ed760]' : ''}`} />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Search</span>
        </button>

        {/* Add YouTube Music */}
        <button
          id="mobile-nav-add-btn"
          onClick={() => setShowAddMenu(true)}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-neutral-300 hover:text-white transition-colors cursor-pointer"
          title="Add YouTube track or bulk links"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-[#1ed760] text-black flex items-center justify-center shadow-md">
            <PlusCircle className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-semibold text-[#1ed760] tracking-tight mt-0.5">Add</span>
        </button>

        {/* Library */}
        <button
          id="mobile-nav-library-btn"
          onClick={() => setActiveView({ type: 'library' })}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors cursor-pointer ${
            isLibraryActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Library className={`w-5 h-5 ${isLibraryActive ? 'text-[#1ed760]' : ''}`} />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Your Library</span>
        </button>

        {/* Settings / Config & PWA */}
        <button
          id="mobile-nav-config-btn"
          onClick={onOpenConfigModal}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Config</span>
        </button>
      </nav>
    </>
  );
};
