import React, { useState, useEffect, useRef } from 'react';
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
  Layers,
  RefreshCw,
  Youtube,
  Link2,
  X,
  AlertCircle
} from 'lucide-react';
import { Track, Playlist, PlaybackMode } from '../../types';
import { formatTime } from '../../utils/youtube';
import { extractYouTubePlaylistId } from '../../utils/youtubePlaylist';
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
  onSyncPlaylist?: (playlistId: string) => Promise<{ addedCount: number; totalCount: number }>;
  onUpdatePlaylist?: (playlistId: string, updates: Partial<Playlist>) => void;
  onShowToast?: (message: string) => void;
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
  onSyncPlaylist,
  onUpdatePlaylist,
  onShowToast,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkInputUrl, setLinkInputUrl] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const syncedOnMountRef = useRef<string | null>(null);

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

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const diff = Math.max(0, Date.now() - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Sync logic
  const handleSync = async (isBackground = false) => {
    if (!playlist.youtubePlaylistId || !onSyncPlaylist || isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await onSyncPlaylist(playlist.id);
      if (result.addedCount > 0) {
        onShowToast?.(`🎉 Added ${result.addedCount} new song${result.addedCount === 1 ? '' : 's'} from YouTube!`);
      } else if (!isBackground) {
        onShowToast?.(`✅ Up to date! YouTube playlist has ${result.totalCount} tracks.`);
      }
    } catch (err: any) {
      if (!isBackground) {
        onShowToast?.(err?.message || 'Could not sync with YouTube. Check connection.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Automatic sync on view mount if enabled
  useEffect(() => {
    if (
      playlist.youtubePlaylistId &&
      playlist.autoSync !== false &&
      onSyncPlaylist &&
      syncedOnMountRef.current !== playlist.id
    ) {
      syncedOnMountRef.current = playlist.id;
      // If last synced more than 2 minutes ago, automatically refresh in the background
      const lastSyncDiff = Date.now() - (playlist.lastSyncedAt || 0);
      if (lastSyncDiff > 2 * 60 * 1000) {
        handleSync(true);
      }
    }
  }, [playlist.id, playlist.youtubePlaylistId, playlist.autoSync]);

  const handleToggleAutoSync = () => {
    if (!onUpdatePlaylist) return;
    const newState = playlist.autoSync === false ? true : false;
    onUpdatePlaylist(playlist.id, { autoSync: newState });
    onShowToast?.(
      newState
        ? '⚡ Auto-sync enabled: New songs will fetch automatically on open.'
        : 'Auto-sync disabled for this playlist.'
    );
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    const extractedId = extractYouTubePlaylistId(linkInputUrl.trim());
    if (!extractedId) {
      setLinkError('Please enter a valid YouTube playlist URL or ID (e.g., https://youtube.com/playlist?list=PL...)');
      return;
    }

    if (onUpdatePlaylist) {
      onUpdatePlaylist(playlist.id, {
        youtubePlaylistId: extractedId,
        autoSync: true,
      });
      setIsLinkModalOpen(false);
      setLinkInputUrl('');
      onShowToast?.('🔗 Linked to YouTube playlist! Fetching latest songs...');
      // Trigger sync immediately with new id
      setTimeout(() => {
        if (onSyncPlaylist) {
          onSyncPlaylist(playlist.id)
            .then((res) => {
              onShowToast?.(`🎉 Successfully synced! ${res.addedCount} new tracks added.`);
            })
            .catch((err) => {
              onShowToast?.(err?.message || 'Failed to sync linked YouTube playlist.');
            });
        }
      }, 100);
    }
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
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                {isLikedSongsView ? 'Playlist' : 'Public Playlist'}
              </span>
              {playlist.youtubePlaylistId && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-950/70 border border-red-500/40 text-[11px] font-semibold text-red-300">
                  <Youtube className="w-3.5 h-3.5 text-red-400" />
                  <span>YouTube Linked</span>
                  <span className="text-red-500">•</span>
                  <span className="text-neutral-300 font-mono text-[10px]">
                    Synced {formatRelativeTime(playlist.lastSyncedAt)}
                  </span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {playlist.name}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed mx-auto sm:mx-0">
              {playlist.description}
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 text-xs font-semibold text-neutral-300 flex-wrap">
              <span className="text-white font-bold">Nomatic Library</span>
              <span>•</span>
              <span>{playlistTracks.length} songs</span>
              {totalDurationSecs > 0 && (
                <>
                  <span>•</span>
                  <span>{formatTotalTime(totalDurationSecs)}</span>
                </>
              )}
              {playlist.youtubePlaylistId && (
                <>
                  <span>•</span>
                  <a
                    href={`https://youtube.com/playlist?list=${playlist.youtubePlaylistId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 hover:underline"
                    title="Open on YouTube"
                  >
                    <span>View on YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="p-4 sm:p-8 py-4 sm:py-6 bg-gradient-to-b from-[#121212]/80 to-[#121212] flex items-center justify-between border-b border-neutral-900/80 max-w-7xl mx-auto gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
          {/* Big Green Play Button */}
          <button
            id="playlist-play-btn"
            onClick={handlePlayFirst}
            disabled={playlistTracks.length === 0}
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-2xl transition hover:scale-105 active:scale-95 cursor-pointer ${
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

          {/* YouTube Sync / Refresh Button */}
          {playlist.youtubePlaylistId && onSyncPlaylist && (
            <button
              onClick={() => handleSync(false)}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full border text-xs font-bold transition shadow-sm cursor-pointer ${
                isSyncing
                  ? 'border-emerald-500/60 bg-emerald-950/80 text-emerald-300 cursor-wait'
                  : 'border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-100 hover:border-emerald-400'
              }`}
              title="Fetch newly added songs from YouTube into this playlist immediately"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync with YouTube'}</span>
            </button>
          )}

          {/* Auto-Sync Toggle Badge */}
          {playlist.youtubePlaylistId && onUpdatePlaylist && (
            <button
              onClick={handleToggleAutoSync}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium transition cursor-pointer ${
                playlist.autoSync !== false
                  ? 'border-neutral-700 bg-neutral-800/80 text-neutral-200 hover:bg-neutral-700'
                  : 'border-neutral-800 bg-neutral-900/60 text-neutral-500 hover:text-neutral-400'
              }`}
              title="Automatically refresh and fetch new songs whenever you open this playlist"
            >
              <span className={`w-2 h-2 rounded-full ${playlist.autoSync !== false ? 'bg-[#1ed760] shadow-[0_0_8px_#1ed760]' : 'bg-neutral-600'}`} />
              <span>Auto-fetch: {playlist.autoSync !== false ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {/* Link to YouTube Button (if not already linked and not liked playlist) */}
          {!playlist.youtubePlaylistId && !isLikedSongsView && onUpdatePlaylist && (
            <button
              onClick={() => setIsLinkModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-bold text-neutral-300 hover:text-white transition cursor-pointer"
              title="Link this playlist to a YouTube playlist to automatically refresh new songs"
            >
              <Youtube className="w-3.5 h-3.5 text-red-500" />
              <span>Link YouTube Playlist</span>
            </button>
          )}

          {/* Add Track to This Playlist */}
          <button
            id="add-to-playlist-btn"
            onClick={() => onOpenAddModalForPlaylist(playlist.id, 'single')}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-bold text-white transition cursor-pointer"
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
              <div className="col-span-3 sm:col-span-3 hidden sm:block">Artist</div>
              <div className="col-span-2 hidden md:block">Added</div>
              <div className="col-span-5 sm:col-span-4 md:col-span-1 text-right flex items-center justify-end pr-2">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {/* Track Rows */}
            <div className="divide-y divide-neutral-900/50">
              {playlistTracks.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                const isLiked = likedTrackIds.includes(track.id);

                return (
                  <div
                    key={track.id}
                    className={`grid grid-cols-12 gap-2 sm:gap-4 px-2 sm:px-4 py-2.5 items-center rounded-lg hover:bg-white/5 transition group ${
                      isCurrent ? 'bg-white/10 text-white' : ''
                    }`}
                  >
                    {/* Index / Play Button */}
                    <div className="col-span-1 text-center font-mono text-xs text-neutral-500 flex items-center justify-center">
                      <span className={`group-hover:hidden ${isCurrent ? 'text-[#1ed760]' : ''}`}>
                        {isCurrent && isPlaying ? (
                          <div className="w-3.5 h-3.5 flex items-end justify-center gap-0.5">
                            <span className="w-1 bg-[#1ed760] animate-[bounce_1s_infinite_100ms] h-full" />
                            <span className="w-1 bg-[#1ed760] animate-[bounce_1s_infinite_300ms] h-2/3" />
                            <span className="w-1 bg-[#1ed760] animate-[bounce_1s_infinite_200ms] h-4/5" />
                          </div>
                        ) : (
                          index + 1
                        )}
                      </span>
                      <button
                        onClick={() => {
                          if (isCurrent) {
                            onTogglePlay();
                          } else {
                            onPlayTrack(track, playlistTracks);
                          }
                        }}
                        className="hidden group-hover:flex items-center justify-center text-white hover:scale-110 transition cursor-pointer"
                      >
                        {isCurrent && isPlaying ? (
                          <Pause className="w-4 h-4 fill-current text-[#1ed760]" />
                        ) : (
                          <Play className="w-4 h-4 fill-current text-[#1ed760]" />
                        )}
                      </button>
                    </div>

                    {/* Title & Artist & Thumbnail */}
                    <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                      <TrackThumbnail
                        src={track.thumbnail}
                        videoId={track.youtubeId}
                        alt={track.title}
                        className="w-10 h-10 rounded object-cover flex-shrink-0 bg-neutral-800"
                      />
                      <div className="truncate">
                        <div
                          className={`font-semibold truncate text-sm ${
                            isCurrent ? 'text-[#1ed760]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </div>
                        <div className="text-xs text-neutral-400 truncate sm:hidden">
                          {track.artist}
                        </div>
                      </div>
                    </div>

                    {/* Artist Column (Desktop) */}
                    <div className="col-span-3 hidden sm:block truncate text-neutral-400 text-sm">
                      {track.artist}
                    </div>

                    {/* Added Date */}
                    <div className="col-span-2 hidden md:block text-neutral-500 text-xs">
                      {new Date(track.addedAt).toLocaleDateString()}
                    </div>

                    {/* Actions & Duration */}
                    <div className="col-span-5 sm:col-span-4 md:col-span-1 flex items-center justify-end gap-2 text-right pr-2">
                      {/* Like button */}
                      <button
                        onClick={() => onToggleLike(track.id)}
                        className={`p-1.5 rounded-full hover:bg-neutral-800 transition cursor-pointer ${
                          isLiked ? 'text-[#1ed760]' : 'text-neutral-500 hover:text-white'
                        }`}
                        title={isLiked ? 'Remove from Liked' : 'Add to Liked'}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      </button>

                      {/* Remove from Playlist (only if not liked songs) */}
                      {!isLikedSongsView && (
                        <button
                          onClick={() => onRemoveTrackFromPlaylist(playlist.id, track.id)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-full transition cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Remove from this playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Duration */}
                      <span className="font-mono text-xs text-neutral-400 w-10 text-right">
                        {formatTime(track.duration)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-20 text-center space-y-4">
            <Music className="w-16 h-16 text-neutral-700 mx-auto" />
            <h3 className="text-lg font-bold text-white">This playlist is empty</h3>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">
              Add songs from YouTube using the buttons above, or sync with YouTube if linked.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              {playlist.youtubePlaylistId && onSyncPlaylist && (
                <button
                  onClick={() => handleSync(false)}
                  disabled={isSyncing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-xs transition cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync from YouTube Now</span>
                </button>
              )}
              <button
                onClick={() => onOpenAddModalForPlaylist(playlist.id, 'single')}
                className="px-5 py-2.5 bg-[#1ed760] hover:bg-[#1ed760]/90 text-black rounded-full font-bold text-xs transition cursor-pointer"
              >
                Add Songs
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Link to YouTube Playlist Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold">
                <Youtube className="w-5 h-5 text-red-500" />
                <span>Link to YouTube Playlist</span>
              </div>
              <button
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkError(null);
                }}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Paste the public or unlisted YouTube playlist link. Whenever new songs are added on YouTube, Nomatic will automatically fetch and sync them into this playlist!
            </p>

            <form onSubmit={handleLinkSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  YouTube Playlist Link or ID
                </label>
                <input
                  type="text"
                  placeholder="https://youtube.com/playlist?list=PL..."
                  value={linkInputUrl}
                  onChange={(e) => setLinkInputUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  autoFocus
                />
              </div>

              {linkError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{linkError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLinkModalOpen(false);
                    setLinkError(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!linkInputUrl.trim()}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Link & Fetch Songs</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
