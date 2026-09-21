import React from 'react';
import { 
  Play, 
  Pause, 
  Heart, 
  Plus, 
  Sparkles, 
  Headphones, 
  Film, 
  Music,
  Radio,
  ListMusic
} from 'lucide-react';
import { Track, Playlist, ActiveView } from '../../types';

interface HomeViewProps {
  tracks: Track[];
  playlists: Playlist[];
  likedTrackIds: string[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, newQueue?: Track[]) => void;
  onTogglePlay: () => void;
  setActiveView: (view: ActiveView) => void;
  onOpenAddModal: () => void;
  onOpenAddModalWithMode?: (mode: 'single' | 'playlist' | 'bulk') => void;
  onOpenCreatePlaylistModal: () => void;
  onToggleLike: (trackId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tracks,
  playlists,
  likedTrackIds,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  setActiveView,
  onOpenAddModal,
  onOpenAddModalWithMode,
  onOpenCreatePlaylistModal,
  onToggleLike,
}) => {
  // Time-based greeting like Spotify
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const likedTracks = tracks.filter((t) => likedTrackIds.includes(t.id));
  const recentTracks = [...tracks].sort((a, b) => b.addedAt - a.addedAt).slice(0, 10);

  return (
    <div id="home-view" className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {getGreeting()}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Stream YouTube music in pure Spotify dark mode with audio-only or video playback.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            id="home-import-playlist-btn"
            onClick={() => onOpenAddModalWithMode ? onOpenAddModalWithMode('playlist') : onOpenAddModal()}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 font-bold text-xs hover:scale-105 active:scale-95 transition cursor-pointer shadow"
          >
            <ListMusic className="w-4 h-4 text-[#1ed760]" />
            <span>Import Playlist</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#1ed760] text-black font-bold text-xs hover:scale-105 active:scale-95 transition cursor-pointer shadow-lg shadow-[#1ed760]/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Track</span>
          </button>
        </div>
      </div>

      {/* 6-Card Quick Access Grid (Spotify Signature) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Liked Songs Quick Card */}
        <div
          onClick={() => setActiveView({ type: 'liked' })}
          className="flex items-center gap-4 bg-neutral-800/60 hover:bg-neutral-800 rounded-md overflow-hidden transition-all duration-200 cursor-pointer group shadow-sm"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-700 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
            <Heart className="w-7 h-7 fill-current" />
          </div>
          <div className="flex-1 min-w-0 pr-3 flex items-center justify-between">
            <div>
              <span className="font-bold text-sm text-white truncate block">Liked Songs</span>
              <span className="text-xs text-neutral-400">{likedTracks.length} tracks</span>
            </div>
            {likedTracks.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTrack(likedTracks[0], likedTracks);
                }}
                className="w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current translate-x-0.5" />
              </button>
            )}
          </div>
        </div>

        {/* Playlists Quick Cards */}
        {playlists.slice(0, 5).map((pl) => {
          const plTracks = tracks.filter((t) => pl.trackIds.includes(t.id));
          const firstTrackThumb = plTracks[0]?.thumbnail;

          return (
            <div
              key={pl.id}
              onClick={() => setActiveView({ type: 'playlist', playlistId: pl.id })}
              className="flex items-center gap-4 bg-neutral-800/60 hover:bg-neutral-800 rounded-md overflow-hidden transition-all duration-200 cursor-pointer group shadow-sm"
            >
              <div className="w-16 h-16 bg-neutral-700 flex items-center justify-center text-neutral-400 flex-shrink-0 overflow-hidden">
                {firstTrackThumb ? (
                  <img src={firstTrackThumb} alt={pl.name} className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-6 h-6 text-neutral-500" />
                )}
              </div>
              <div className="flex-1 min-w-0 pr-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-white truncate block">{pl.name}</span>
                  <span className="text-xs text-neutral-400">{pl.trackIds.length} tracks</span>
                </div>
                {plTracks.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(plTracks[0], plTracks);
                    }}
                    className="w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Section: Your YouTube Tracks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Your YouTube Tracks</h2>
            <p className="text-xs text-neutral-400">Cached in local configuration with background playback</p>
          </div>
          <button
            onClick={() => setActiveView({ type: 'library' })}
            className="text-xs font-bold text-neutral-400 hover:text-white hover:underline cursor-pointer"
          >
            Show all
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {recentTracks.map((track) => {
            const isThisTrackPlaying = currentTrack?.id === track.id && isPlaying;
            const isLiked = likedTrackIds.includes(track.id);

            return (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track, tracks)}
                className="p-3.5 bg-neutral-900/60 hover:bg-neutral-800/80 rounded-xl transition-all duration-200 group cursor-pointer flex flex-col justify-between relative border border-transparent hover:border-neutral-700/60"
              >
                <div>
                  {/* Thumbnail & Floating Play Button */}
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-neutral-800 shadow-md mb-3">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Mode tag */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-sm text-neutral-200">
                      {track.modePreference === 'video' ? '🎬 Video' : '🎵 Audio'}
                    </div>

                    {/* Floating Play/Pause Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentTrack?.id === track.id) {
                          onTogglePlay();
                        } else {
                          onPlayTrack(track, tracks);
                        }
                      }}
                      className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-xl transition-all duration-200 cursor-pointer ${
                        isThisTrackPlaying
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105'
                      }`}
                    >
                      {isThisTrackPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current translate-x-0.5" />
                      )}
                    </button>
                  </div>

                  <h3
                    className={`font-semibold text-sm line-clamp-1 group-hover:underline ${
                      currentTrack?.id === track.id ? 'text-[#1ed760]' : 'text-white'
                    }`}
                    title={track.title}
                  >
                    {track.title}
                  </h3>
                  <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">{track.artist}</p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/60 text-[11px] text-neutral-500">
                  <span>YouTube</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(track.id);
                    }}
                    className={`p-1 hover:scale-110 transition cursor-pointer ${
                      isLiked ? 'text-[#1ed760]' : 'text-neutral-500 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Playlists & Curations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Curated Playlists</h2>
            <p className="text-xs text-neutral-400">Organized moods with instant audio & video toggles</p>
          </div>
          <button
            onClick={onOpenCreatePlaylistModal}
            className="flex items-center gap-1.5 text-xs font-bold text-[#1ed760] hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Playlist</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((pl) => {
            const plTracks = tracks.filter((t) => pl.trackIds.includes(t.id));
            return (
              <div
                key={pl.id}
                onClick={() => setActiveView({ type: 'playlist', playlistId: pl.id })}
                className={`p-5 rounded-2xl bg-gradient-to-br ${pl.gradient} border border-neutral-800/60 hover:border-neutral-700 transition-all cursor-pointer group flex flex-col justify-between h-44 shadow-lg`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      Playlist
                    </span>
                    <span className="text-xs text-neutral-300 font-medium">
                      {pl.trackIds.length} tracks
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-2 group-hover:underline">
                    {pl.name}
                  </h3>
                  <p className="text-xs text-neutral-300/80 line-clamp-2 mt-1">
                    {pl.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-white/90">Open Collection</span>
                  {plTracks.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(plTracks[0], plTracks);
                      }}
                      className="w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-105 cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current translate-x-0.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
