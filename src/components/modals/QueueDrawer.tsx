import React from 'react';
import { X, Play, Music2, Trash2, Headphones } from 'lucide-react';
import { Track } from '../../types';
import { formatTime } from '../../utils/youtube';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  queueIndex: number;
  currentTrack: Track | null;
  onSelectTrackFromQueue: (index: number) => void;
  onClearQueue: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  queueIndex,
  currentTrack,
  onSelectTrackFromQueue,
  onClearQueue,
}) => {
  if (!isOpen) return null;

  const upNextTracks = queue.slice(queueIndex + 1);

  return (
    <aside 
      id="queue-drawer"
      className="fixed inset-0 z-50 bg-[#121212] flex flex-col h-full overflow-hidden select-none md:relative md:w-80 md:inset-auto md:z-auto md:border-l md:border-neutral-900"
    >
      {/* Header */}
      <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">Play Queue</span>
          <span className="text-xs text-neutral-400">({queue.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 1 && (
            <button
              onClick={onClearQueue}
              className="text-neutral-400 hover:text-red-400 p-1 rounded hover:bg-neutral-800 transition cursor-pointer"
              title="Clear Queue"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Currently Playing Track */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
            Now Playing
          </h4>
          {currentTrack ? (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-800/90 border border-neutral-700/80">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#1ed760] truncate">{currentTrack.title}</p>
                <p className="text-xs text-neutral-400 truncate">{currentTrack.artist}</p>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                {formatTime(currentTrack.duration)}
              </span>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 italic">No track currently playing</p>
          )}
        </div>

        {/* Up Next List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
            Up Next ({upNextTracks.length})
          </h4>
          {upNextTracks.length > 0 ? (
            <div className="space-y-1">
              {upNextTracks.map((track, i) => {
                const actualIndex = queueIndex + 1 + i;
                return (
                  <div
                    key={`${track.id}-${actualIndex}`}
                    onClick={() => onSelectTrackFromQueue(actualIndex)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800/80 transition cursor-pointer group"
                  >
                    <span className="text-xs text-neutral-500 w-4 text-center group-hover:hidden font-mono">
                      {i + 1}
                    </span>
                    <Play className="w-4 h-4 text-[#1ed760] hidden group-hover:block flex-shrink-0" />

                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-9 h-9 rounded object-cover flex-shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-[#1ed760]">
                        {track.title}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                    </div>

                    <span className="text-[11px] text-neutral-500 font-mono">
                      {formatTime(track.duration)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center text-xs text-neutral-500 space-y-1">
              <Headphones className="w-5 h-5 mx-auto text-neutral-600 mb-1" />
              <p>Queue is empty.</p>
              <p className="text-[11px] text-neutral-600">Add more YouTube tracks to keep the vibes going!</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
