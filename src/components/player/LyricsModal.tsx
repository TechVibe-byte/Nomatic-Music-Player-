import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic2, 
  Globe, 
  Edit3, 
  Save, 
  RotateCcw, 
  Check, 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  Volume2, 
  Languages,
  Sparkles
} from 'lucide-react';
import { Track } from '../../types';
import { TrackThumbnail } from '../common/TrackThumbnail';
import { 
  fetchLyricsForTrack, 
  saveCustomLyrics, 
  TrackLyrics, 
  LyricsLanguage, 
  LyricsLine,
  romanizeTelugu,
  hasTeluguScript
} from '../../utils/lyricsService';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  currentTime,
  duration,
  isPlaying,
  onSeek,
  onTogglePlay,
}) => {
  const [lyrics, setLyrics] = useState<TrackLyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<LyricsLanguage>('dual');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTextTelugu, setEditTextTelugu] = useState('');
  const [editTextEnglish, setEditTextEnglish] = useState('');
  const [isFullView, setIsFullView] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Load lyrics when track changes or modal opens
  useEffect(() => {
    if (!isOpen || !currentTrack) return;

    let isMounted = true;
    setLoading(true);

    fetchLyricsForTrack(currentTrack)
      .then((data) => {
        if (isMounted) {
          setLyrics(data);
          // Set initial language smart default
          if (data.hasTelugu && data.hasEnglish) {
            setLanguage('dual');
          } else if (data.hasTelugu) {
            setLanguage('telugu');
          } else {
            setLanguage('english');
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load lyrics', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentTrack?.id]);

  // Find active line index for synchronized lyrics
  const activeIndex = React.useMemo(() => {
    if (!lyrics || !lyrics.isSynced || lyrics.lines.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.lines.length; i++) {
      const lineTime = lyrics.lines[i].time ?? 0;
      if (currentTime >= lineTime) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lyrics, currentTime]);

  // Auto-scroll to active line
  useEffect(() => {
    if (!autoScroll || activeIndex === -1 || !activeLineRef.current || !scrollContainerRef.current) return;
    activeLineRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [activeIndex, autoScroll]);

  // Handle saving custom edited lyrics
  const handleSaveCustomLyrics = () => {
    if (!currentTrack || !lyrics) return;

    const teluguLines = editTextTelugu.split('\n').map((l) => l.trim());
    const englishLines = editTextEnglish.split('\n').map((l) => l.trim());
    const maxLen = Math.max(teluguLines.length, englishLines.length);

    const newLines: LyricsLine[] = [];
    for (let i = 0; i < maxLen; i++) {
      const t = teluguLines[i] || '';
      const e = englishLines[i] || (t ? romanizeTelugu(t) : '');
      if (t || e) {
        newLines.push({
          telugu: t || undefined,
          english: e || undefined,
        });
      }
    }

    const customLyrics: TrackLyrics = {
      ...lyrics,
      lines: newLines,
      hasTelugu: newLines.some((l) => !!l.telugu),
      hasEnglish: newLines.some((l) => !!l.english),
      source: 'custom',
    };

    saveCustomLyrics(currentTrack.id, customLyrics);
    setLyrics(customLyrics);
    setIsEditing(false);
  };

  const startEditing = () => {
    if (!lyrics) return;
    setEditTextTelugu(lyrics.lines.map((l) => l.telugu || '').join('\n'));
    setEditTextEnglish(lyrics.lines.map((l) => l.english || '').join('\n'));
    setIsEditing(true);
  };

  if (!isOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col animate-fadeIn overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-16 px-4 sm:px-8 border-b border-white/10 flex items-center justify-between gap-4 bg-neutral-950/70 z-10 flex-shrink-0">
        {/* Left: Track Details */}
        <div className="flex items-center gap-3 min-w-0 max-w-sm sm:max-w-md">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800 shadow-md">
            <TrackThumbnail
              src={currentTrack.thumbnail}
              videoId={currentTrack.youtubeId}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white text-sm font-bold truncate leading-tight">
                {currentTrack.title}
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                <Mic2 className="w-3 h-3" />
                Live Lyrics
              </span>
            </div>
            <p className="text-xs text-neutral-400 truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Center: Language Switcher Tabs (English / తెలుగు / Dual) */}
        <div className="flex items-center bg-neutral-900 border border-neutral-700/80 p-1 rounded-full text-xs font-semibold shadow-inner">
          <button
            onClick={() => setLanguage('english')}
            className={`px-3 py-1 rounded-full transition cursor-pointer ${
              language === 'english'
                ? 'bg-[#1ed760] text-black font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Display lyrics in English / Romanized script"
          >
            English
          </button>
          <button
            onClick={() => setLanguage('telugu')}
            className={`px-3 py-1 rounded-full transition cursor-pointer ${
              language === 'telugu'
                ? 'bg-[#1ed760] text-black font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="సాహిత్యం తెలుగు లిపిలో వీక్షించండి (Telugu Script)"
          >
            తెలుగు
          </button>
          <button
            onClick={() => setLanguage('dual')}
            className={`px-3 py-1 rounded-full transition cursor-pointer ${
              language === 'dual'
                ? 'bg-[#1ed760] text-black font-bold shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Show both English and Telugu side-by-side"
          >
            Dual (Both)
          </button>
        </div>

        {/* Right: Controls & Close */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Font Size Adjuster */}
          <div className="hidden md:flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setFontSize('normal')}
              className={`px-2 py-1 rounded ${fontSize === 'normal' ? 'bg-white/20 text-white' : 'text-neutral-400'}`}
              title="Normal font size"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-1 rounded font-bold ${fontSize === 'large' ? 'bg-white/20 text-white' : 'text-neutral-400'}`}
              title="Large font size"
            >
              A+
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              className={`px-2 py-1 rounded font-extrabold ${fontSize === 'xlarge' ? 'bg-white/20 text-white' : 'text-neutral-400'}`}
              title="Extra large font size"
            >
              A++
            </button>
          </div>

          {/* Edit Lyrics Toggle */}
          <button
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
              } else {
                startEditing();
              }
            }}
            className={`p-2 rounded-full border transition cursor-pointer ${
              isEditing
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title={isEditing ? 'Cancel editing' : 'Add or edit custom lyrics for this track'}
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Close Lyrics Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
            title="Disable & Close Lyrics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 sm:py-16 max-w-4xl mx-auto w-full select-text"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Mic2 className="w-12 h-12 text-[#1ed760] animate-pulse" />
            <p className="text-neutral-400 text-sm font-medium">Fetching English & Telugu lyrics...</p>
          </div>
        ) : isEditing ? (
          /* Editing Panel */
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <Edit3 className="w-4 h-4 text-[#1ed760]" />
                <span>Custom Lyrics Editor (English & Telugu)</span>
              </div>
              <span className="text-xs text-neutral-400">Separate verses with line breaks</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  Telugu Script (తెలుగు సాహిత్యం)
                </label>
                <textarea
                  value={editTextTelugu}
                  onChange={(e) => setEditTextTelugu(e.target.value)}
                  placeholder="ఇక్కడ తెలుగు సాహిత్యం నమోదు చేయండి..."
                  rows={14}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white font-sans focus:outline-none focus:border-[#1ed760] focus:ring-1 focus:ring-[#1ed760]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  English / Romanized Script
                </label>
                <textarea
                  value={editTextEnglish}
                  onChange={(e) => setEditTextEnglish(e.target.value)}
                  placeholder="Paste or type English / Romanized lyrics here..."
                  rows={14}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-white font-sans focus:outline-none focus:border-[#1ed760] focus:ring-1 focus:ring-[#1ed760]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  // Auto-romanize Telugu into English textarea
                  if (editTextTelugu) {
                    const lines = editTextTelugu.split('\n');
                    const romanized = lines.map((l) => romanizeTelugu(l)).join('\n');
                    setEditTextEnglish(romanized);
                  }
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-generate English Transliteration from Telugu</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomLyrics}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1ed760] text-black hover:bg-[#1ed760]/90 flex items-center gap-1.5 shadow-lg"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Lyrics</span>
                </button>
              </div>
            </div>
          </div>
        ) : lyrics && lyrics.lines.length > 0 ? (
          /* Lyrics Display */
          <div className="space-y-6 sm:space-y-8 text-center pb-24">
            {lyrics.isSynced && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800 inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1ed760] animate-pulse" />
                  Synchronized with song playback • Tap any line to jump
                </span>
              </div>
            )}

            {lyrics.lines.map((line, idx) => {
              const isActive = lyrics.isSynced && idx === activeIndex;
              const isPast = lyrics.isSynced && activeIndex !== -1 && idx < activeIndex;

              const fontClass =
                fontSize === 'xlarge'
                  ? 'text-2xl sm:text-4xl'
                  : fontSize === 'large'
                  ? 'text-xl sm:text-3xl'
                  : 'text-base sm:text-2xl';

              // Determine lines to show based on selected language
              const showTelugu = (language === 'telugu' || language === 'dual') && !!line.telugu;
              const showEnglish = (language === 'english' || language === 'dual') && (!!line.english || !line.telugu);

              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => {
                    if (line.time !== undefined) {
                      onSeek(line.time);
                    }
                  }}
                  className={`transition-all duration-300 cursor-pointer rounded-2xl p-3 sm:p-4 group ${
                    isActive
                      ? 'scale-105 bg-white/10 text-white font-extrabold shadow-2xl backdrop-blur-md'
                      : isPast
                      ? 'text-neutral-500 opacity-60 hover:opacity-100 hover:text-neutral-300'
                      : 'text-neutral-400 hover:text-neutral-100 hover:scale-102'
                  }`}
                >
                  {/* Telugu Line */}
                  {showTelugu && (
                    <div
                      className={`leading-relaxed tracking-wide transition-colors ${fontClass} ${
                        isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                      }`}
                    >
                      {line.telugu}
                    </div>
                  )}

                  {/* English / Romanized Line */}
                  {showEnglish && (
                    <div
                      className={`leading-relaxed transition-colors ${
                        language === 'dual' && showTelugu
                          ? 'text-xs sm:text-base text-emerald-400 font-medium mt-1 font-mono tracking-wide'
                          : fontClass
                      } ${isActive && language !== 'dual' ? 'text-white' : ''}`}
                    >
                      {line.english || (line.telugu ? romanizeTelugu(line.telugu) : '')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Lyrics Fallback */
          <div className="py-20 text-center space-y-4 max-w-md mx-auto">
            <Mic2 className="w-16 h-16 text-neutral-600 mx-auto" />
            <h3 className="text-xl font-bold text-white">No lyrics available for this song</h3>
            <p className="text-sm text-neutral-400">
              You can easily paste or add your own English and Telugu lyrics using the editor below!
            </p>
            <button
              onClick={startEditing}
              className="px-5 py-2.5 rounded-full bg-[#1ed760] text-black font-bold text-xs hover:scale-105 transition shadow-lg cursor-pointer inline-flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Add English & Telugu Lyrics</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Floating Scrubber & Play Bar */}
      <div className="h-16 px-4 sm:px-8 border-t border-white/10 bg-neutral-950/80 backdrop-blur-md flex items-center justify-between gap-4 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current text-black" />
            ) : (
              <Play className="w-5 h-5 fill-current text-black translate-x-0.5" />
            )}
          </button>
          <div className="text-xs text-neutral-400 font-mono hidden sm:block">
            {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')} /{' '}
            {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}
          </div>
        </div>

        {/* Auto-Scroll Toggle Switch */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
              autoScroll
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-500 hover:text-neutral-400'
            }`}
            title="Toggle automatic scrolling with song playback"
          >
            <span className={`w-2 h-2 rounded-full ${autoScroll ? 'bg-[#1ed760]' : 'bg-neutral-600'}`} />
            <span>Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
