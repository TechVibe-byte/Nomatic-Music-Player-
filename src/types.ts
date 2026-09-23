export interface Track {
  id: string;
  youtubeId: string;
  youtubeUrl: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number; // in seconds
  addedAt: number; // timestamp
  modePreference?: 'audio' | 'video';
  tags?: string[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  trackIds: string[];
  coverUrl?: string;
  gradient: string; // Tailwind gradient or hex
  createdAt: number;
  updatedAt: number;
  isCustom?: boolean;
  youtubePlaylistId?: string; // YouTube Playlist ID if imported/linked
  lastSyncedAt?: number; // Timestamp of last successful sync
  autoSync?: boolean; // Whether to automatically check for additions on playlist view
}

export type PlaybackMode = 'audio' | 'video';
export type RepeatMode = 'off' | 'all' | 'one';

export interface AppConfig {
  playbackMode: PlaybackMode;
  audioQuality: 'high' | 'normal';
  autoPlayNext: boolean;
  backgroundAudioEnabled: boolean;
  wakeLockEnabled?: boolean;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
}

export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackMode: PlaybackMode;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  queue: Track[];
  queueIndex: number;
  isBuffering: boolean;
  isPlayerReady: boolean;
}

export type ActiveView = 
  | { type: 'home' }
  | { type: 'search' }
  | { type: 'library' }
  | { type: 'liked' }
  | { type: 'playlist'; playlistId: string };

export type SleepTimerDuration = 5 | 10 | 15 | 30 | 45 | 60 | 90 | 'end_of_track' | 'custom';

export interface SleepTimerState {
  isActive: boolean;
  type: 'duration' | 'end_of_track' | null;
  durationMinutes: number | null;
  targetTimestamp: number | null; // Date.now() + ms
  remainingSeconds: number;
}
