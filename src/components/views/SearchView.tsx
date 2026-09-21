import React, { useState } from 'react';
import { Search, Youtube, Play, Heart, Plus, Sparkles, Music } from 'lucide-react';
import { Track, Playlist, ActiveView } from '../../types';
import { formatTime } from '../../utils/youtube';

interface SearchViewProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  tracks: Track[];
  playlists: Playlist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, newQueue?: Track[]) => void;
  onToggleLike: (trackId: string) => void;
  likedTrackIds: string[];
  onOpenAddModal: () => void;
  setActiveView: (view: ActiveView) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  searchQuery,
  setSearchQuery,
  tracks,
  playlists,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onToggleLike,
  likedTrackIds,
  onOpenAddModal,
  setActiveView,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'tracks' | 'playlists'>('all');

  const filteredTracks = tracks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const filteredPlaylists = playlists.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="search-view" className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16">
      {/* Search Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-neutral-900 border border-emerald-800/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-white">Import & Explore YouTube Music</h2>
          </div>
          <p className="text-xs text-neutral-300">
            Search your local library or paste any YouTube music video link to add it.
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1ed760] text-black font-bold text-xs hover:scale-105 transition cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add by YouTube URL</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            filterType === 'all'
              ? 'bg-white text-black'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType('tracks')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            filterType === 'tracks'
              ? 'bg-white text-black'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          Songs ({filteredTracks.length})
        </button>
        <button
          onClick={() => setFilterType('playlists')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            filterType === 'playlists'
              ? 'bg-white text-black'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          Playlists ({filteredPlaylists.length})
        </button>
      </div>

      {/* Tracks Search Results */}
      {(filterType === 'all' || filterType === 'tracks') && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white tracking-tight">Songs</h3>
          {filteredTracks.length > 0 ? (
            <div className="divide-y divide-neutral-900/60 bg-neutral-900/30 rounded-xl border border-neutral-800/80 overflow-hidden">
              {filteredTracks.map((track) => {
                const isCurrent = currentTrack?.id === track.id;
                const isTrackPlaying = isCurrent && isPlaying;
                const isLiked = likedTrackIds.includes(track.id);

                return (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track, filteredTracks)}
                    className={`flex items-center justify-between p-3 px-4 hover:bg-neutral-800/70 transition cursor-pointer group ${
                      isCurrent ? 'bg-neutral-800/80 text-white' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Play className="w-4 h-4 text-white fill-current" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-semibold text-sm truncate ${
                            isCurrent ? 'text-[#1ed760]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-400 font-mono">
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
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-neutral-900/40 rounded-xl border border-neutral-800 text-neutral-400 text-xs">
              No matching tracks found for "{searchQuery}".
            </div>
          )}
        </div>
      )}

      {/* Playlists Search Results */}
      {(filterType === 'all' || filterType === 'playlists') && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white tracking-tight">Playlists</h3>
          {filteredPlaylists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => setActiveView({ type: 'playlist', playlistId: pl.id })}
                  className={`p-4 rounded-xl bg-gradient-to-br ${pl.gradient} border border-neutral-800 hover:border-neutral-700 transition cursor-pointer flex flex-col justify-between h-36`}
                >
                  <div>
                    <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">
                      Playlist
                    </span>
                    <h4 className="text-base font-bold text-white mt-1 truncate">{pl.name}</h4>
                    <p className="text-xs text-neutral-300/80 line-clamp-2 mt-1">{pl.description}</p>
                  </div>
                  <span className="text-[11px] text-neutral-300 font-medium">
                    {pl.trackIds.length} tracks
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-neutral-900/40 rounded-xl border border-neutral-800 text-neutral-400 text-xs">
              No matching playlists found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
