import React from 'react';
import { 
  Play, 
  ListPlus, 
  Heart, 
  FolderPlus, 
  X, 
  DownloadCloud, 
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { TelegramIncomingItem } from '../../types/telegram';
import { TrackThumbnail } from './TrackThumbnail';

// Dedicated Telegram SVG Logo Icon
export const TelegramIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.61 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.98-1.73 6.64-2.88 7.97-3.44 3.8-1.59 4.59-1.86 5.1-1.87.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.13-.04.2z" />
  </svg>
);

interface TelegramNotificationProps {
  item: TelegramIncomingItem | null;
  onDismiss: () => void;
  onPlaySingle: (videoId: string) => void;
  onQueueSingle: (videoId: string) => void;
  onLikeSingle: (videoId: string) => void;
  onImportPlaylist: (playlistId: string) => void;
  onQueuePlaylist?: (playlistId: string) => void;
}

export const TelegramNotification: React.FC<TelegramNotificationProps> = ({
  item,
  onDismiss,
  onPlaySingle,
  onQueueSingle,
  onLikeSingle,
  onImportPlaylist,
  onQueuePlaylist,
}) => {
  if (!item) return null;

  const isMixed = item.type === 'mixed';
  const isPlaylist = item.type === 'playlist';
  const isSingle = item.type === 'single_track';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-[440px] animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="rounded-2xl bg-[#161616]/95 border border-[#229ED9]/40 shadow-2xl backdrop-blur-md p-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-md">
              <TelegramIcon className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#229ED9]">Telegram Remote</span>
                <span className="text-[10px] bg-blue-950/80 text-blue-300 border border-blue-800/60 px-1.5 py-0.2 rounded-full font-medium">
                  {item.senderUsername ? `@${item.senderUsername}` : item.senderName}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {isMixed
                  ? 'Sent YouTube link with video & playlist'
                  : isPlaylist
                  ? 'Sent a YouTube Playlist'
                  : 'Sent a YouTube Track'}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="mt-3 flex items-start gap-3">
          {item.metadata?.thumbnail ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-800 bg-neutral-900">
              <img
                src={item.metadata.thumbnail}
                alt={item.metadata.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0 text-neutral-400">
              <TelegramIcon className="w-6 h-6 fill-neutral-500" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight">
              {item.metadata?.title || item.rawText}
            </h4>
            {item.metadata?.author && (
              <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                {item.metadata.author}
              </p>
            )}
            <p className="text-[10px] text-neutral-500 truncate mt-0.5">
              {item.rawText}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3.5 pt-2.5 border-t border-neutral-800/80 flex flex-wrap gap-1.5">
          {/* Mixed Link (Video + Playlist) */}
          {isMixed && (
            <>
              <button
                onClick={() => onPlaySingle(item.videoId!)}
                className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1ed760] hover:bg-[#1fdf64] text-black font-bold text-xs transition cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Play Song</span>
              </button>

              <button
                onClick={() => onImportPlaylist(item.playlistId!)}
                className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#229ED9] hover:bg-[#2cb2f4] text-white font-bold text-xs transition cursor-pointer shadow-sm"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Import Playlist</span>
              </button>

              <button
                onClick={() => onQueueSingle(item.videoId!)}
                className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs transition cursor-pointer"
                title="Add song to queue"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>Queue</span>
              </button>
            </>
          )}

          {/* Playlist Only */}
          {isPlaylist && (
            <>
              <button
                onClick={() => onImportPlaylist(item.playlistId!)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1ed760] hover:bg-[#1fdf64] text-black font-bold text-xs transition cursor-pointer shadow-sm"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Import & Play Playlist</span>
              </button>

              {onQueuePlaylist && (
                <button
                  onClick={() => onQueuePlaylist(item.playlistId!)}
                  className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition cursor-pointer border border-neutral-700"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>Queue All</span>
                </button>
              )}
            </>
          )}

          {/* Single Video Only */}
          {isSingle && (
            <>
              <button
                onClick={() => onPlaySingle(item.videoId!)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1ed760] hover:bg-[#1fdf64] text-black font-bold text-xs transition cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Play Now</span>
              </button>

              <button
                onClick={() => onQueueSingle(item.videoId!)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition cursor-pointer border border-neutral-700"
              >
                <ListPlus className="w-3.5 h-3.5 text-[#1ed760]" />
                <span>Queue</span>
              </button>

              <button
                onClick={() => onLikeSingle(item.videoId!)}
                className="flex items-center justify-center p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-red-400 transition cursor-pointer border border-neutral-700"
                title="Add to Liked Songs"
              >
                <Heart className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface TelegramBackupNotificationProps {
  backup: {
    fileId: string;
    fileName: string;
    senderName: string;
  } | null;
  onDismiss: () => void;
  onRestore: () => void;
}

export const TelegramBackupNotification: React.FC<TelegramBackupNotificationProps> = ({
  backup,
  onDismiss,
  onRestore,
}) => {
  if (!backup) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-[420px] animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="rounded-2xl bg-[#181818]/95 border border-[#1ed760]/40 shadow-2xl backdrop-blur-md p-4 text-white">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#1ed760] text-black flex items-center justify-center font-bold">
              <DownloadCloud className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Telegram Backup File Received</h4>
              <p className="text-[11px] text-neutral-400">From {backup.senderName}</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 py-2 px-3 bg-neutral-900 rounded-xl border border-neutral-800">
          <p className="text-xs font-mono text-neutral-200 truncate">{backup.fileName}</p>
          <p className="text-[11px] text-neutral-400 mt-1">
            Would you like to restore your playlists, tracks, and settings from this file?
          </p>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={onRestore}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1ed760] hover:bg-[#1fdf64] text-black font-bold text-xs transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Restore Library Now</span>
          </button>
          <button
            onClick={onDismiss}
            className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition cursor-pointer"
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
};
