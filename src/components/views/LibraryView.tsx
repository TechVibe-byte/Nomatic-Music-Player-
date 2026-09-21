import React, { useState } from 'react';
import { 
  Library, 
  Music, 
  Heart, 
  Plus, 
  Trash2, 
  Play, 
  Headphones, 
  Film,
  HardDrive,
  Layers
} from 'lucide-react';
import { Track, Playlist, ActiveView } from '../../types';
import { formatTime } from '../../utils/youtube';

interface LibraryViewProps {
  tracks: Track[];
  playlists: Playlist[];
  likedTrackIds: string[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, newQueue?: Track[]) => void;
  onToggleLike: (trackId: string) => void;
  onDeleteTrackFromLibrary: (trackId: string) => void;
  onOpenAddModal: () => void;
  onOpenAddModalWithMode?: (mode: 'single' | 'bulk') => void;
  onOpenCreatePlaylistModal: () => void;
  onOpenConfigModal: () => void;
  setActiveView: (view: ActiveView) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  tracks,
  playlists,
  likedTrackIds,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onToggleLike,
  onDeleteTrackFromLibrary,
  onOpenAddModal,
  onOpenAddModalWithMode,
  onOpenCreatePlaylistModal,
  onOpenConfigModal,
  setActiveView,
}) => {
  const [activeTab, setActiveTab] = useState<'playlists' | 'tracks' | 'liked'>('playlists');

  const likedTracks = tracks.filter((t) => likedTrackIds.includes(t.id));

  return (
    <div id="library-view" className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 text-[#1ed760] flex items-center justify-center">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Your Local Library</h1>
            <p className="text-xs text-neutral-400">
              Stored in browser local config — {tracks.length} tracks &bull; {playlists.length} playlists
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1ed760] text-black font-bold text-xs hover:scale-105 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add YouTube Link</span>
          </button>

          <button
            id="library-bulk-urls-btn"
            onClick={() => {
              if (onOpenAddModalWithMode) {
                onOpenAddModalWithMode('bulk');
              } else {
                onOpenAddModal();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-bold text-xs transition cursor-pointer border border-neutral-700 hover:border-neutral-500"
            title="Paste multiple links with duplicate filter"
          >
            <Layers className="w-3.5 h-3.5 text-[#1ed760]" />
            <span>Bulk URLs</span>
          </button>

          <button
            onClick={onOpenCreatePlaylistModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition cursor-pointer"
          >
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          onClick={() => setActiveTab('playlists')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            activeTab === 'playlists'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          Playlists ({playlists.length})
        </button>

        <button
          onClick={() => setActiveTab('tracks')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            activeTab === 'tracks'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          All Songs ({tracks.length})
        </button>

        <button
          onClick={() => setActiveTab('liked')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            activeTab === 'liked'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          Liked Songs ({likedTracks.length})
        </button>
      </div>

      {/* Tab Content: Playlists */}
      {activeTab === 'playlists' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Liked Songs Special Card */}
          <div
            onClick={() => setActiveView({ type: 'liked' })}
            className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 to-purple-900 border border-indigo-800/40 hover:border-indigo-600 transition cursor-pointer flex flex-col justify-between h-44 shadow-lg group"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                Special Collection
              </span>
              <h3 className="text-xl font-bold text-white mt-1 group-hover:underline">Liked Songs</h3>
              <p className="text-xs text-purple-200/70 mt-1">Your saved favorite YouTube tracks</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-200">
                {likedTracks.length} tracks
              </span>
              <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                <Heart className="w-5 h-5 fill-current text-purple-600" />
              </div>
            </div>
          </div>

          {/* User Playlists */}
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => setActiveView({ type: 'playlist', playlistId: pl.id })}
              className={`p-5 rounded-2xl bg-gradient-to-br ${pl.gradient} border border-neutral-800 hover:border-neutral-700 transition cursor-pointer flex flex-col justify-between h-44 shadow-lg group`}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Playlist
                </span>
                <h3 className="text-lg font-bold text-white mt-1 group-hover:underline truncate">
                  {pl.name}
                </h3>
                <p className="text-xs text-neutral-300/80 line-clamp-2 mt-1">{pl.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-neutral-400">{pl.trackIds.length} tracks</span>
                <div className="w-9 h-9 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition hover:scale-105">
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: All Songs & Liked */}
      {(activeTab === 'tracks' || activeTab === 'liked') && (
        <div className="space-y-3">
          {(activeTab === 'tracks' ? tracks : likedTracks).length > 0 ? (
            <div className="divide-y divide-neutral-900 bg-neutral-900/40 rounded-2xl border border-neutral-800 overflow-hidden">
              {(activeTab === 'tracks' ? tracks : likedTracks).map((track, i) => {
                const isCurrent = currentTrack?.id === track.id;
                const isLiked = likedTrackIds.includes(track.id);

                return (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track, activeTab === 'tracks' ? tracks : likedTracks)}
                    className={`flex items-center justify-between p-3.5 px-5 hover:bg-neutral-800/80 transition cursor-pointer group ${
                      isCurrent ? 'bg-neutral-800/90 text-white' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <span className="text-xs text-neutral-500 font-mono w-5 text-center">
                        {i + 1}
                      </span>
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-neutral-800"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold truncate ${
                            isCurrent ? 'text-[#1ed760]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-400 font-mono">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        track.modePreference === 'video'
                          ? 'bg-red-950 text-red-400'
                          : 'bg-emerald-950 text-emerald-400'
                      }`}>
                        {track.modePreference === 'video' ? 'Video' : 'Audio'}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike(track.id);
                        }}
                        className={`p-1.5 transition cursor-pointer ${
                          isLiked ? 'text-[#1ed760]' : 'text-neutral-500 hover:text-white'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      </button>

                      <span>{formatTime(track.duration)}</span>

                      {activeTab === 'tracks' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove "${track.title}" from local library?`)) {
                              onDeleteTrackFromLibrary(track.id);
                            }
                          }}
                          className="p-1.5 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Delete from Library"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-neutral-900/30 rounded-2xl border border-neutral-800 text-neutral-400 space-y-3">
              <Music className="w-10 h-10 mx-auto text-neutral-600" />
              <p className="text-sm">No songs found in this category.</p>
              <button
                onClick={onOpenAddModal}
                className="px-4 py-2 rounded-full bg-[#1ed760] text-black text-xs font-bold hover:scale-105 transition cursor-pointer"
              >
                Add Your First YouTube Song
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
