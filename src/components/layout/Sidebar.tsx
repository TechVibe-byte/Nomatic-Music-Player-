import React from 'react';
import { 
  Home, 
  Search, 
  Library, 
  PlusSquare, 
  Heart, 
  Settings, 
  Music, 
  Youtube,
  Radio,
  Layers,
  ListMusic
} from 'lucide-react';
import { ActiveView, Playlist } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { NomaticLogo } from '../common/NomaticLogo';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  playlists: Playlist[];
  likedCount: number;
  onOpenAddModal: () => void;
  onOpenAddModalWithMode?: (mode: 'single' | 'playlist' | 'bulk') => void;
  onOpenCreatePlaylistModal: () => void;
  onOpenConfigModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  playlists,
  likedCount,
  onOpenAddModal,
  onOpenAddModalWithMode,
  onOpenCreatePlaylistModal,
  onOpenConfigModal,
}) => {
  return (
    <aside 
      id="spotify-sidebar" 
      className="hidden md:flex md:w-60 lg:w-64 flex-shrink-0 bg-[#000000] flex-col h-full border-r border-neutral-900 select-none text-neutral-400"
    >
      {/* Brand Header */}
      <div className="p-6 pb-4">
        <div 
          onClick={() => setActiveView({ type: 'home' })}
          className="flex items-center gap-3 cursor-pointer group"
          title="Nomatic Music player"
        >
          <NomaticLogo size="md" className="group-hover:scale-105" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base lg:text-[17px] tracking-tight text-white group-hover:text-[#1ed760] transition-colors">
                Nomatic
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium">Music Player</p>
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <div className="px-3 py-2 space-y-1">
        <button
          id="nav-home"
          onClick={() => setActiveView({ type: 'home' })}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md font-semibold text-sm transition-all duration-150 cursor-pointer ${
            activeView.type === 'home'
              ? 'text-white bg-neutral-800/80 font-bold'
              : 'hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <Home className={`w-5 h-5 ${activeView.type === 'home' ? 'text-[#1ed760]' : ''}`} />
          <span>Home</span>
        </button>

        <button
          id="nav-search"
          onClick={() => setActiveView({ type: 'search' })}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md font-semibold text-sm transition-all duration-150 cursor-pointer ${
            activeView.type === 'search'
              ? 'text-white bg-neutral-800/80 font-bold'
              : 'hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <Search className={`w-5 h-5 ${activeView.type === 'search' ? 'text-[#1ed760]' : ''}`} />
          <span>Search</span>
        </button>

        <button
          id="nav-library"
          onClick={() => setActiveView({ type: 'library' })}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md font-semibold text-sm transition-all duration-150 cursor-pointer ${
            activeView.type === 'library'
              ? 'text-white bg-neutral-800/80 font-bold'
              : 'hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <Library className={`w-5 h-5 ${activeView.type === 'library' ? 'text-[#1ed760]' : ''}`} />
          <span>Your Library</span>
        </button>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="mt-4 px-3 pt-3 border-t border-neutral-900 space-y-1">
        <button
          id="btn-add-youtube"
          onClick={onOpenAddModal}
          className="w-full flex items-center gap-4 px-3 py-2.5 rounded-md font-semibold text-sm text-neutral-300 hover:text-white hover:bg-neutral-900/60 transition group cursor-pointer"
        >
          <div className="w-6 h-6 rounded bg-[#ff0000]/20 text-[#ff4e4e] flex items-center justify-center group-hover:scale-105 transition-transform">
            <Youtube className="w-4 h-4 fill-current" />
          </div>
          <span className="truncate">Add YouTube Link</span>
        </button>

        <button
          id="btn-import-youtube-playlist"
          onClick={() => {
            if (onOpenAddModalWithMode) {
              onOpenAddModalWithMode('playlist');
            } else {
              onOpenAddModal();
            }
          }}
          className="w-full flex items-center gap-4 px-3 py-2.5 rounded-md font-semibold text-sm text-neutral-300 hover:text-white hover:bg-neutral-900/60 transition group cursor-pointer"
        >
          <div className="w-6 h-6 rounded bg-[#1ed760]/20 text-[#1ed760] flex items-center justify-center group-hover:scale-105 transition-transform">
            <ListMusic className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between flex-1 truncate">
            <span className="truncate">Import Playlist</span>
            <span className="text-[10px] bg-emerald-950 text-[#1ed760] font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30">
              Auto
            </span>
          </div>
        </button>

        <button
          id="btn-bulk-import-urls"
          onClick={() => {
            if (onOpenAddModalWithMode) {
              onOpenAddModalWithMode('bulk');
            } else {
              onOpenAddModal();
            }
          }}
          className="w-full flex items-center gap-4 px-3 py-2.5 rounded-md font-semibold text-sm text-neutral-300 hover:text-white hover:bg-neutral-900/60 transition group cursor-pointer"
        >
          <div className="w-6 h-6 rounded bg-[#1ed760]/20 text-[#1ed760] flex items-center justify-center group-hover:scale-105 transition-transform">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-between flex-1 truncate">
            <span className="truncate">Bulk Import URLs</span>
            <span className="text-[10px] bg-neutral-800/80 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
              Filter
            </span>
          </div>
        </button>

        <button
          id="btn-create-playlist"
          onClick={onOpenCreatePlaylistModal}
          className="w-full flex items-center gap-4 px-3 py-2.5 rounded-md font-semibold text-sm text-neutral-300 hover:text-white hover:bg-neutral-900/60 transition group cursor-pointer"
        >
          <div className="w-6 h-6 rounded bg-neutral-800 text-neutral-300 flex items-center justify-center group-hover:text-white group-hover:bg-neutral-700 transition">
            <PlusSquare className="w-4 h-4" />
          </div>
          <span className="truncate">Create Playlist</span>
        </button>

        <button
          id="nav-liked"
          onClick={() => setActiveView({ type: 'liked' })}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-md font-semibold text-sm transition-all duration-150 cursor-pointer ${
            activeView.type === 'liked'
              ? 'text-white bg-neutral-800/80'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-700 to-purple-500 text-white flex items-center justify-center shadow">
            <Heart className="w-3.5 h-3.5 fill-current" />
          </div>
          <div className="flex items-center justify-between flex-1 truncate">
            <span className="truncate">Liked Songs</span>
            {likedCount > 0 && (
              <span className="text-xs text-neutral-500 px-1.5 py-0.5 rounded-full bg-neutral-800">
                {likedCount}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Playlist List Header */}
      <div className="px-6 pt-5 pb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-500">
        <span>Playlists ({playlists.length})</span>
      </div>

      {/* Scrollable Playlists */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5 custom-scrollbar">
        {playlists.map((playlist) => {
          const isActive =
            activeView.type === 'playlist' && activeView.playlistId === playlist.id;
          return (
            <button
              key={playlist.id}
              id={`sidebar-playlist-${playlist.id}`}
              onClick={() => setActiveView({ type: 'playlist', playlistId: playlist.id })}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors truncate flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'text-[#1ed760] font-semibold bg-neutral-900/90'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
              }`}
            >
              <Music className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#1ed760]' : 'text-neutral-600'}`} />
              <span className="truncate">{playlist.name}</span>
            </button>
          );
        })}
      </div>

      {/* Footer / Utilities: CFG Local & Install App */}
      <div className="p-4 border-t border-neutral-900 bg-black/50 space-y-2">
        <PWAInstallButton compact={false} />

        <button
          id="btn-config-local"
          onClick={onOpenConfigModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-neutral-400" />
            <span>CFG Local & Backup</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">ACTIVE</span>
        </button>
      </div>
    </aside>
  );
};
