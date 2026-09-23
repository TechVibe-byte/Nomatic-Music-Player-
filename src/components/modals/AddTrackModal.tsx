import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Youtube, 
  Sparkles, 
  Plus, 
  Loader2, 
  Headphones, 
  Film,
  Layers,
  Filter,
  AlertTriangle,
  ClipboardPaste,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ListMusic,
  ArrowRight,
  Search,
  CheckSquare,
  Square,
  FolderPlus,
  Music2
} from 'lucide-react';
import { Track, Playlist, PlaybackMode } from '../../types';
import { 
  extractYouTubeId, 
  fetchYouTubeMetadata, 
  extractBulkYouTubeIds, 
  filterBulkYouTubeLinks,
} from '../../utils/youtube';
import {
  extractYouTubePlaylistId,
  fetchYouTubePlaylist,
  YouTubePlaylistResult,
  convertPlaylistItemsToTracks,
} from '../../utils/youtubePlaylist';
import { TrackThumbnail } from '../common/TrackThumbnail';

interface AddTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  tracks: Track[];
  onAddTrack: (track: Track, targetPlaylistId?: string) => void;
  onAddTracksBulk?: (tracks: Track[], targetPlaylistId?: string) => void;
  onImportPlaylist?: (playlist: Playlist, tracks: Track[]) => void;
  defaultPlaylistId?: string;
  initialMode?: 'single' | 'playlist' | 'bulk';
}

const SAMPLE_BULK_TEXT = `https://www.youtube.com/watch?v=jfKfPfyJRdk
https://www.youtube.com/watch?v=4xDzrJKXOOY
https://www.youtube.com/watch?v=jfKfPfyJRdk
https://www.youtube.com/watch?v=4Tr0otuiQuU
https://youtu.be/1nue_A9eY7U
https://www.youtube.com/watch?v=4xDzrJKXOOY`;

const SAMPLE_YOUTUBE_TRACKS = [
  {
    name: 'Chill Lofi Beats',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    id: 'jfKfPfyJRdk',
    desc: 'Lofi Girl 24/7 stream classic',
  },
  {
    name: 'Synthwave Night Drive',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    id: '4xDzrJKXOOY',
    desc: 'Retro 80s futuristic beats',
  },
  {
    name: 'Moonlight Sonata Piano',
    url: 'https://www.youtube.com/watch?v=4Tr0otuiQuU',
    id: '4Tr0otuiQuU',
    desc: 'Ludwig van Beethoven masterwork',
  },
  {
    name: 'Blade Runner 2049 Rain',
    url: 'https://www.youtube.com/watch?v=1nue_A9eY7U',
    id: '1nue_A9eY7U',
    desc: 'Atmospheric sleep & study soundscape',
  },
];

const SAMPLE_PLAYLISTS = [
  {
    name: '🔥 Trending Telugu Hits 2026',
    desc: 'Best Telugu Music & Top Trending Hits',
    url: 'https://youtube.com/playlist?list=PL0ZpYcTg19EEnxfBzlswB90oZEIYx9ojB',
  },
  {
    name: '🎶 Telugu Hit Melodies',
    desc: 'Hit Melodies from 2000s and 2010s',
    url: 'https://youtube.com/playlist?list=PL4sNEU2Mgm6bNnbM-qKPmTwwDromFqpMQ',
  },
  {
    name: '🙏 Lord Ayyappa Devotional Songs',
    desc: 'Latest Devotional Songs & Peddapuli Eshwar',
    url: 'https://youtube.com/playlist?list=PLzYAeWJ4n8w0C6ZfGVEux6Bw3I_6wnrAF',
  },
  {
    name: '🌍 Melhores Internacional',
    desc: 'Imagine Dragons, Coldplay & International Hits',
    url: 'https://youtube.com/playlist?list=PL2svDrlDLVHPRcdrS2Zi8KPFYWGd8kJ9b',
  },
];

const PLAYLIST_GRADIENT_OPTIONS = [
  { label: 'Emerald Forest', value: 'from-emerald-900 to-[#121212]' },
  { label: 'Purple Twilight', value: 'from-purple-950 to-[#121212]' },
  { label: 'Deep Blue Ocean', value: 'from-blue-950 to-[#121212]' },
  { label: 'Crimson Ember', value: 'from-rose-950 to-[#121212]' },
  { label: 'Golden Sunset', value: 'from-amber-950 to-[#121212]' },
  { label: 'Cyber Indigo', value: 'from-indigo-950 to-[#121212]' },
];

export const AddTrackModal: React.FC<AddTrackModalProps> = ({
  isOpen,
  onClose,
  playlists,
  tracks,
  onAddTrack,
  onAddTracksBulk,
  onImportPlaylist,
  defaultPlaylistId,
  initialMode = 'single',
}) => {
  const [modalTab, setModalTab] = useState<'single' | 'playlist' | 'bulk'>(initialMode);

  // Single Track State
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedId, setParsedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [targetPlaylist, setTargetPlaylist] = useState<string>(defaultPlaylistId || 'library-only');
  const [modePreference, setModePreference] = useState<PlaybackMode>('audio');
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [detectedPlaylistHint, setDetectedPlaylistHint] = useState<{ id: string; url: string } | null>(null);

  // YouTube Playlist State
  const [playlistUrlInput, setPlaylistUrlInput] = useState('');
  const [isDetectingPlaylist, setIsDetectingPlaylist] = useState(false);
  const [detectedPlaylist, setDetectedPlaylist] = useState<YouTubePlaylistResult | null>(null);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [selectedPlaylistVideoIds, setSelectedPlaylistVideoIds] = useState<Set<string>>(new Set());
  const [playlistDestination, setPlaylistDestination] = useState<'new-playlist' | 'existing-playlist' | 'library-only'>('new-playlist');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [newPlaylistGradient, setNewPlaylistGradient] = useState(PLAYLIST_GRADIENT_OPTIONS[0].value);
  const [filterPlaylistExistingInLibrary, setFilterPlaylistExistingInLibrary] = useState(true);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
  const [playlistModePreference, setPlaylistModePreference] = useState<PlaybackMode>('audio');

  // Bulk URLs State
  const [bulkTextInput, setBulkTextInput] = useState('');
  const [filterExistingInLibrary, setFilterExistingInLibrary] = useState(true);
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (defaultPlaylistId) {
      setTargetPlaylist(defaultPlaylistId);
    }
  }, [defaultPlaylistId]);

  useEffect(() => {
    if (isOpen) {
      setModalTab(initialMode || 'single');
    }
  }, [initialMode, isOpen]);

  // Set of existing YouTube IDs in library
  const existingLibraryYouTubeIds = useMemo(() => {
    return new Set(tracks.map((t) => t.youtubeId));
  }, [tracks]);

  // Parse bulk text in real time
  const bulkAnalysis = useMemo(() => {
    if (!bulkTextInput.trim()) {
      return {
        totalExtracted: 0,
        uniqueToImport: [],
        internalDuplicates: [],
        existingInLibrary: [],
      };
    }

    const rawParsed = extractBulkYouTubeIds(bulkTextInput);
    const filterResult = filterBulkYouTubeLinks(
      rawParsed,
      existingLibraryYouTubeIds,
      filterExistingInLibrary
    );

    const finalUnique = filterResult.uniqueToImport.filter(
      (item) => !excludedIds.has(item.videoId)
    );

    return {
      ...filterResult,
      uniqueToImport: finalUnique,
    };
  }, [bulkTextInput, existingLibraryYouTubeIds, filterExistingInLibrary, excludedIds]);

  // Filtered playlist songs based on search query
  const filteredPlaylistTracks = useMemo(() => {
    if (!detectedPlaylist) return [];
    if (!playlistSearchQuery.trim()) return detectedPlaylist.tracks;
    const q = playlistSearchQuery.toLowerCase();
    return detectedPlaylist.tracks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.author.toLowerCase().includes(q)
    );
  }, [detectedPlaylist, playlistSearchQuery]);

  const existingInLibraryCountInPlaylist = useMemo(() => {
    if (!detectedPlaylist) return 0;
    return detectedPlaylist.tracks.filter((t) => existingLibraryYouTubeIds.has(t.videoId)).length;
  }, [detectedPlaylist, existingLibraryYouTubeIds]);

  if (!isOpen) return null;

  // Single Track URL Input handler
  const handleUrlChange = async (val: string) => {
    setUrlInput(val);
    setError(null);

    // Check if the URL is a playlist or contains a playlist ID
    const plId = extractYouTubePlaylistId(val);
    if (plId) {
      setDetectedPlaylistHint({ id: plId, url: val });
    } else {
      setDetectedPlaylistHint(null);
    }

    // If user pasted multiple links into the single input, gently switch to bulk tab
    const bulkCheck = extractBulkYouTubeIds(val);
    if (bulkCheck.length > 1) {
      setBulkTextInput(val);
      setModalTab('bulk');
      return;
    }

    const videoId = extractYouTubeId(val);
    if (videoId) {
      if (existingLibraryYouTubeIds.has(videoId)) {
        setError('Notice: This track is already saved in your library.');
      }
      setParsedId(videoId);
      setIsLoading(true);
      try {
        const meta = await fetchYouTubeMetadata(videoId);
        setTitle(meta.title);
        setArtist(meta.author);
        setThumbnail(meta.thumbnail);
      } catch {
        setError('Could not fetch video info automatically, but you can still add it!');
      } finally {
        setIsLoading(false);
      }
    } else {
      setParsedId(null);
    }
  };

  const handlePasteClipboard = async (target: 'single' | 'playlist' | 'bulk') => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (target === 'single') {
          handleUrlChange(text);
        } else if (target === 'playlist') {
          setPlaylistUrlInput(text);
          handleDetectPlaylist(text);
        } else {
          setBulkTextInput(text);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSelectSample = (sampleUrl: string) => {
    handleUrlChange(sampleUrl);
  };

  // Submit Single Track
  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedId) {
      setError('Please provide a valid YouTube URL or Video ID');
      return;
    }

    const newTrack: Track = {
      id: `track-${Date.now()}-${parsedId}`,
      youtubeId: parsedId,
      youtubeUrl: urlInput.startsWith('http') ? urlInput : `https://www.youtube.com/watch?v=${parsedId}`,
      title: title.trim() || `YouTube Track (${parsedId})`,
      artist: artist.trim() || 'YouTube Audio',
      thumbnail: thumbnail || `https://img.youtube.com/vi/${parsedId}/hqdefault.jpg`,
      duration: 210,
      addedAt: Date.now(),
      modePreference,
      tags: tagInput
        ? tagInput.split(',').map((t) => t.trim()).filter(Boolean)
        : ['YouTube', modePreference === 'audio' ? 'Audio' : 'Video'],
    };

    onAddTrack(newTrack, targetPlaylist === 'library-only' ? undefined : targetPlaylist);
    onClose();
    resetForm();
  };

  // Handle YouTube Playlist Detection
  const handleDetectPlaylist = async (inputUrl?: string) => {
    const targetUrl = (inputUrl !== undefined ? inputUrl : playlistUrlInput).trim();
    if (!targetUrl) {
      setPlaylistError('Please enter a YouTube playlist link or ID');
      return;
    }

    const playlistId = extractYouTubePlaylistId(targetUrl);
    if (!playlistId) {
      setPlaylistError('Could not find a valid YouTube Playlist ID. Ensure the link contains "list=..." or is a playlist URL.');
      return;
    }

    setIsDetectingPlaylist(true);
    setPlaylistError(null);

    try {
      const result = await fetchYouTubePlaylist(targetUrl);
      if (!result.tracks || result.tracks.length === 0) {
        throw new Error('No songs could be extracted from this playlist. Make sure the playlist is public or unlisted.');
      }

      setDetectedPlaylist(result);
      setNewPlaylistName(result.title);
      setNewPlaylistDescription(result.description || `Imported from YouTube playlist by ${result.author}`);
      // Select all detected items initially
      setSelectedPlaylistVideoIds(new Set(result.tracks.map((t) => t.videoId)));
    } catch (err: any) {
      setPlaylistError(err?.message || 'Failed to detect songs from playlist.');
    } finally {
      setIsDetectingPlaylist(false);
    }
  };

  // Toggle selection for a single playlist item
  const handleTogglePlaylistItem = (videoId: string) => {
    setSelectedPlaylistVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  // Toggle select all / deselect all
  const handleToggleSelectAllPlaylistItems = () => {
    if (!detectedPlaylist) return;
    if (selectedPlaylistVideoIds.size === detectedPlaylist.tracks.length) {
      setSelectedPlaylistVideoIds(new Set());
    } else {
      setSelectedPlaylistVideoIds(new Set(detectedPlaylist.tracks.map((t) => t.videoId)));
    }
  };

  // Submit YouTube Playlist Import
  const handlePlaylistImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detectedPlaylist || detectedPlaylist.tracks.length === 0) return;

    setIsImportingPlaylist(true);

    try {
      // 1. Get selected tracks
      const selectedItems = detectedPlaylist.tracks.filter((t) =>
        selectedPlaylistVideoIds.has(t.videoId)
      );

      if (selectedItems.length === 0) {
        setPlaylistError('Please select at least one song to import.');
        setIsImportingPlaylist(false);
        return;
      }

      // 2. Filter existing in library if option is enabled
      let itemsToConvert = selectedItems;
      if (filterPlaylistExistingInLibrary) {
        itemsToConvert = selectedItems.filter((t) => !existingLibraryYouTubeIds.has(t.videoId));
      }

      const newTracks = convertPlaylistItemsToTracks(
        itemsToConvert,
        playlistModePreference,
        detectedPlaylist.title
      );

      // 3. Dispatch to destination
      if (playlistDestination === 'new-playlist') {
        const plName = newPlaylistName.trim() || detectedPlaylist.title;
        const newPlaylist: Playlist = {
          id: `pl-${Date.now()}`,
          name: plName,
          description:
            newPlaylistDescription.trim() ||
            `Imported YouTube playlist by ${detectedPlaylist.author} (${selectedItems.length} tracks)`,
          trackIds: newTracks.map((t) => t.id),
          gradient: newPlaylistGradient,
          coverUrl: detectedPlaylist.thumbnail,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isCustom: true,
        };

        if (onImportPlaylist) {
          onImportPlaylist(newPlaylist, newTracks);
        } else {
          if (onAddTracksBulk) {
            onAddTracksBulk(newTracks, newPlaylist.id);
          } else {
            newTracks.forEach((t) => onAddTrack(t, newPlaylist.id));
          }
        }
      } else if (playlistDestination === 'existing-playlist') {
        const targetPlId = targetPlaylist === 'library-only' ? undefined : targetPlaylist;
        if (onAddTracksBulk) {
          onAddTracksBulk(newTracks, targetPlId);
        } else {
          newTracks.forEach((t) => onAddTrack(t, targetPlId));
        }
      } else {
        // Library only
        if (onAddTracksBulk) {
          onAddTracksBulk(newTracks, undefined);
        } else {
          newTracks.forEach((t) => onAddTrack(t, undefined));
        }
      }

      onClose();
      resetForm();
    } catch (err: any) {
      setPlaylistError(err?.message || 'Error occurred while saving songs.');
    } finally {
      setIsImportingPlaylist(false);
    }
  };

  // Submit Bulk Tracks
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkAnalysis.uniqueToImport.length === 0) return;

    setIsBulkImporting(true);

    const targetPlaylistId = targetPlaylist === 'library-only' ? undefined : targetPlaylist;
    const commonTags = tagInput
      ? tagInput.split(',').map((t) => t.trim()).filter(Boolean)
      : ['YouTube', 'BulkImport', modePreference === 'audio' ? 'Audio' : 'Video'];

    const newTracks: Track[] = bulkAnalysis.uniqueToImport.map((item, idx) => ({
      id: `track-${Date.now()}-${idx}-${item.videoId}`,
      youtubeId: item.videoId,
      youtubeUrl: item.cleanUrl,
      title: `YouTube Track (${item.videoId})`,
      artist: 'YouTube Audio',
      thumbnail: `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
      duration: 210,
      addedAt: Date.now() + idx,
      modePreference,
      tags: commonTags,
    }));

    if (onAddTracksBulk) {
      onAddTracksBulk(newTracks, targetPlaylistId);
    } else {
      newTracks.forEach((t) => onAddTrack(t, targetPlaylistId));
    }

    fetchBatchMetadataAsync(newTracks);

    setIsBulkImporting(false);
    onClose();
    resetForm();
  };

  const fetchBatchMetadataAsync = async (tracksToEnrich: Track[]) => {
    for (const track of tracksToEnrich.slice(0, 15)) {
      try {
        const meta = await fetchYouTubeMetadata(track.youtubeId);
        if (meta.title && meta.title !== track.title) {
          track.title = meta.title;
          track.artist = meta.author;
          track.thumbnail = meta.thumbnail;
        }
      } catch {
        // continue
      }
    }
  };

  const handleExcludeItem = (videoId: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      next.add(videoId);
      return next;
    });
  };

  const resetForm = () => {
    setUrlInput('');
    setParsedId(null);
    setTitle('');
    setArtist('');
    setThumbnail('');
    setTagInput('');
    setBulkTextInput('');
    setExcludedIds(new Set());
    setError(null);
    setDetectedPlaylistHint(null);
    setPlaylistUrlInput('');
    setDetectedPlaylist(null);
    setPlaylistError(null);
    setSelectedPlaylistVideoIds(new Set());
    setPlaylistSearchQuery('');
  };

  const totalDuplicatesFiltered = 
    bulkAnalysis.internalDuplicates.length + 
    (filterExistingInLibrary ? bulkAnalysis.existingInLibrary.length : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-[#181818] border border-neutral-800 p-4 sm:p-6 shadow-2xl text-white my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#ff0000]/20 text-[#ff4e4e] flex items-center justify-center">
              <Youtube className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add YouTube Music</h2>
              <p className="text-xs text-neutral-400">
                Import playlists automatically, add single links, or paste bulk URLs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 rounded-xl border border-neutral-800 mt-4 flex-shrink-0">
          {/* Single Link Tab */}
          <button
            type="button"
            id="tab-single-link"
            onClick={() => setModalTab('single')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              modalTab === 'single'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-red-500" />
            <span>Single Link</span>
          </button>

          {/* YouTube Playlist Tab */}
          <button
            type="button"
            id="tab-youtube-playlist"
            onClick={() => setModalTab('playlist')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer relative ${
              modalTab === 'playlist'
                ? 'bg-[#1ed760] text-black shadow-sm font-extrabold'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>YouTube Playlist</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                modalTab === 'playlist' ? 'bg-black text-[#1ed760]' : 'bg-emerald-950 text-[#1ed760] border border-emerald-500/30'
              }`}
            >
              Auto
            </span>
          </button>

          {/* Bulk URLs Tab */}
          <button
            type="button"
            id="tab-bulk-urls"
            onClick={() => setModalTab('bulk')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              modalTab === 'bulk'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Bulk URLs</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 mt-4">
          {/* TAB 1: SINGLE LINK */}
          {modalTab === 'single' && (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  YouTube Link or Video ID
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="input-youtube-link"
                      type="text"
                      value={urlInput}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="e.g. https://www.youtube.com/watch?v=... or playlist link"
                      className="w-full bg-[#282828] border border-neutral-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition"
                      autoFocus
                    />
                    {isLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1ed760] animate-spin" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePasteClipboard('single')}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold rounded-lg text-neutral-200 hover:text-white transition cursor-pointer flex items-center gap-1"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{error}</span>
                  </p>
                )}
              </div>

              {/* Automatic Playlist Detection Banner in Single Track View */}
              {detectedPlaylistHint && (
                <div className="p-3 bg-gradient-to-r from-emerald-950/70 via-neutral-900 to-neutral-900 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 animate-fadeIn shadow-lg">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#1ed760]/20 text-[#1ed760] flex items-center justify-center flex-shrink-0">
                      <ListMusic className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-white">YouTube Playlist Detected!</span>
                        <span className="text-[10px] bg-[#1ed760] text-black font-extrabold px-1.5 py-0.2 rounded-full">
                          Auto
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-300 truncate">
                        This URL contains a playlist. Extract and import all songs?
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalTab('playlist');
                      setPlaylistUrlInput(detectedPlaylistHint.url);
                      handleDetectPlaylist(detectedPlaylistHint.url);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#1ed760] hover:bg-[#1db954] text-black text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow hover:scale-[1.02]"
                  >
                    <span>Detect Songs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Quick Suggestions */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#1ed760]" /> Quick Test YouTube Links:
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SAMPLE_YOUTUBE_TRACKS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleSelectSample(sample.url)}
                      className="text-left px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/80 text-xs text-neutral-300 hover:text-white transition cursor-pointer truncate"
                    >
                      <p className="font-semibold truncate text-[#1ed760]">{sample.name}</p>
                      <p className="text-[10px] text-neutral-500 truncate">{sample.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parsed Preview Card */}
              {parsedId && (
                <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 flex gap-3 items-center animate-fadeIn">
                  <TrackThumbnail
                    src={thumbnail}
                    videoId={parsedId}
                    alt="Thumbnail"
                    className="w-16 h-16 rounded-lg object-cover bg-neutral-800 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Track Title"
                      className="w-full bg-[#202020] border border-neutral-700/60 rounded px-2 py-1 text-xs text-white font-semibold focus:outline-none focus:border-[#1ed760]"
                    />
                    <input
                      type="text"
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      placeholder="Artist / Channel"
                      className="w-full bg-[#202020] border border-neutral-700/60 rounded px-2 py-1 text-xs text-neutral-400 focus:outline-none focus:border-[#1ed760]"
                    />
                  </div>
                </div>
              )}

              {/* Mode & Target Playlist */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Playback Preference
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModePreference('audio')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                        modePreference === 'audio'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Audio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModePreference('video')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                        modePreference === 'video'
                          ? 'bg-red-600 text-white'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Video</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Add to Playlist
                  </label>
                  <select
                    id="select-target-playlist"
                    value={targetPlaylist}
                    onChange={(e) => setTargetPlaylist(e.target.value)}
                    className="w-full bg-[#282828] border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#1ed760]"
                  >
                    <option value="library-only">Library Only (No Playlist)</option>
                    {playlists.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Tags */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Tags (comma separated, optional)
                </label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. Pop, Chill, Study, Favorites"
                  className="w-full bg-[#282828] border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760]"
                />
              </div>

              {/* Submit Single */}
              <div className="pt-2">
                <button
                  id="submit-add-track"
                  type="submit"
                  disabled={!parsedId || isLoading}
                  className={`w-full py-2.5 rounded-full font-bold text-sm text-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                    parsedId && !isLoading
                      ? 'bg-[#1ed760] hover:bg-[#1db954] hover:scale-[1.01]'
                      : 'bg-neutral-600 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add to Nomatic</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: YOUTUBE PLAYLIST (AUTO-DETECT) */}
          {modalTab === 'playlist' && (
            <div className="space-y-4">
              {/* Input for Playlist URL */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  YouTube Playlist Link or ID
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="input-playlist-link"
                      type="text"
                      value={playlistUrlInput}
                      onChange={(e) => {
                        setPlaylistUrlInput(e.target.value);
                        setPlaylistError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleDetectPlaylist();
                        }
                      }}
                      placeholder="Paste YouTube playlist URL (e.g. https://www.youtube.com/playlist?list=...)"
                      className="w-full bg-[#282828] border border-neutral-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] font-mono transition"
                      autoFocus
                    />
                    {isDetectingPlaylist && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1ed760] animate-spin" />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePasteClipboard('playlist')}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold rounded-lg text-neutral-200 hover:text-white transition cursor-pointer flex items-center gap-1 flex-shrink-0"
                    title="Paste from clipboard and detect"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste</span>
                  </button>

                  <button
                    type="button"
                    id="btn-detect-playlist-songs"
                    onClick={() => handleDetectPlaylist()}
                    disabled={isDetectingPlaylist || !playlistUrlInput.trim()}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                      playlistUrlInput.trim() && !isDetectingPlaylist
                        ? 'bg-[#1ed760] hover:bg-[#1db954] text-black shadow-md'
                        : 'bg-neutral-700 text-neutral-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {isDetectingPlaylist ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Detecting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Detect Songs</span>
                      </>
                    )}
                  </button>
                </div>

                {playlistError && (
                  <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{playlistError}</span>
                  </p>
                )}
              </div>

              {/* Sample YouTube Playlists to Try */}
              {!detectedPlaylist && !isDetectingPlaylist && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#1ed760]" /> Try Sample YouTube Playlists:
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {SAMPLE_PLAYLISTS.map((sp) => (
                      <button
                        key={sp.name}
                        type="button"
                        onClick={() => {
                          setPlaylistUrlInput(sp.url);
                          handleDetectPlaylist(sp.url);
                        }}
                        className="text-left p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-300 transition cursor-pointer group"
                      >
                        <p className="font-bold text-white group-hover:text-[#1ed760] transition truncate">
                          {sp.name}
                        </p>
                        <p className="text-[10px] text-neutral-400 truncate mt-0.5">{sp.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading State Animation */}
              {isDetectingPlaylist && (
                <div className="p-6 bg-neutral-900/90 rounded-2xl border border-neutral-800 text-center space-y-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-[#1ed760]/20 text-[#1ed760] flex items-center justify-center mx-auto">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Scanning YouTube Playlist...</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Automatically extracting video metadata, titles, artists, and thumbnails.
                    </p>
                  </div>
                </div>
              )}

              {/* Detected Playlist View */}
              {detectedPlaylist && !isDetectingPlaylist && (
                <form onSubmit={handlePlaylistImportSubmit} className="space-y-4">
                  {/* Playlist Summary Banner */}
                  <div className="p-3.5 bg-gradient-to-br from-neutral-800/90 to-neutral-900 rounded-xl border border-neutral-700/80 flex items-center gap-3.5 shadow-lg">
                    <TrackThumbnail
                      src={detectedPlaylist.thumbnail}
                      videoId={detectedPlaylist.tracks[0]?.videoId}
                      alt={detectedPlaylist.title}
                      className="w-16 h-16 rounded-lg object-cover bg-neutral-800 flex-shrink-0 border border-neutral-700"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-[#1ed760] text-black font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                          Detected Playlist
                        </span>
                        <span className="text-[11px] text-neutral-400 font-medium">
                          by {detectedPlaylist.author}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white truncate mt-0.5">
                        {detectedPlaylist.title}
                      </h3>
                      <p className="text-xs text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                        <Music2 className="w-3 h-3" />
                        <span>{detectedPlaylist.tracks.length} Songs Detected</span>
                        {existingInLibraryCountInPlaylist > 0 && (
                          <span className="text-[11px] text-neutral-400 ml-1">
                            ({existingInLibraryCountInPlaylist} already in library)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Destination Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-neutral-300">
                      Import Destination
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPlaylistDestination('new-playlist')}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer flex flex-col justify-between ${
                          playlistDestination === 'new-playlist'
                            ? 'bg-neutral-800 border-[#1ed760] text-white shadow'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <FolderPlus className={`w-4 h-4 ${playlistDestination === 'new-playlist' ? 'text-[#1ed760]' : ''}`} />
                          {playlistDestination === 'new-playlist' && (
                            <span className="w-2 h-2 rounded-full bg-[#1ed760]"></span>
                          )}
                        </div>
                        <span className="text-xs font-bold">New Playlist</span>
                        <span className="text-[10px] text-neutral-400 mt-0.5">Create dedicated Nomatic playlist</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPlaylistDestination('existing-playlist')}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer flex flex-col justify-between ${
                          playlistDestination === 'existing-playlist'
                            ? 'bg-neutral-800 border-[#1ed760] text-white shadow'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <Layers className={`w-4 h-4 ${playlistDestination === 'existing-playlist' ? 'text-[#1ed760]' : ''}`} />
                          {playlistDestination === 'existing-playlist' && (
                            <span className="w-2 h-2 rounded-full bg-[#1ed760]"></span>
                          )}
                        </div>
                        <span className="text-xs font-bold">Existing Playlist</span>
                        <span className="text-[10px] text-neutral-400 mt-0.5">Add into an existing list</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPlaylistDestination('library-only')}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer flex flex-col justify-between ${
                          playlistDestination === 'library-only'
                            ? 'bg-neutral-800 border-[#1ed760] text-white shadow'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <Music2 className={`w-4 h-4 ${playlistDestination === 'library-only' ? 'text-[#1ed760]' : ''}`} />
                          {playlistDestination === 'library-only' && (
                            <span className="w-2 h-2 rounded-full bg-[#1ed760]"></span>
                          )}
                        </div>
                        <span className="text-xs font-bold">Library Only</span>
                        <span className="text-[10px] text-neutral-400 mt-0.5">Add to tracks collection</span>
                      </button>
                    </div>
                  </div>

                  {/* If creating a New Playlist: show customization fields */}
                  {playlistDestination === 'new-playlist' && (
                    <div className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-800 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Playlist Title
                        </label>
                        <input
                          type="text"
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          placeholder="Playlist name"
                          className="w-full bg-[#202020] border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-[#1ed760]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1">
                          Atmosphere & Gradient
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {PLAYLIST_GRADIENT_OPTIONS.map((opt) => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setNewPlaylistGradient(opt.value)}
                              className={`p-1.5 rounded-lg border text-left text-[11px] font-bold text-white transition cursor-pointer bg-gradient-to-r ${opt.value} ${
                                newPlaylistGradient === opt.value
                                  ? 'border-[#1ed760] ring-1 ring-[#1ed760]'
                                  : 'border-neutral-800 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <span className="truncate block drop-shadow">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* If adding to Existing Playlist */}
                  {playlistDestination === 'existing-playlist' && (
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Select Target Playlist
                      </label>
                      <select
                        value={targetPlaylist}
                        onChange={(e) => setTargetPlaylist(e.target.value)}
                        className="w-full bg-[#282828] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1ed760]"
                      >
                        {playlists.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.name} ({pl.trackIds.length} tracks)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Import Preferences */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                        Playback Mode
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPlaylistModePreference('audio')}
                          className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                            playlistModePreference === 'audio'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Headphones className="w-3 h-3" />
                          <span>Audio</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlaylistModePreference('video')}
                          className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                            playlistModePreference === 'video'
                              ? 'bg-red-600 text-white'
                              : 'bg-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Film className="w-3 h-3" />
                          <span>Video</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer pt-3">
                        <input
                          type="checkbox"
                          checked={filterPlaylistExistingInLibrary}
                          onChange={(e) => setFilterPlaylistExistingInLibrary(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#1ed760] cursor-pointer"
                        />
                        <span className="text-xs text-neutral-300 select-none">
                          Skip existing library songs
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Track List Preview and Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#1ed760]" />
                          <span>
                            Selected ({selectedPlaylistVideoIds.size} of {detectedPlaylist.tracks.length})
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleSelectAllPlaylistItems}
                          className="text-[11px] text-[#1ed760] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                        >
                          {selectedPlaylistVideoIds.size === detectedPlaylist.tracks.length ? (
                            <>
                              <Square className="w-3 h-3" />
                              <span>Deselect All</span>
                            </>
                          ) : (
                            <>
                              <CheckSquare className="w-3 h-3" />
                              <span>Select All</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Filter / Search within detected tracks */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={playlistSearchQuery}
                        onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                        placeholder="Search detected songs..."
                        className="w-full bg-[#202020] border border-neutral-700/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760]"
                      />
                    </div>

                    {/* Songs List */}
                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 p-1 bg-neutral-900/60 rounded-xl border border-neutral-800">
                      {filteredPlaylistTracks.map((item, idx) => {
                        const isSelected = selectedPlaylistVideoIds.has(item.videoId);
                        const isInLibrary = existingLibraryYouTubeIds.has(item.videoId);

                        return (
                          <div
                            key={item.videoId}
                            onClick={() => handleTogglePlaylistItem(item.videoId)}
                            className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition select-none ${
                              isSelected
                                ? 'bg-neutral-800/90 hover:bg-neutral-800'
                                : 'bg-transparent hover:bg-neutral-800/40 opacity-60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by row click
                              className="w-3.5 h-3.5 rounded accent-[#1ed760] cursor-pointer flex-shrink-0"
                            />
                            <span className="text-[11px] text-neutral-500 w-5 text-right font-mono flex-shrink-0">
                              {idx + 1}
                            </span>
                            <TrackThumbnail
                              src={item.thumbnail}
                              videoId={item.videoId}
                              alt={item.title}
                              className="w-8 h-8 rounded object-cover bg-neutral-800 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white truncate">
                                {item.title}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 truncate">
                                <span>{item.author}</span>
                                {isInLibrary && (
                                  <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1 rounded border border-neutral-700">
                                    In Library
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Playlist Import Button */}
                  <div className="pt-2">
                    <button
                      id="submit-import-playlist"
                      type="submit"
                      disabled={selectedPlaylistVideoIds.size === 0 || isImportingPlaylist}
                      title={`Import ${selectedPlaylistVideoIds.size} songs into ${
                        playlistDestination === 'new-playlist'
                          ? `"${newPlaylistName.trim() || detectedPlaylist.title}"`
                          : playlistDestination === 'existing-playlist'
                          ? 'selected playlist'
                          : 'Library'
                      }`}
                      className={`w-full h-11 px-5 rounded-full font-bold text-sm text-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg select-none ${
                        selectedPlaylistVideoIds.size > 0 && !isImportingPlaylist
                          ? 'bg-[#1ed760] hover:bg-[#1db954] active:scale-[0.99]'
                          : 'bg-neutral-600 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {isImportingPlaylist ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-black flex-shrink-0" />
                          <span className="truncate">Importing Songs...</span>
                        </>
                      ) : (
                        <>
                          <ListMusic className="w-4 h-4 stroke-[2.5] flex-shrink-0" />
                          <span className="truncate">
                            Import {selectedPlaylistVideoIds.size} Song{selectedPlaylistVideoIds.size === 1 ? '' : 's'}
                            {playlistDestination === 'new-playlist'
                              ? ' into New Playlist'
                              : playlistDestination === 'existing-playlist'
                              ? ' into Playlist'
                              : ' into Library'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: BULK URLS FORM */}
          {modalTab === 'bulk' && (
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              {/* Textarea for Bulk URLs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Paste Multiple YouTube Links
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkTextInput(SAMPLE_BULK_TEXT)}
                      className="text-[11px] text-[#1ed760] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Load Sample</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePasteClipboard('bulk')}
                      className="text-[11px] text-neutral-400 hover:text-white cursor-pointer flex items-center gap-1 bg-neutral-800 px-2 py-0.5 rounded"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>Paste</span>
                    </button>
                    {bulkTextInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setBulkTextInput('');
                          setExcludedIds(new Set());
                        }}
                        className="text-[11px] text-neutral-500 hover:text-red-400 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  id="bulk-urls-textarea"
                  rows={4}
                  value={bulkTextInput}
                  onChange={(e) => setBulkTextInput(e.target.value)}
                  placeholder={`Paste multiple YouTube links (one per line, comma, or space separated):\nhttps://www.youtube.com/watch?v=...\nhttps://youtu.be/...\nhttps://www.youtube.com/shorts/...`}
                  className="w-full bg-[#282828] border border-neutral-700 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760] transition font-mono leading-relaxed resize-none custom-scrollbar"
                />
              </div>

              {/* If user pasted a playlist URL in bulk tab, show quick trigger */}
              {bulkTextInput && extractYouTubePlaylistId(bulkTextInput) && (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <ListMusic className="w-4 h-4 flex-shrink-0" />
                    <span>YouTube Playlist link detected in your text!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const plId = extractYouTubePlaylistId(bulkTextInput);
                      if (plId) {
                        setModalTab('playlist');
                        setPlaylistUrlInput(bulkTextInput.trim());
                        handleDetectPlaylist(bulkTextInput.trim());
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-[#1ed760] text-black font-bold text-xs hover:bg-[#1db954] transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Extract Playlist</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Deduplication & Filter Options */}
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-[#1ed760]" />
                    Smart De-Duplication Engine
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    RFC & Video ID matching
                  </span>
                </div>

                {/* Filter Existing In Library Toggle */}
                <label className="flex items-center justify-between p-2 rounded-lg bg-[#202020] hover:bg-[#252525] transition cursor-pointer border border-neutral-800">
                  <div className="pr-3">
                    <p className="text-xs font-semibold text-white">Filter out links already in Library</p>
                    <p className="text-[10px] text-neutral-400">
                      Discards any URL matching songs you already have in Nomatic
                    </p>
                  </div>
                  <input
                    id="toggle-filter-library-duplicates"
                    type="checkbox"
                    checked={filterExistingInLibrary}
                    onChange={(e) => setFilterExistingInLibrary(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#1ed760] cursor-pointer"
                  />
                </label>

                {/* Live Real-time Parsing Statistics */}
                {bulkAnalysis.totalExtracted > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 bg-neutral-800/80 rounded-lg text-center border border-neutral-700/50">
                      <span className="text-sm font-extrabold text-neutral-200">
                        {bulkAnalysis.totalExtracted}
                      </span>
                      <p className="text-[10px] text-neutral-400 font-medium">URLs Found</p>
                    </div>

                    <div className="p-2 bg-amber-950/40 rounded-lg text-center border border-amber-800/40">
                      <span className="text-sm font-extrabold text-amber-400">
                        {totalDuplicatesFiltered}
                      </span>
                      <p className="text-[10px] text-amber-300 font-medium">Filtered Out</p>
                    </div>

                    <div className="p-2 bg-emerald-950/40 rounded-lg text-center border border-emerald-800/40">
                      <span className="text-sm font-extrabold text-[#1ed760]">
                        {bulkAnalysis.uniqueToImport.length}
                      </span>
                      <p className="text-[10px] text-emerald-300 font-medium">Ready to Add</p>
                    </div>
                  </div>
                )}

                {/* Detailed filtered duplicates accordion */}
                {totalDuplicatesFiltered > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowDuplicateDetails((prev) => !prev)}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>
                        {totalDuplicatesFiltered} duplicate link{totalDuplicatesFiltered > 1 ? 's' : ''} filtered out
                      </span>
                      {showDuplicateDetails ? (
                        <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                      )}
                    </button>

                    {showDuplicateDetails && (
                      <div className="mt-2 space-y-1 max-h-28 overflow-y-auto custom-scrollbar p-2 bg-[#121212] rounded-lg border border-neutral-800 text-[11px]">
                        {bulkAnalysis.internalDuplicates.map((item, idx) => (
                          <div key={`int-${item.videoId}-${idx}`} className="flex items-center justify-between text-neutral-400 py-0.5">
                            <span className="truncate max-w-[280px] font-mono text-neutral-300">
                              {item.videoId}
                            </span>
                            <span className="text-amber-400 text-[10px] px-1.5 py-0.2 bg-amber-950/60 rounded">
                              Duplicate in pasted list
                            </span>
                          </div>
                        ))}
                        {filterExistingInLibrary && bulkAnalysis.existingInLibrary.map((item, idx) => (
                          <div key={`lib-${item.videoId}-${idx}`} className="flex items-center justify-between text-neutral-400 py-0.5">
                            <span className="truncate max-w-[280px] font-mono text-neutral-300">
                              {item.videoId}
                            </span>
                            <span className="text-purple-400 text-[10px] px-1.5 py-0.2 bg-purple-950/60 rounded">
                              Already in Library
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Target Playlist & Playback Option */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Add Batch to Playlist
                  </label>
                  <select
                    id="bulk-target-playlist-select"
                    value={targetPlaylist}
                    onChange={(e) => setTargetPlaylist(e.target.value)}
                    className="w-full bg-[#282828] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1ed760]"
                  >
                    <option value="library-only">Library Only (No Playlist)</option>
                    {playlists.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Playback Mode
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModePreference('audio')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                        modePreference === 'audio'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Audio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModePreference('video')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                        modePreference === 'video'
                          ? 'bg-red-600 text-white'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Video</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Batch Tags */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Batch Tags (applied to all added tracks)
                </label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. Focus, Lofi, Gym, PlaylistImport"
                  className="w-full bg-[#282828] border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760]"
                />
              </div>

              {/* Unique Tracks Preview List */}
              {bulkAnalysis.uniqueToImport.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1ed760]" />
                      Tracks to be Added ({bulkAnalysis.uniqueToImport.length})
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      Click trash to exclude before import
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1.5 p-1">
                    {bulkAnalysis.uniqueToImport.map((item, idx) => (
                      <div
                        key={item.videoId}
                        className="flex items-center gap-3 p-2 bg-neutral-900 rounded-lg border border-neutral-800/80 hover:border-neutral-700 transition"
                      >
                        <span className="text-xs text-neutral-500 w-4 text-center font-mono">
                          {idx + 1}
                        </span>
                        <TrackThumbnail
                          videoId={item.videoId}
                          alt="Thumbnail"
                          className="w-10 h-7 rounded object-cover bg-neutral-800 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate font-mono">
                            {item.videoId}
                          </p>
                          <p className="text-[10px] text-neutral-400 truncate">
                            {item.cleanUrl}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleExcludeItem(item.videoId)}
                          className="text-neutral-500 hover:text-red-400 p-1 transition cursor-pointer"
                          title="Exclude this track"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notice when all links filtered out */}
              {bulkAnalysis.totalExtracted > 0 && bulkAnalysis.uniqueToImport.length === 0 && (
                <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 text-center space-y-1">
                  <p className="text-xs font-semibold text-amber-400 flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    All {bulkAnalysis.totalExtracted} links were duplicates!
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    They either appeared multiple times in your pasted text or are already present in your Nomatic library.
                  </p>
                </div>
              )}

              {/* Submit Bulk */}
              <div className="pt-2">
                <button
                  id="submit-bulk-tracks"
                  type="submit"
                  disabled={bulkAnalysis.uniqueToImport.length === 0 || isBulkImporting}
                  className={`w-full py-2.5 rounded-full font-bold text-sm text-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                    bulkAnalysis.uniqueToImport.length > 0 && !isBulkImporting
                      ? 'bg-[#1ed760] hover:bg-[#1db954] hover:scale-[1.01]'
                      : 'bg-neutral-600 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {isBulkImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Importing Tracks...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>
                        Import {bulkAnalysis.uniqueToImport.length} Unique Track
                        {bulkAnalysis.uniqueToImport.length === 1 ? '' : 's'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
