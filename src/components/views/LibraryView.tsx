import React, { useState } from 'react';
import { 
  Library, 
  Music, 
  Heart, 
  Plus, 
  Trash2, 
  Play, 
  Layers,
  RefreshCw,
  Youtube,
  Link2,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { Track, Playlist, ActiveView } from '../../types';
import { formatTime } from '../../utils/youtube';
import { extractYouTubePlaylistId, formatRelativeTime } from '../../utils/youtubePlaylist';
import { TrackThumbnail } from '../common/TrackThumbnail';

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
  onSyncPlaylist?: (playlistId: string) => Promise<{ addedCount: number; totalCount: number }>;
  onSyncAllPlaylists?: () => Promise<{ syncedPlaylistsCount: number; totalNewTracks: number }>;
  onUpdatePlaylist?: (playlistId: string, updates: Partial<Playlist>) => void;
  onShowToast?: (message: string) => void;
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
  onSyncPlaylist,
  onSyncAllPlaylists,
  onUpdatePlaylist,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'playlists' | 'tracks' | 'liked'>('playlists');
  
  // Refresh & Sync states
  const [syncingPlaylistIds, setSyncingPlaylistIds] = useState<Set<string>>(new Set());
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Link YouTube modal state
  const [linkingPlaylist, setLinkingPlaylist] = useState<Playlist | null>(null);
  const [linkInputUrl, setLinkInputUrl] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);

  const likedTracks = tracks.filter((t) => likedTrackIds.includes(t.id));
  const linkedPlaylistsCount = playlists.filter((p) => Boolean(p.youtubePlaylistId)).length;

  // Single playlist refresh handler
  const handleRefreshSinglePlaylist = async (pl: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSyncPlaylist) return;
    if (syncingPlaylistIds.has(pl.id)) return;

    if (!pl.youtubePlaylistId) {
      // Prompt to link with YouTube first
      setLinkingPlaylist(pl);
      setLinkInputUrl('');
      setLinkError(null);
      return;
    }

    setSyncingPlaylistIds((prev) => new Set(prev).add(pl.id));
    try {
      const result = await onSyncPlaylist(pl.id);
      if (result.addedCount > 0) {
        onShowToast?.(`🎉 Added ${result.addedCount} new song${result.addedCount === 1 ? '' : 's'} from YouTube to "${pl.name}"!`);
      } else {
        onShowToast?.(`✅ "${pl.name}" is up to date! YouTube playlist has ${result.totalCount} tracks.`);
      }
    } catch (err: any) {
      onShowToast?.(err?.message || `Failed to refresh "${pl.name}". Check YouTube link.`);
    } finally {
      setSyncingPlaylistIds((prev) => {
        const next = new Set(prev);
        next.delete(pl.id);
        return next;
      });
    }
  };

  // Refresh all linked playlists in the library
  const handleRefreshAllPlaylists = async () => {
    if (isSyncingAll) return;

    if (linkedPlaylistsCount === 0) {
      onShowToast?.('💡 None of your playlists are linked to YouTube yet. Click the Link icon on any playlist to enable 1-click refreshes!');
      return;
    }

    if (!onSyncAllPlaylists) return;

    setIsSyncingAll(true);
    try {
      const result = await onSyncAllPlaylists();
      if (result.totalNewTracks > 0) {
        onShowToast?.(`🎉 Refreshed ${result.syncedPlaylistsCount} playlists! Added ${result.totalNewTracks} newly discovered songs.`);
      } else {
        onShowToast?.(`✅ All ${result.syncedPlaylistsCount} linked playlists are already up to date with YouTube!`);
      }
    } catch (err: any) {
      onShowToast?.(err?.message || 'Failed to refresh playlists from YouTube.');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Link playlist form submit
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingPlaylist) return;

    const trimmed = linkInputUrl.trim();
    if (!trimmed) {
      setLinkError('Please enter a YouTube playlist link or ID');
      return;
    }

    const extractedId = extractYouTubePlaylistId(trimmed);
    if (!extractedId) {
      setLinkError('Could not find a valid YouTube Playlist ID in the URL. Ensure format is https://youtube.com/playlist?list=PL...');
      return;
    }

    setIsSubmittingLink(true);
    setLinkError(null);

    try {
      if (onUpdatePlaylist) {
        onUpdatePlaylist(linkingPlaylist.id, {
          youtubePlaylistId: extractedId,
          autoSync: true,
          updatedAt: Date.now(),
        });
      }

      onShowToast?.(`🔗 Linked "${linkingPlaylist.name}" to YouTube! Searching for latest songs...`);
      const targetPlId = linkingPlaylist.id;
      setLinkingPlaylist(null);
      setLinkInputUrl('');

      // Immediately trigger initial sync
      if (onSyncPlaylist) {
        setSyncingPlaylistIds((prev) => new Set(prev).add(targetPlId));
        setTimeout(async () => {
          try {
            const res = await onSyncPlaylist(targetPlId);
            onShowToast?.(`🎉 Synced! Added ${res.addedCount} songs from YouTube.`);
          } catch (err: any) {
            onShowToast?.(err?.message || 'Linked successfully, but failed to fetch songs right now.');
          } finally {
            setSyncingPlaylistIds((prev) => {
              const next = new Set(prev);
              next.delete(targetPlId);
              return next;
            });
          }
        }, 150);
      }
    } catch (err: any) {
      setLinkError(err?.message || 'Failed to link playlist.');
    } finally {
      setIsSubmittingLink(false);
    }
  };

  return (
    <div id="library-view" className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 text-[#1ed760] flex items-center justify-center shadow">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Your Local Library</h1>
            <p className="text-xs text-neutral-400">
              {tracks.length} tracks &bull; {playlists.length} playlists
              {linkedPlaylistsCount > 0 && ` (${linkedPlaylistsCount} auto-synced with YouTube)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh Playlists Button */}
          {onSyncAllPlaylists && (
            <button
              id="library-refresh-all-btn"
              onClick={handleRefreshAllPlaylists}
              disabled={isSyncingAll}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold transition shadow cursor-pointer ${
                isSyncingAll
                  ? 'border-emerald-500/60 bg-emerald-950/80 text-emerald-300 cursor-wait'
                  : 'border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-100 hover:border-emerald-400'
              }`}
              title="Search YouTube and refresh newly added songs for all your playlists"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
              <span>{isSyncingAll ? 'Refreshing Playlists...' : 'Refresh Playlists'}</span>
            </button>
          )}

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1ed760] text-black font-bold text-xs hover:scale-105 transition cursor-pointer shadow-lg shadow-[#1ed760]/20"
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition cursor-pointer border border-neutral-700"
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
        <div className="space-y-4">
          {/* Sub-bar / Info Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-neutral-400 gap-2 px-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span>{playlists.length} custom playlists in library</span>
              {linkedPlaylistsCount > 0 && (
                <>
                  <span>&bull;</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Youtube className="w-3.5 h-3.5 text-red-500" />
                    {linkedPlaylistsCount} linked to YouTube for 1-click automatic updates
                  </span>
                </>
              )}
            </div>

            {linkedPlaylistsCount > 0 && onSyncAllPlaylists && (
              <button
                onClick={handleRefreshAllPlaylists}
                disabled={isSyncingAll}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline hover:no-underline flex items-center gap-1 cursor-pointer transition"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingAll ? 'animate-spin' : ''}`} />
                <span>{isSyncingAll ? 'Refreshing...' : 'Refresh all linked playlists'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Liked Songs Special Card */}
            <div
              onClick={() => setActiveView({ type: 'liked' })}
              className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 to-purple-900 border border-indigo-800/40 hover:border-indigo-600 transition cursor-pointer flex flex-col justify-between h-48 shadow-lg group relative"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                  Special Collection
                </span>
                <h3 className="text-xl font-bold text-white mt-1 group-hover:underline">Liked Songs</h3>
                <p className="text-xs text-purple-200/70 mt-1">Your saved favorite YouTube tracks</p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-purple-200">
                  {likedTracks.length} tracks
                </span>
                <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                  <Heart className="w-5 h-5 fill-current text-purple-600" />
                </div>
              </div>
            </div>

            {/* User Playlists */}
            {playlists.map((pl) => {
              const isSyncingThis = syncingPlaylistIds.has(pl.id);
              const isLinked = Boolean(pl.youtubePlaylistId);

              return (
                <div
                  key={pl.id}
                  onClick={() => setActiveView({ type: 'playlist', playlistId: pl.id })}
                  className={`p-5 rounded-2xl bg-gradient-to-br ${pl.gradient} border border-neutral-800 hover:border-neutral-700 transition cursor-pointer flex flex-col justify-between h-48 shadow-lg group relative overflow-hidden`}
                >
                  {/* Top Bar with Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Playlist
                      </span>

                      {/* YouTube Linked Status / Last Synced Badge */}
                      {isLinked ? (
                        <div 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/30 text-[10px] font-medium text-red-300"
                          title={`Linked to YouTube. Last refreshed: ${formatRelativeTime(pl.lastSyncedAt)}`}
                        >
                          <Youtube className="w-3 h-3 text-red-400 flex-shrink-0" />
                          <span className="truncate max-w-[90px]">{formatRelativeTime(pl.lastSyncedAt)}</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkingPlaylist(pl);
                            setLinkInputUrl('');
                            setLinkError(null);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-[10px] font-medium text-neutral-300 hover:text-white transition cursor-pointer"
                          title="Connect this playlist to YouTube so future additions are refreshed automatically"
                        >
                          <Link2 className="w-3 h-3 text-[#1ed760]" />
                          <span>Link YT</span>
                        </button>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mt-1 group-hover:underline truncate">
                      {pl.name}
                    </h3>
                    <p className="text-xs text-neutral-300/80 line-clamp-2 mt-1">{pl.description}</p>
                  </div>

                  {/* Bottom Controls Bar: Track count + Refresh Button + Play Button */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-neutral-400">{pl.trackIds.length} tracks</span>

                    <div className="flex items-center gap-2">
                      {/* Refresh Button on individual playlist card */}
                      {isLinked && onSyncPlaylist && (
                        <button
                          id={`playlist-card-refresh-${pl.id}`}
                          onClick={(e) => handleRefreshSinglePlaylist(pl, e)}
                          disabled={isSyncingThis}
                          className={`p-2 rounded-full border text-neutral-300 hover:text-white transition cursor-pointer shadow-md ${
                            isSyncingThis
                              ? 'border-emerald-500/60 bg-emerald-950/90 text-emerald-300 cursor-wait'
                              : 'border-neutral-700 bg-neutral-900/90 hover:bg-neutral-800 hover:border-emerald-500/50'
                          }`}
                          title="Refresh playlist: searches YouTube for newly added songs and adds them immediately"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingThis ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                        </button>
                      )}

                      {/* Play Button */}
                      <div className="w-9 h-9 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition hover:scale-105">
                        <Play className="w-4 h-4 fill-current translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
                      <TrackThumbnail
                        src={track.thumbnail}
                        videoId={track.youtubeId}
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

      {/* Link to YouTube Modal */}
      {linkingPlaylist && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLinkingPlaylist(null)}
        >
          <div 
            className="w-full max-w-md bg-[#181818] border border-neutral-700 rounded-2xl shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-950/80 text-red-400 flex items-center justify-center">
                  <Youtube className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Link to YouTube Playlist</h3>
                  <p className="text-xs text-neutral-400">"{linkingPlaylist.name}"</p>
                </div>
              </div>
              <button
                onClick={() => setLinkingPlaylist(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Connecting this playlist to an upstream YouTube playlist allows the app to automatically 
              search for and fetch newly added songs whenever you click <strong className="text-emerald-400">Refresh</strong>.
            </p>

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  YouTube Playlist Link or ID
                </label>
                <input
                  type="text"
                  value={linkInputUrl}
                  onChange={(e) => {
                    setLinkInputUrl(e.target.value);
                    setLinkError(null);
                  }}
                  placeholder="https://www.youtube.com/playlist?list=PL..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#1ed760] transition"
                  autoFocus
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Supports full playlist URLs, share links, or raw playlist IDs (e.g., PL...).
                </p>
              </div>

              {linkError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-950/50 border border-red-800/50 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                  <span>{linkError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLinkingPlaylist(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLink}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#1ed760] text-black font-bold text-xs hover:scale-105 active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingLink ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Linking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Link & Fetch Songs</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
