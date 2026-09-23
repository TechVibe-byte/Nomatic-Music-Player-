import React, { useState } from 'react';
import { 
  X, 
  HardDrive, 
  Download, 
  Upload, 
  RotateCcw, 
  Headphones, 
  Film, 
  Check, 
  Sparkles, 
  Sliders, 
  Sun, 
  Radio
} from 'lucide-react';
import { AppConfig, Track, Playlist } from '../../types';
import { 
  exportLocalConfigJSON, 
  importLocalConfigJSON 
} from '../../utils/storage';
import { TelegramIcon } from '../common/TelegramNotification';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  tracks: Track[];
  playlists: Playlist[];
  likedCount: number;
  onResetLibrary: () => void;
  onReloadAllData: () => void;
  onOpenTelegramModal?: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  tracks,
  playlists,
  likedCount,
  onResetLibrary,
  onReloadAllData,
  onOpenTelegramModal,
}) => {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copiedExport, setCopiedExport] = useState(false);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const json = exportLocalConfigJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotflow_local_cfg_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyConfig = () => {
    const json = exportLocalConfigJSON();
    navigator.clipboard.writeText(json);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importLocalConfigJSON(content);
        if (success) {
          setImportStatus('success');
          onReloadAllData();
          setTimeout(() => setImportStatus('idle'), 3000);
        } else {
          setImportStatus('error');
          setTimeout(() => setImportStatus('idle'), 3000);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#181818] border border-neutral-800 p-4 sm:p-6 shadow-2xl text-white max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#1ed760] flex items-center justify-center font-bold">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Local Configuration & Storage</h2>
              <p className="text-xs text-neutral-400">Manage client-side configuration, preferences & backup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Storage Statistics Card */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 grid grid-cols-3 gap-3 text-center">
            <div className="p-2 bg-[#121212] rounded-lg border border-neutral-800/80">
              <span className="text-xl font-extrabold text-[#1ed760]">{tracks.length}</span>
              <p className="text-[11px] text-neutral-400 font-medium mt-0.5">Stored Tracks</p>
            </div>
            <div className="p-2 bg-[#121212] rounded-lg border border-neutral-800/80">
              <span className="text-xl font-extrabold text-white">{playlists.length}</span>
              <p className="text-[11px] text-neutral-400 font-medium mt-0.5">Playlists</p>
            </div>
            <div className="p-2 bg-[#121212] rounded-lg border border-neutral-800/80">
              <span className="text-xl font-extrabold text-purple-400">{likedCount}</span>
              <p className="text-[11px] text-neutral-400 font-medium mt-0.5">Liked Songs</p>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#1ed760]" />
              Playback & Engine Configuration
            </h3>

            {/* Default Playback Mode */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <div>
                <p className="text-xs font-semibold text-white">Default Playback Option</p>
                <p className="text-[11px] text-neutral-400">Audio-Only saves bandwidth & plays in background</p>
              </div>
              <div className="flex items-center gap-1 bg-[#181818] p-1 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ ...config, playbackMode: 'audio' })}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${
                    config.playbackMode === 'audio'
                      ? 'bg-[#1ed760] text-black shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Headphones className="w-3 h-3" /> Audio
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ ...config, playbackMode: 'video' })}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${
                    config.playbackMode === 'video'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Film className="w-3 h-3" /> Video
                </button>
              </div>
            </div>

            {/* Background Playback & MediaSession Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <div>
                <p className="text-xs font-semibold text-white">Lock-Screen & Background Audio</p>
                <p className="text-[11px] text-neutral-400">AudioContext keep-alive and tab-switch auto-revival</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.backgroundAudioEnabled}
                  onChange={(e) => onUpdateConfig({ ...config, backgroundAudioEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1ed760]"></div>
              </label>
            </div>

            {/* Screen Wake Lock */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <div>
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Screen Wake Lock
                </p>
                <p className="text-[11px] text-neutral-400">Keep screen awake while listening to music or study beats</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!config.wakeLockEnabled}
                  onChange={(e) => onUpdateConfig({ ...config, wakeLockEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1ed760]"></div>
              </label>
            </div>

            {/* Background Playback Guide Info Card */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-neutral-300 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Radio className="w-4 h-4" />
                <span>Background Audio Capabilities</span>
              </div>
              <p className="text-[11px] text-neutral-300/90 leading-relaxed">
                Nomatic Music player uses a 3-tier background audio architecture: Web Audio API heartbeat, MediaSession lock-screen controls, and Picture-in-Picture floating player mode. You can freely switch browser tabs, minimize your window, or lock your screen.
              </p>
            </div>

            {/* Auto Play Next */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <div>
                <p className="text-xs font-semibold text-white">Autoplay Next Track</p>
                <p className="text-[11px] text-neutral-400">Automatically advance to the next song in queue</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoPlayNext}
                  onChange={(e) => onUpdateConfig({ ...config, autoPlayNext: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1ed760]"></div>
              </label>
            </div>
          </div>

          {/* Backup & Restore Configuration */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-[#1ed760]" />
              Config Backup & Portability
            </h3>

            {/* Telegram Cloud Backup Link */}
            {onOpenTelegramModal && (
              <div className="p-3 bg-gradient-to-r from-blue-950/40 via-neutral-900 to-neutral-900 rounded-xl border border-[#229ED9]/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#229ED9] text-white flex items-center justify-center flex-shrink-0 shadow">
                    <TelegramIcon className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Telegram Cloud Backup & Remote</p>
                    <p className="text-[11px] text-neutral-400">Push library backups & stream songs from your Telegram bot</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTelegramModal();
                  }}
                  className="px-3 py-1.5 bg-[#229ED9] hover:bg-[#2cb2f4] text-white font-bold text-xs rounded-lg transition cursor-pointer flex-shrink-0"
                >
                  Configure
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportJSON}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition cursor-pointer border border-neutral-700"
              >
                <Download className="w-4 h-4 text-[#1ed760]" />
                <span>Download JSON Backup</span>
              </button>

              <button
                onClick={handleCopyConfig}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition cursor-pointer border border-neutral-700"
              >
                {copiedExport ? (
                  <>
                    <Check className="w-4 h-4 text-[#1ed760]" />
                    <span className="text-[#1ed760]">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Copy Config JSON</span>
                  </>
                )}
              </button>
            </div>

            {/* Import Local Config JSON */}
            <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  Restore / Import Config File
                </span>
                {importStatus === 'success' && (
                  <span className="text-xs text-[#1ed760] font-bold">Successfully Restored!</span>
                )}
                {importStatus === 'error' && (
                  <span className="text-xs text-red-400 font-bold">Invalid JSON Format</span>
                )}
              </div>
              <label className="block w-full text-center py-2 border-2 border-dashed border-neutral-700 hover:border-neutral-500 rounded-lg cursor-pointer text-xs text-neutral-400 hover:text-white transition bg-[#181818]">
                <span>Click to browse .json file</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Danger / Reset zone */}
          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-[11px] text-neutral-500">Restore factory sample playlists & tracks</span>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset your local library to the default curated tracks?')) {
                  onResetLibrary();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Sample Library</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
