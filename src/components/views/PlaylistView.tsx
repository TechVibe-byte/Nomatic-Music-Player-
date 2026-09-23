import React from 'react';
import { 
  Play, 
  Pause, 
  Shuffle, 
  Clock, 
  Heart, 
  Trash2, 
  Plus, 
  Music, 
  Headphones, 
  Film,
  ExternalLink,
  Layers
} from 'lucide-react';
import { Track, Playlist, PlaybackMode } from '../../types';
import { formatTime } from '../../utils/youtube';
import { TrackThumbnail } from '../common/TrackThumbnail';

interface PlaylistViewProps {
  playlist: Playlist;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, newQueue?: Track[]) => void;
  onTogglePlay: () => void;
  onOpenAddModalForPlaylist: (playlistId: string, mode?: 'single' | 'bulk') => void;
  onDeletePlaylist?: (playlistId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  likedTrackIds: string[];
  onToggleLike: (trackId: string) => void;
  isLikedSongsView?: boolean;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({
  playlist,
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onOpenAddModalForPlaylist,
  onDeletePlaylist,
  onRemoveTrackFromPlaylist,
  likedTrackIds,
  onToggleLike,
  isLikedSongsView = false,
}) => {
  const playlistTracks = tracks.filter((t) => playlist.trackIds.includes(t.id));
  const isPlaylistActive = playlistTracks.some((t) => t.id === currentTrack?.id);
  const totalDurationSecs = playlistTracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  const formatTotalTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) {
      return `${hours} hr ${mins % 60} min`;
    }
    return `${mins} min`;
  };

  const handlePlayFirst = () => {
    if (playlistTracks.length === 0) return;
    if (isPlaylistActive) {
      onTogglePlay();
    } else {
      onPlayTrack(playlistTracks[0], playlistTracks);
    }
  };

  const handleShufflePlay = () => {
    if (playlistTracks.length === 0) return;
    const shuffled = [...playlistTracks].sort(() => Math.random() - 0.5);
    onPlayTrack(shuffled[0], shuffled);
  };

  return (
    <div id="playlist-view" className="pb-16">
      {/* Hero Header with Dynamic Gradient */}
      <div className={`p-4 sm:p-8 pt-6 sm:pt-10 pb-6 sm:pb-8 bg-gradient-to-b ${playlist.gradient} text-white`}>
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6 max-w-7xl mx-auto text-center sm:text-left">
          {/* Playlist Artwork */}
          <div className="w-40 h-40 sm:w-56 sm:h-56 rounded-xl overflow-hidden shadow-2xl bg-neutral-900 flex-shrink-0 flex items-center justify-center border border-white/10 mx-auto sm:mx-0">
            {playlistTracks[0] ? (
              <TrackThumbnail
                src={playlist.coverUrl || playlistTracks[0].thumbnail}
                videoId={playlistTracks[0].youtubeId}
                alt={playlist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center text-neutral-500">
                <Music className="w-16 h-16" />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 min-w-0 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {isLikedSongsView ? 'Playlist' : 'Public Playlist'}
            </span>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {playlist.name}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed mx-auto sm:mx-0">
              {playlist.description}
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 text-xs font-semibold text-neutral-300">
              <span className="text-white font-bold">Nomatic Library</span>
              <span>•</span>
              <span>{playlistTracks.length} songs</span>
              {totalDurationSecs > 0 && (
                <>
                  <span>•</span>
                  <span>{formatTotalTime(totalDurationSecs)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="p-4 sm:p-8 py-4 sm:py-6 bg-gradient-to-b from-[#121212]/80 to-[#121212] flex items-center justify-between border-b border-neutral-900/80 max-w-7xl mx-auto gap-3 flex-wrap">
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Big Green Play Button */}
          <button
            id="playlist-play-btn"
            onClick={handlePlayFirst}
            disabled={playlistTracks.length === 0}
            className={`w-14 h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-2xl transition hover:scale-105 active:scale-95 cursor-pointer ${
              playlistTracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title={isPlaylistActive && isPlaying ? 'Pause' : 'Play Playlist'}
          >
            {isPlaylistActive && isPlaying ? (
              <Pause className="w-6 h-6 fill-current text-black" />
            ) : (
              <Play className="w-6 h-6 fill-current text-black translate-x-0.5" />
            )}
          </button>

          {/* Shuffle Button */}
          <button
            onClick={handleShufflePlay}
            disabled={playlistTracks.length === 0}
            className="w-10 h-10 rounded-full bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 flex items-center justify-center transition cursor-pointer"
            title="Shuffle play"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          {/* Add Track to This Playlist */}
          <button
            id="add-to-playlist-btn"
            onClick={() => onOpenAddModalForPlaylist(playlist.id, 'single')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-bold text-white transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Track</span>
          </button>

          {/* Bulk Add to This Playlist */}
          <button
            id="bulk-add-to-playlist-btn"
            onClick={() => onOpenAddModalForPlaylist(playlist.id, 'bulk')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-bold text-neutral-300 hover:text-white transition cursor-pointer"
            title="Paste multiple YouTube links to this playlist with duplicate filtering"
          >
            <Layers className="w-3.5 h-3.5 text-[#1ed760]" />
            <span>Bulk URLs</span>
          </button>
        </div>

        {/* Delete Playlist (only for custom ones, not built-in liked) */}
        {!isLikedSongsView && playlist.isCustom && onDeletePlaylist && (
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete the playlist "${playlist.name}"?`)) {
                onDeletePlaylist(playlist.id);
              }
            }}
            className="text-neutral-500 hover:text-red-400 p-2 rounded-full hover:bg-neutral-800 transition cursor-pointer"
            title="Delete Playlist"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tracks Table */}
      <div className="p-2 sm:p-8 pt-2 sm:pt-4 max-w-7xl mx-auto">
        {playlistTracks.length > 0 ? (
          <div className="w-full text-left text-sm text-neutral-400">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 sm:gap-4 px-2 sm:px-4 py-2 border-b border-neutral-800 text-xs uppercase font-bold text-neutral-500 tracking-wider">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-6 sm:col-span-5">Title</div>
              <div className="hidden sm:block sm:col-span-3">Playback Mode</div>
              <div className="col-span-5 sm:col-span-3 text-right flex items-center justify-end gap-1">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-neutral-900/40 mt-1">
              {playlistTracks.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                const isTrackPlaying = isCurrent && isPlaying;
                const isLiked = likedTrackIds.includes(track.id);

                return (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track, playlistTracks)}
                    className={`grid grid-cols-12 gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg items-center transition cursor-pointer group ${
                      isCurrent
                        ? 'bg-neutral-800/80 text-white'
                        : 'hover:bg-neutral-900/80 hover:text-white'
                    }`}
                  >
                    {/* Index or Animated Equalizer */}
                    <div className="col-span-1 text-center font-mono text-xs text-neutral-500 group-hover:text-white">
                      {isTrackPlaying ? (
                        <div className="flex items-end justify-center gap-0.5 h-3 w-4 mx-auto">
                          <span className="w-0.5 h-full bg-[#1ed760] animate-pulse" />
                          <span className="w-0.5 h-2/3 bg-[#1ed760] animate-pulse delay-75" />
                          <span className="w-0.5 h-4/5 bg-[#1ed760] animate-pulse delay-150" />
                        </div>
                      ) : (
                        <span className="group-hover:hidden">{index + 1}</span>
                      )}
                      <Play className="w-3.5 h-3.5 text-white hidden group-hover:block mx-auto fill-current" />
                    </div>

                    {/* Title & Artist & Thumbnail */}
                    <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                      <TrackThumbnail
                        src={track.thumbnail}
                        videoId={track.youtubeId}
                        alt={track.title}
                        className="w-10 h-10 rounded object-cover flex-shrink-0 bg-neutral-800"
                      />
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

                    {/* Mode Tag */}
                    <div className="hidden sm:flex sm:col-span-3 items-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                        track.modePreference === 'video'
                          ? 'bg-red-950 text-red-400 border border-red-800/60'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      }`}>
                        {track.modePreference === 'video' ? (
                          <>
                            <Film className="w-3 h-3" /> Video
                          </>
                        ) : (
                          <>
                            <Headphones className="w-3 h-3" /> Audio
                          </>
                        )}
                      </span>
                    </div>

                    {/* Duration & Actions */}
                    <div className="col-span-5 sm:col-span-3 flex items-center justify-end gap-3 text-xs text-neutral-400 font-mono">
                      {/* Like Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike(track.id);
                        }}
                        className={`p-1 transition cursor-pointer ${
                          isLiked ? 'text-[#1ed760]' : 'text-neutral-500 hover:text-white'
                        }`}
                        title={isLiked ? 'Liked' : 'Like'}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      </button>

                      <span>{formatTime(track.duration)}</span>

                      {/* Remove from playlist button */}
                      {!isLikedSongsView && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTrackFromPlaylist(playlist.id, track.id);
                          }}
                          className="p-1 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Remove from this playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Empty Playlist Placeholder */
          <div className="py-16 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
              <Music className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">This playlist is empty</h3>
            <p className="text-xs text-neutral-400">
              Add your favorite YouTube music tracks to play in audio-only or video mode!
            </p>
            <button
              onClick={() => onOpenAddModalForPlaylist(playlist.id)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:scale-105 active:scale-95 transition cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add YouTube Track</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
