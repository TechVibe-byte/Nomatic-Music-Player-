import { Track, Playlist, AppConfig } from '../types';
import { INITIAL_TRACKS, INITIAL_PLAYLISTS } from './initialPlaylists';

export { INITIAL_TRACKS, INITIAL_PLAYLISTS };

const STORAGE_KEYS = {
  TRACKS: 'nomatic_tracks_v2',
  PLAYLISTS: 'nomatic_playlists_v2',
  LIKED: 'nomatic_liked_tracks_v2',
  CONFIG: 'nomatic_config_v2',
  RECENT: 'nomatic_recent_v2',
};

export const DEFAULT_CONFIG: AppConfig = {
  playbackMode: 'audio',
  audioQuality: 'high',
  autoPlayNext: true,
  backgroundAudioEnabled: true,
  volume: 85,
  isMuted: false,
  repeatMode: 'off',
  isShuffled: false,
};

// Configuration Load & Save
export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load local config', e);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save local config', e);
  }
}

// Tracks
export function loadTracks(): Track[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRACKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      const isLegacyDummy = Array.isArray(parsed) && parsed.some((t: Track) => t.id === 'track-lofi-1' || t.id === 'track-synth-2');
      if (Array.isArray(parsed) && parsed.length > 0 && !isLegacyDummy) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load tracks', e);
  }
  // Fallback to initial tracks
  saveTracks(INITIAL_TRACKS);
  return INITIAL_TRACKS;
}

export function saveTracks(tracks: Track[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify(tracks));
  } catch (e) {
    console.warn('Failed to save tracks', e);
  }
}

// Playlists
export function loadPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      const isLegacyDummy = Array.isArray(parsed) && parsed.some((p: Playlist) => p.id === 'pl-chill-vibes' || p.id === 'pl-night-drive');
      if (Array.isArray(parsed) && parsed.length > 0 && !isLegacyDummy) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load playlists', e);
  }
  // Fallback to initial playlists
  savePlaylists(INITIAL_PLAYLISTS);
  return INITIAL_PLAYLISTS;
}

export function savePlaylists(playlists: Playlist[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
  } catch (e) {
    console.warn('Failed to save playlists', e);
  }
}

// Liked Tracks
export function loadLikedTrackIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LIKED);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && !parsed.includes('track-lofi-1')) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load liked tracks', e);
  }
  return [INITIAL_TRACKS[0]?.id, INITIAL_TRACKS[1]?.id].filter(Boolean) as string[];
}

export function saveLikedTrackIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(ids));
  } catch (e) {
    console.warn('Failed to save liked tracks', e);
  }
}

// History
export function loadRecentTrackIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load history', e);
  }
  return [];
}

export function saveRecentTrackIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(ids.slice(0, 50)));
  } catch (e) {
    console.warn('Failed to save history', e);
  }
}

// Complete Configuration Export / Import
export interface LocalConfigExport {
  version: 1;
  exportedAt: string;
  config: AppConfig;
  tracks: Track[];
  playlists: Playlist[];
  likedTrackIds: string[];
  recentTrackIds: string[];
}

export function exportLocalConfigJSON(): string {
  const exportData: LocalConfigExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    config: loadConfig(),
    tracks: loadTracks(),
    playlists: loadPlaylists(),
    likedTrackIds: loadLikedTrackIds(),
    recentTrackIds: loadRecentTrackIds(),
  };
  return JSON.stringify(exportData, null, 2);
}

export function importLocalConfigJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString) as Partial<LocalConfigExport>;
    if (data.config) saveConfig(data.config);
    if (Array.isArray(data.tracks)) saveTracks(data.tracks);
    if (Array.isArray(data.playlists)) savePlaylists(data.playlists);
    if (Array.isArray(data.likedTrackIds)) saveLikedTrackIds(data.likedTrackIds);
    if (Array.isArray(data.recentTrackIds)) saveRecentTrackIds(data.recentTrackIds);
    return true;
  } catch (e) {
    console.error('Failed to import local config', e);
    return false;
  }
}
