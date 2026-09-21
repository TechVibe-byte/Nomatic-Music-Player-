import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Track, 
  Playlist, 
  AppConfig, 
  ActiveView, 
  PlaybackMode, 
  RepeatMode,
  SleepTimerState
} from './types';
import { Moon, X } from 'lucide-react';
import { 
  loadConfig, 
  saveConfig, 
  loadTracks, 
  saveTracks, 
  loadPlaylists, 
  savePlaylists, 
  loadLikedTrackIds, 
  saveLikedTrackIds,
  saveRecentTrackIds,
  INITIAL_TRACKS,
  INITIAL_PLAYLISTS,
  DEFAULT_CONFIG
} from './utils/storage';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { BottomPlayer } from './components/player/BottomPlayer';
import { MobileMiniPlayer } from './components/player/MobileMiniPlayer';
import { NowPlayingPanel } from './components/player/NowPlayingPanel';
import { YouTubePlayerEngine } from './components/player/YouTubePlayerEngine';
import { VisualizerModal } from './components/player/VisualizerModal';
import { AddTrackModal } from './components/modals/AddTrackModal';
import { CreatePlaylistModal } from './components/modals/CreatePlaylistModal';
import { ConfigModal } from './components/modals/ConfigModal';
import { QueueDrawer } from './components/modals/QueueDrawer';
import { SleepTimerModal } from './components/modals/SleepTimerModal';
import { HomeView } from './components/views/HomeView';
import { PlaylistView } from './components/views/PlaylistView';
import { SearchView } from './components/views/SearchView';
import { LibraryView } from './components/views/LibraryView';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { 
  initBackgroundAudioKeepAlive, 
  requestScreenWakeLock, 
  releaseScreenWakeLock, 
  togglePictureInPicture,
  isPiPActive
} from './utils/backgroundAudio';

export default function App() {
  // 1. Storage & Configuration State
  const [config, setConfig] = useState<AppConfig>(() => loadConfig());
  const [tracks, setTracks] = useState<Track[]>(() => loadTracks());
  const [playlists, setPlaylists] = useState<Playlist[]>(() => loadPlaylists());
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>(() => loadLikedTrackIds());

  // 2. Navigation & History State
  const [activeView, setActiveViewState] = useState<ActiveView>({ type: 'home' });
  const [viewHistory, setViewHistory] = useState<ActiveView[]>([{ type: 'home' }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // 3. Playback State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => tracks[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(config.volume ?? 85);
  const [isMuted, setIsMuted] = useState(config.isMuted ?? false);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>(config.playbackMode ?? 'audio');
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(config.repeatMode ?? 'off');
  const [isShuffled, setIsShuffled] = useState(config.isShuffled ?? false);
  const [queue, setQueue] = useState<Track[]>(() => tracks);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [seekTargetTime, setSeekTargetTime] = useState<number | null>(null);

  // 4. Modal & Panel Controls
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [isSleepTimerModalOpen, setIsSleepTimerModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalDefaultPlaylistId, setAddModalDefaultPlaylistId] = useState<string | undefined>(undefined);
  const [addModalInitialMode, setAddModalInitialMode] = useState<'single' | 'playlist' | 'bulk'>('single');
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // 4b. Sleep Timer & Toast Notifications
  const [sleepTimerState, setSleepTimerState] = useState<SleepTimerState>({
    isActive: false,
    type: null,
    durationMinutes: null,
    targetTimestamp: null,
    remainingSeconds: 0,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss toast notification
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // 5. Background Playback & Keep-Alive State
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [isPiPActiveState, setIsPiPActiveState] = useState(false);

  // Screen Wake Lock API synchronization
  useEffect(() => {
    if (config.wakeLockEnabled && isPlaying) {
      requestScreenWakeLock().then((active) => setWakeLockActive(active));
    } else {
      releaseScreenWakeLock();
      setWakeLockActive(false);
    }
  }, [config.wakeLockEnabled, isPlaying]);

  // Picture-in-Picture event listeners
  useEffect(() => {
    const handleEnterPiP = () => setIsPiPActiveState(true);
    const handleLeavePiP = () => setIsPiPActiveState(false);

    document.addEventListener('enterpictureinpicture', handleEnterPiP);
    document.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      document.removeEventListener('enterpictureinpicture', handleEnterPiP);
      document.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  const handleTogglePiP = useCallback(async () => {
    const active = await togglePictureInPicture(currentTrack, isPlaying, (play) => {
      setIsPlaying(play);
    });
    setIsPiPActiveState(active);
  }, [currentTrack, isPlaying]);

  const handleToggleWakeLock = useCallback(async () => {
    const next = !config.wakeLockEnabled;
    const updated = { ...config, wakeLockEnabled: next };
    setConfig(updated);
    saveConfig(updated);
    if (next && isPlaying) {
      const active = await requestScreenWakeLock();
      setWakeLockActive(active);
    } else {
      releaseScreenWakeLock();
      setWakeLockActive(false);
    }
  }, [config, isPlaying]);

  // Sleep Timer Countdown Interval
  useEffect(() => {
    if (!sleepTimerState.isActive || sleepTimerState.type !== 'duration' || !sleepTimerState.targetTimestamp) {
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((sleepTimerState.targetTimestamp! - Date.now()) / 1000));
      if (remaining <= 0) {
        setIsPlaying(false);
        setSleepTimerState({
          isActive: false,
          type: null,
          durationMinutes: null,
          targetTimestamp: null,
          remainingSeconds: 0,
        });
        setToastMessage('Sleep timer finished: playback stopped');
      } else {
        setSleepTimerState((prev) => {
          if (!prev.isActive || prev.type !== 'duration') return prev;
          return { ...prev, remainingSeconds: remaining };
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerState.isActive, sleepTimerState.type, sleepTimerState.targetTimestamp]);

  const handleSetSleepTimerDuration = useCallback((minutes: number) => {
    const target = Date.now() + minutes * 60 * 1000;
    setSleepTimerState({
      isActive: true,
      type: 'duration',
      durationMinutes: minutes,
      targetTimestamp: target,
      remainingSeconds: minutes * 60,
    });
    setToastMessage(`Sleep timer set for ${minutes} min${minutes > 1 ? 's' : ''}`);
  }, []);

  const handleSetSleepTimerEndOfTrack = useCallback(() => {
    setSleepTimerState({
      isActive: true,
      type: 'end_of_track',
      durationMinutes: null,
      targetTimestamp: null,
      remainingSeconds: 0,
    });
    setToastMessage('Sleep timer set: stopping at end of current track');
  }, []);

  const handleCancelSleepTimer = useCallback(() => {
    setSleepTimerState({
      isActive: false,
      type: null,
      durationMinutes: null,
      targetTimestamp: null,
      remainingSeconds: 0,
    });
    setToastMessage('Sleep timer turned off');
  }, []);

  const sleepTimerLabel = useMemo(() => {
    if (!sleepTimerState.isActive) return null;
    if (sleepTimerState.type === 'end_of_track') return 'End of song';
    const mins = Math.floor(sleepTimerState.remainingSeconds / 60);
    const secs = sleepTimerState.remainingSeconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [sleepTimerState]);

  // Navigation History handlers
  const setActiveView = useCallback((view: ActiveView) => {
    setActiveViewState(view);
    setViewHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, view];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setActiveViewState(viewHistory[newIndex]);
    }
  };

  const handleForward = () => {
    if (historyIndex < viewHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setActiveViewState(viewHistory[newIndex]);
    }
  };

  // Playback Control Handlers
  const handlePlayTrack = useCallback((track: Track, newQueue?: Track[]) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);

    // If track has specific mode preference, adopt it
    if (track.modePreference) {
      setPlaybackMode(track.modePreference);
    }

    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
      const foundIdx = newQueue.findIndex((t) => t.id === track.id);
      setQueueIndex(foundIdx !== -1 ? foundIdx : 0);
    } else {
      const foundIdx = queue.findIndex((t) => t.id === track.id);
      if (foundIdx !== -1) {
        setQueueIndex(foundIdx);
      } else {
        setQueue((prev) => [track, ...prev]);
        setQueueIndex(0);
      }
    }

    // Save to history
    saveRecentTrackIds([track.id]);
  }, [queue]);

  const handleTogglePlay = useCallback(() => {
    if (!currentTrack && tracks.length > 0) {
      handlePlayTrack(tracks[0], tracks);
      return;
    }
    setIsPlaying((prev) => !prev);
  }, [currentTrack, tracks, handlePlayTrack]);

  const handlePlayNext = useCallback(() => {
    if (sleepTimerState.isActive && sleepTimerState.type === 'end_of_track') {
      setIsPlaying(false);
      setSleepTimerState({
        isActive: false,
        type: null,
        durationMinutes: null,
        targetTimestamp: null,
        remainingSeconds: 0,
      });
      setToastMessage('Sleep timer: paused playback at end of track');
      return;
    }

    if (queue.length === 0) return;

    if (repeatMode === 'one') {
      setSeekTargetTime(0);
      setIsPlaying(true);
      return;
    }

    let nextIndex = queueIndex + 1;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      setQueueIndex(nextIndex);
      setCurrentTrack(nextTrack);
      setIsPlaying(true);
      setCurrentTime(0);
      saveRecentTrackIds([nextTrack.id]);
    }
  }, [queue, queueIndex, repeatMode, isShuffled, sleepTimerState]);

  const handlePlayPrevious = useCallback(() => {
    if (currentTime > 3) {
      setSeekTargetTime(0);
      return;
    }

    if (queue.length === 0) return;
    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }

    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      setQueueIndex(prevIndex);
      setCurrentTrack(prevTrack);
      setIsPlaying(true);
      setCurrentTime(0);
      saveRecentTrackIds([prevTrack.id]);
    }
  }, [queue, queueIndex, currentTime]);

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    setSeekTargetTime(seconds);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
    const updated = { ...config, volume: newVolume, isMuted: false };
    setConfig(updated);
    saveConfig(updated);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    const updated = { ...config, isMuted: nextMuted };
    setConfig(updated);
    saveConfig(updated);
  };

  const handleTogglePlaybackMode = () => {
    const nextMode: PlaybackMode = playbackMode === 'audio' ? 'video' : 'audio';
    setPlaybackMode(nextMode);
    const updated = { ...config, playbackMode: nextMode };
    setConfig(updated);
    saveConfig(updated);

    // If switching to video, automatically open the Now Playing panel so user can see it!
    if (nextMode === 'video' && !isNowPlayingOpen) {
      setIsNowPlayingOpen(true);
    }
  };

  const handleToggleRepeat = () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(repeatMode) + 1) % modes.length;
    const nextRepeat = modes[nextIdx];
    setRepeatMode(nextRepeat);
    const updated = { ...config, repeatMode: nextRepeat };
    setConfig(updated);
    saveConfig(updated);
  };

  const handleToggleShuffle = () => {
    const nextShuffle = !isShuffled;
    setIsShuffled(nextShuffle);
    const updated = { ...config, isShuffled: nextShuffle };
    setConfig(updated);
    saveConfig(updated);
  };

  const handleToggleLike = (trackId: string) => {
    let updated: string[];
    if (likedTrackIds.includes(trackId)) {
      updated = likedTrackIds.filter((id) => id !== trackId);
    } else {
      updated = [...likedTrackIds, trackId];
    }
    setLikedTrackIds(updated);
    saveLikedTrackIds(updated);
  };

  // Library & Playlist Data Mutators
  const handleOpenAddModal = (mode: 'single' | 'playlist' | 'bulk' = 'single', playlistId?: string) => {
    setAddModalInitialMode(mode);
    setAddModalDefaultPlaylistId(playlistId);
    setIsAddModalOpen(true);
  };

  const handleAddTrack = (newTrack: Track, targetPlaylistId?: string) => {
    // 1. Add to main tracks list
    const updatedTracks = [newTrack, ...tracks];
    setTracks(updatedTracks);
    saveTracks(updatedTracks);

    // 2. Add to playlist if specified
    if (targetPlaylistId) {
      const updatedPlaylists = playlists.map((pl) => {
        if (pl.id === targetPlaylistId && !pl.trackIds.includes(newTrack.id)) {
          return { ...pl, trackIds: [...pl.trackIds, newTrack.id], updatedAt: Date.now() };
        }
        return pl;
      });
      setPlaylists(updatedPlaylists);
      savePlaylists(updatedPlaylists);
    }

    // 3. Immediately play new track!
    handlePlayTrack(newTrack, updatedTracks);
  };

  const handleAddTracksBulk = (newTracksList: Track[], targetPlaylistId?: string) => {
    if (newTracksList.length === 0) return;

    // Filter out any that might already exist by youtubeId just in case
    const existingIds = new Set(tracks.map((t) => t.youtubeId));
    const uniqueToSave = newTracksList.filter((t) => !existingIds.has(t.youtubeId));

    if (uniqueToSave.length === 0) return;

    // 1. Prepend new unique tracks
    const updatedTracks = [...uniqueToSave, ...tracks];
    setTracks(updatedTracks);
    saveTracks(updatedTracks);

    // 2. Add to target playlist if specified
    if (targetPlaylistId) {
      const newTrackIds = uniqueToSave.map((t) => t.id);
      const updatedPlaylists = playlists.map((pl) => {
        if (pl.id === targetPlaylistId) {
          const currentIds = new Set(pl.trackIds);
          const toAdd = newTrackIds.filter((id) => !currentIds.has(id));
          return { ...pl, trackIds: [...pl.trackIds, ...toAdd], updatedAt: Date.now() };
        }
        return pl;
      });
      setPlaylists(updatedPlaylists);
      savePlaylists(updatedPlaylists);
    }

    // 3. If nothing is currently playing, start playing the first imported track
    if (!currentTrack && uniqueToSave.length > 0) {
      handlePlayTrack(uniqueToSave[0], updatedTracks);
    }
  };

  const handleCreatePlaylist = (newPlaylist: Playlist) => {
    const updated = [...playlists, newPlaylist];
    setPlaylists(updated);
    savePlaylists(updated);
    setActiveView({ type: 'playlist', playlistId: newPlaylist.id });
  };

  const handleImportPlaylist = (newPlaylist: Playlist, newTracksList: Track[]) => {
    if (newTracksList.length === 0) {
      handleCreatePlaylist(newPlaylist);
      return;
    }

    // Filter out unique tracks to store in library
    const existingIds = new Set(tracks.map((t) => t.youtubeId));
    const uniqueToSave = newTracksList.filter((t) => !existingIds.has(t.youtubeId));

    // Map track IDs so if any track was already in library, use the existing track ID
    const youtubeIdToExistingId = new Map(tracks.map((t) => [t.youtubeId, t.id]));
    const finalPlaylistTrackIds = newTracksList.map(
      (t) => youtubeIdToExistingId.get(t.youtubeId) || t.id
    );

    const playlistWithTrackIds: Playlist = {
      ...newPlaylist,
      trackIds: finalPlaylistTrackIds,
    };

    const updatedTracks = [...uniqueToSave, ...tracks];
    setTracks(updatedTracks);
    saveTracks(updatedTracks);

    const updatedPlaylists = [...playlists, playlistWithTrackIds];
    setPlaylists(updatedPlaylists);
    savePlaylists(updatedPlaylists);

    // Switch view to the newly imported playlist!
    setActiveView({ type: 'playlist', playlistId: playlistWithTrackIds.id });

    // If nothing currently playing, play first track of new playlist
    if (!currentTrack && newTracksList.length > 0) {
      handlePlayTrack(newTracksList[0], updatedTracks);
    }
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const updated = playlists.filter((pl) => pl.id !== playlistId);
    setPlaylists(updated);
    savePlaylists(updated);
    setActiveView({ type: 'home' });
  };

  const handleRemoveTrackFromPlaylist = (playlistId: string, trackId: string) => {
    const updated = playlists.map((pl) => {
      if (pl.id === playlistId) {
        return { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId), updatedAt: Date.now() };
      }
      return pl;
    });
    setPlaylists(updated);
    savePlaylists(updated);
  };

  const handleDeleteTrackFromLibrary = (trackId: string) => {
    const updatedTracks = tracks.filter((t) => t.id !== trackId);
    setTracks(updatedTracks);
    saveTracks(updatedTracks);

    // Also remove from playlists & liked
    const updatedPlaylists = playlists.map((pl) => ({
      ...pl,
      trackIds: pl.trackIds.filter((id) => id !== trackId),
    }));
    setPlaylists(updatedPlaylists);
    savePlaylists(updatedPlaylists);

    const updatedLiked = likedTrackIds.filter((id) => id !== trackId);
    setLikedTrackIds(updatedLiked);
    saveLikedTrackIds(updatedLiked);

    if (currentTrack?.id === trackId) {
      handlePlayNext();
    }
  };

  const handleResetLibrary = () => {
    setTracks(INITIAL_TRACKS);
    saveTracks(INITIAL_TRACKS);
    setPlaylists(INITIAL_PLAYLISTS);
    savePlaylists(INITIAL_PLAYLISTS);
    const initialLiked = [INITIAL_TRACKS[0]?.id, INITIAL_TRACKS[1]?.id].filter(Boolean) as string[];
    setLikedTrackIds(initialLiked);
    saveLikedTrackIds(initialLiked);
    setConfig(DEFAULT_CONFIG);
    saveConfig(DEFAULT_CONFIG);
    setCurrentTrack(INITIAL_TRACKS[0] || null);
    setQueue(INITIAL_TRACKS);
  };

  const handleReloadAllData = () => {
    setTracks(loadTracks());
    setPlaylists(loadPlaylists());
    setLikedTrackIds(loadLikedTrackIds());
    setConfig(loadConfig());
  };

  // Open modal with preselected playlist
  const handleOpenAddModalForPlaylist = (playlistId: string, mode: 'single' | 'bulk' = 'single') => {
    setAddModalInitialMode(mode);
    setAddModalDefaultPlaylistId(playlistId);
    setIsAddModalOpen(true);
  };

  // Current playlist data if in playlist view
  const currentPlaylist = useMemo(() => {
    if (activeView.type === 'playlist') {
      return playlists.find((p) => p.id === activeView.playlistId) || null;
    }
    return null;
  }, [activeView, playlists]);

  // Liked songs pseudo-playlist for playlist view
  const likedSongsPlaylist: Playlist = useMemo(() => ({
    id: 'liked-songs',
    name: 'Liked Songs',
    description: 'Your favorite tracks from YouTube saved directly in local config.',
    trackIds: likedTrackIds,
    gradient: 'from-indigo-950 via-purple-950 to-[#121212]',
    createdAt: 0,
    updatedAt: Date.now(),
    isCustom: false,
  }), [likedTrackIds]);

  return (
    <div className="flex h-full h-[100dvh] w-full overflow-hidden bg-[#121212] text-white select-none font-sans overscroll-none">
      {/* 1. Persistent Left Spotify Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        playlists={playlists}
        likedCount={likedTrackIds.length}
        onOpenAddModal={() => handleOpenAddModal('single')}
        onOpenAddModalWithMode={handleOpenAddModal}
        onOpenCreatePlaylistModal={() => setIsCreatePlaylistModalOpen(true)}
        onOpenConfigModal={() => setIsConfigModalOpen(true)}
      />

      {/* 2. Main Content Canvas & Top Navigation */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#121212] relative">
        <TopNav
          activeView={activeView}
          setActiveView={setActiveView}
          playbackMode={playbackMode}
          onTogglePlaybackMode={handleTogglePlaybackMode}
          onOpenAddModal={() => handleOpenAddModal('single')}
          onOpenAddModalWithMode={handleOpenAddModal}
          onOpenConfigModal={() => setIsConfigModalOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onBack={handleBack}
          onForward={handleForward}
          canGoBack={historyIndex > 0}
          canGoForward={historyIndex < viewHistory.length - 1}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative pb-36 md:pb-24 overscroll-contain">
          {activeView.type === 'home' && (
            <HomeView
              tracks={tracks}
              playlists={playlists}
              likedTrackIds={likedTrackIds}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onTogglePlay={handleTogglePlay}
              setActiveView={setActiveView}
              onOpenAddModal={() => {
                setAddModalDefaultPlaylistId(undefined);
                setIsAddModalOpen(true);
              }}
              onOpenAddModalWithMode={handleOpenAddModal}
              onOpenCreatePlaylistModal={() => setIsCreatePlaylistModalOpen(true)}
              onToggleLike={handleToggleLike}
            />
          )}

          {activeView.type === 'playlist' && currentPlaylist && (
            <PlaylistView
              playlist={currentPlaylist}
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onTogglePlay={handleTogglePlay}
              onOpenAddModalForPlaylist={handleOpenAddModalForPlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
              likedTrackIds={likedTrackIds}
              onToggleLike={handleToggleLike}
            />
          )}

          {activeView.type === 'liked' && (
            <PlaylistView
              playlist={likedSongsPlaylist}
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onTogglePlay={handleTogglePlay}
              onOpenAddModalForPlaylist={handleOpenAddModalForPlaylist}
              onRemoveTrackFromPlaylist={(_, trackId) => handleToggleLike(trackId)}
              likedTrackIds={likedTrackIds}
              onToggleLike={handleToggleLike}
              isLikedSongsView={true}
            />
          )}

          {activeView.type === 'search' && (
            <SearchView
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              tracks={tracks}
              playlists={playlists}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onToggleLike={handleToggleLike}
              likedTrackIds={likedTrackIds}
              onOpenAddModal={() => {
                setAddModalDefaultPlaylistId(undefined);
                setIsAddModalOpen(true);
              }}
              setActiveView={setActiveView}
            />
          )}

          {activeView.type === 'library' && (
            <LibraryView
              tracks={tracks}
              playlists={playlists}
              likedTrackIds={likedTrackIds}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onToggleLike={handleToggleLike}
              onDeleteTrackFromLibrary={handleDeleteTrackFromLibrary}
              onOpenAddModal={() => handleOpenAddModal('single')}
              onOpenAddModalWithMode={handleOpenAddModal}
              onOpenCreatePlaylistModal={() => setIsCreatePlaylistModalOpen(true)}
              onOpenConfigModal={() => setIsConfigModalOpen(true)}
              setActiveView={setActiveView}
            />
          )}
        </main>
      </div>

      {/* 3. Optional Right Now Playing View Drawer / Mobile Full Player */}
      {isNowPlayingOpen && currentTrack && (
        <NowPlayingPanel
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          playbackMode={playbackMode}
          onTogglePlaybackMode={handleTogglePlaybackMode}
          isLiked={likedTrackIds.includes(currentTrack.id)}
          onToggleLike={handleToggleLike}
          onClose={() => setIsNowPlayingOpen(false)}
          onOpenAddToPlaylist={(track) => {
            setAddModalDefaultPlaylistId(undefined);
            setIsAddModalOpen(true);
          }}
          onTogglePiP={handleTogglePiP}
          isPiPActive={isPiPActiveState}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          onTogglePlay={handleTogglePlay}
          onPlayNext={handlePlayNext}
          onPlayPrevious={handlePlayPrevious}
          isShuffled={isShuffled}
          onToggleShuffle={handleToggleShuffle}
          repeatMode={repeatMode}
          onToggleRepeat={handleToggleRepeat}
          onOpenQueue={() => setIsQueueOpen(true)}
          onOpenVisualizer={() => setIsVisualizerOpen(true)}
          onOpenSleepTimer={() => setIsSleepTimerModalOpen(true)}
          isSleepTimerActive={sleepTimerState.isActive}
          sleepTimerRemaining={sleepTimerLabel}
        />
      )}

      {/* 4. Optional Queue Drawer */}
      {isQueueOpen && (
        <QueueDrawer
          isOpen={isQueueOpen}
          onClose={() => setIsQueueOpen(false)}
          queue={queue}
          queueIndex={queueIndex}
          currentTrack={currentTrack}
          onSelectTrackFromQueue={(idx) => {
            const track = queue[idx];
            if (track) {
              setQueueIndex(idx);
              setCurrentTrack(track);
              setIsPlaying(true);
              setCurrentTime(0);
            }
          }}
          onClearQueue={() => {
            if (currentTrack) {
              setQueue([currentTrack]);
              setQueueIndex(0);
            }
          }}
        />
      )}

      {/* 5. Persistent Background YouTube Engine (Always mounted to guarantee uninterrupted audio in background) */}
      <YouTubePlayerEngine
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        playbackMode={playbackMode}
        onTimeUpdate={(cur, dur) => {
          setCurrentTime(cur);
          if (dur > 0) setDuration(dur);
        }}
        onTrackEnd={handlePlayNext}
        onPlayStateChange={setIsPlaying}
        onBufferingChange={setIsBuffering}
        onPlayerReady={() => setIsPlayerReady(true)}
        playNext={handlePlayNext}
        playPrevious={handlePlayPrevious}
        seekTargetTime={seekTargetTime}
        onSeekHandled={() => setSeekTargetTime(null)}
      />

      {/* 6. Desktop Bottom Sticky Spotify Player Bar (Visible on md and above) */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-30 pointer-events-auto">
        <BottomPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onPlayNext={handlePlayNext}
          onPlayPrevious={handlePlayPrevious}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          playbackMode={playbackMode}
          onTogglePlaybackMode={handleTogglePlaybackMode}
          repeatMode={repeatMode}
          onToggleRepeat={handleToggleRepeat}
          isShuffled={isShuffled}
          onToggleShuffle={handleToggleShuffle}
          isLiked={currentTrack ? likedTrackIds.includes(currentTrack.id) : false}
          onToggleLike={handleToggleLike}
          isNowPlayingOpen={isNowPlayingOpen}
          onToggleNowPlaying={() => setIsNowPlayingOpen((prev) => !prev)}
          isQueueOpen={isQueueOpen}
          onToggleQueue={() => setIsQueueOpen((prev) => !prev)}
          isVisualizerOpen={isVisualizerOpen}
          onToggleVisualizer={() => setIsVisualizerOpen((prev) => !prev)}
          isPiPActive={isPiPActiveState}
          onTogglePiP={handleTogglePiP}
          wakeLockActive={wakeLockActive}
          onToggleWakeLock={handleToggleWakeLock}
          isSleepTimerActive={sleepTimerState.isActive}
          sleepTimerRemaining={sleepTimerLabel}
          onOpenSleepTimer={() => setIsSleepTimerModalOpen(true)}
        />
      </div>

      {/* 7. Mobile Pinned Bottom Dock: Mini Player + Mobile Bottom Navigation (Pinned firmly at the bottom of the viewport) */}
      <div 
        id="mobile-pinned-bottom-dock"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex flex-col pointer-events-auto select-none bg-[#121212] border-t border-neutral-800 shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {currentTrack && (
          <MobileMiniPlayer
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onPlayNext={handlePlayNext}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            playbackMode={playbackMode}
            isLiked={likedTrackIds.includes(currentTrack.id)}
            onToggleLike={handleToggleLike}
            onToggleNowPlaying={() => setIsNowPlayingOpen(true)}
            isSleepTimerActive={sleepTimerState.isActive}
            sleepTimerRemaining={sleepTimerLabel}
          />
        )}

        <MobileBottomNav
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenAddModal={() => handleOpenAddModal('single')}
          onOpenAddModalWithMode={handleOpenAddModal}
          onOpenConfigModal={() => setIsConfigModalOpen(true)}
          likedCount={likedTrackIds.length}
          playlistsCount={playlists.length}
        />
      </div>

      {/* 7. Modals */}
      <AddTrackModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        playlists={playlists}
        tracks={tracks}
        onAddTrack={handleAddTrack}
        onAddTracksBulk={handleAddTracksBulk}
        onImportPlaylist={handleImportPlaylist}
        defaultPlaylistId={addModalDefaultPlaylistId}
        initialMode={addModalInitialMode}
      />

      <CreatePlaylistModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={() => setIsCreatePlaylistModalOpen(false)}
        onCreatePlaylist={handleCreatePlaylist}
        onCreatePlaylistWithTracks={handleImportPlaylist}
      />

      <SleepTimerModal
        isOpen={isSleepTimerModalOpen}
        onClose={() => setIsSleepTimerModalOpen(false)}
        sleepTimerState={sleepTimerState}
        onSetTimerDuration={handleSetSleepTimerDuration}
        onSetTimerEndOfTrack={handleSetSleepTimerEndOfTrack}
        onCancelTimer={handleCancelSleepTimer}
      />

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={config}
        onUpdateConfig={(newCfg) => {
          setConfig(newCfg);
          saveConfig(newCfg);
          if (newCfg.playbackMode !== playbackMode) {
            setPlaybackMode(newCfg.playbackMode);
          }
        }}
        tracks={tracks}
        playlists={playlists}
        likedCount={likedTrackIds.length}
        onResetLibrary={handleResetLibrary}
        onReloadAllData={handleReloadAllData}
      />

      <VisualizerModal
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div 
          id="app-toast-notification"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-neutral-900/95 border border-[#1ed760]/50 text-white px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-3 max-w-[90vw]"
        >
          <Moon className="w-4 h-4 text-[#1ed760] fill-current flex-shrink-0" />
          <span className="truncate">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-1.5 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer flex-shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 8. PWA Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
