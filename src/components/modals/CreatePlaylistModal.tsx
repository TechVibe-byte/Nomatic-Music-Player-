import React, { useState } from 'react';
import { X, Plus, Music, Sparkles, Loader2, ListMusic, CheckCircle2, AlertTriangle, ClipboardPaste } from 'lucide-react';
import { Playlist, Track } from '../../types';
import { extractYouTubePlaylistId, fetchYouTubePlaylist, convertPlaylistItemsToTracks, YouTubePlaylistResult } from '../../utils/youtubePlaylist';
import { TrackThumbnail } from '../common/TrackThumbnail';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePlaylist: (playlist: Playlist) => void;
  onCreatePlaylistWithTracks?: (playlist: Playlist, tracks: Track[]) => void;
}

const GRADIENT_OPTIONS = [
  { label: 'Emerald Forest', value: 'from-emerald-900 to-[#121212]' },
  { label: 'Purple Twilight', value: 'from-purple-950 to-[#121212]' },
  { label: 'Deep Blue Ocean', value: 'from-blue-950 to-[#121212]' },
  { label: 'Crimson Ember', value: 'from-rose-950 to-[#121212]' },
  { label: 'Golden Sunset', value: 'from-amber-950 to-[#121212]' },
  { label: 'Cyber Indigo', value: 'from-indigo-950 to-[#121212]' },
];

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreatePlaylist,
  onCreatePlaylistWithTracks,
}) => {
  const [activeTab, setActiveTab] = useState<'custom' | 'youtube'>('custom');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gradient, setGradient] = useState(GRADIENT_OPTIONS[0].value);

  // YouTube Playlist import state
  const [youtubePlaylistUrl, setYoutubePlaylistUrl] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedResult, setDetectedResult] = useState<YouTubePlaylistResult | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDetectYouTubePlaylist = async (urlOverride?: string) => {
    const targetUrl = (urlOverride !== undefined ? urlOverride : youtubePlaylistUrl).trim();
    if (!targetUrl) {
      setDetectError('Please enter a YouTube playlist link or ID');
      return;
    }

    const playlistId = extractYouTubePlaylistId(targetUrl);
    if (!playlistId) {
      setDetectError('Could not find a valid YouTube Playlist ID in the URL.');
      return;
    }

    setIsDetecting(true);
    setDetectError(null);

    try {
      const res = await fetchYouTubePlaylist(targetUrl);
      if (!res.tracks || res.tracks.length === 0) {
        throw new Error('No songs could be extracted. Please ensure the playlist is public or unlisted.');
      }
      setDetectedResult(res);
      setName(res.title);
      setDescription(res.description || `Imported YouTube playlist by ${res.author}`);
    } catch (err: any) {
      setDetectError(err?.message || 'Could not fetch songs from this playlist.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setYoutubePlaylistUrl(text);
        handleDetectYouTubePlaylist(text);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (activeTab === 'youtube' && detectedResult && detectedResult.tracks.length > 0) {
      const tracksToImport = convertPlaylistItemsToTracks(
        detectedResult.tracks,
        'audio',
        detectedResult.title
      );

      const newPlaylist: Playlist = {
        id: `pl-${Date.now()}`,
        name: name.trim(),
        description: description.trim() || `Imported from YouTube playlist by ${detectedResult.author}`,
        trackIds: tracksToImport.map((t) => t.id),
        gradient,
        coverUrl: detectedResult.thumbnail,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isCustom: true,
        youtubePlaylistId: detectedResult.id,
        lastSyncedAt: Date.now(),
        autoSync: true,
      };

      if (onCreatePlaylistWithTracks) {
        onCreatePlaylistWithTracks(newPlaylist, tracksToImport);
      } else {
        onCreatePlaylist(newPlaylist);
      }
    } else {
      const newPlaylist: Playlist = {
        id: `pl-${Date.now()}`,
        name: name.trim(),
        description: description.trim() || 'Custom YouTube music playlist in Nomatic.',
        trackIds: [],
        gradient,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isCustom: true,
      };

      onCreatePlaylist(newPlaylist);
    }

    onClose();
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setYoutubePlaylistUrl('');
    setDetectedResult(null);
    setDetectError(null);
    setActiveTab('custom');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-[#181818] border border-neutral-800 p-4 sm:p-6 shadow-2xl text-white my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1ed760] text-black flex items-center justify-center font-bold">
              <Music className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">Create Playlist</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 rounded-xl border border-neutral-800 mt-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Empty Playlist
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('youtube')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'youtube'
                ? 'bg-[#1ed760] text-black shadow-sm font-extrabold'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/40'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>From YouTube URL</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-extrabold uppercase ${
                activeTab === 'youtube' ? 'bg-black text-[#1ed760]' : 'bg-emerald-950 text-emerald-400'
              }`}
            >
              Auto
            </span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
          {/* YouTube Playlist URL detector section */}
          {activeTab === 'youtube' && (
            <div className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-800 space-y-2.5">
              <label className="block text-xs font-semibold text-neutral-300">
                YouTube Playlist Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={youtubePlaylistUrl}
                  onChange={(e) => {
                    setYoutubePlaylistUrl(e.target.value);
                    setDetectError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleDetectYouTubePlaylist();
                    }
                  }}
                  placeholder="https://www.youtube.com/playlist?list=..."
                  className="flex-1 bg-[#282828] border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold rounded-lg text-neutral-200 transition cursor-pointer flex items-center gap-1"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>Paste</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDetectYouTubePlaylist()}
                  disabled={isDetecting || !youtubePlaylistUrl.trim()}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    youtubePlaylistUrl.trim() && !isDetecting
                      ? 'bg-[#1ed760] hover:bg-[#1db954] text-black'
                      : 'bg-neutral-700 text-neutral-400 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {isDetecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Detect</span>
                </button>
              </div>

              {detectError && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{detectError}</span>
                </p>
              )}

              {detectedResult && (
                <div className="p-2.5 bg-neutral-800/80 rounded-lg border border-emerald-500/30 flex items-center gap-3">
                  <TrackThumbnail
                    src={detectedResult.thumbnail}
                    videoId={detectedResult.tracks[0]?.videoId}
                    alt={detectedResult.title}
                    className="w-12 h-12 rounded object-cover bg-neutral-900 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">
                      {detectedResult.title}
                    </p>
                    <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#1ed760]" />
                      <span>{detectedResult.tracks.length} Songs Detected</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Playlist Name *
            </label>
            <input
              id="input-playlist-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Late Night Coding, Workout Beats"
              className="w-full bg-[#282828] border border-neutral-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Description (optional)
            </label>
            <textarea
              id="input-playlist-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a cool description..."
              className="w-full bg-[#282828] border border-neutral-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Atmosphere & Color Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GRADIENT_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setGradient(opt.value)}
                  className={`p-2 rounded-lg border text-left text-xs transition cursor-pointer flex flex-col justify-between h-14 bg-gradient-to-br ${opt.value} ${
                    gradient === opt.value
                      ? 'border-[#1ed760] ring-1 ring-[#1ed760]'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <span className="text-[10px] font-bold text-white truncate drop-shadow">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              id="submit-create-playlist"
              type="submit"
              disabled={!name.trim() || isDetecting}
              className={`w-full py-2.5 rounded-full font-bold text-sm text-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                name.trim() && !isDetecting
                  ? 'bg-[#1ed760] hover:bg-[#1db954] hover:scale-[1.01]'
                  : 'bg-neutral-600 opacity-50 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>
                {activeTab === 'youtube' && detectedResult
                  ? `Create Playlist & Import ${detectedResult.tracks.length} Songs`
                  : 'Create Playlist'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
