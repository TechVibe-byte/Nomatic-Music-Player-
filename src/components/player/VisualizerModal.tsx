import React from 'react';
import { X, Activity, Radio, Sparkles } from 'lucide-react';
import { Track } from '../../types';

interface VisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
}

export const VisualizerModal: React.FC<VisualizerModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
}) => {
  if (!isOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-6 select-none animate-fadeIn">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition cursor-pointer"
        title="Exit Visualizer"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="max-w-3xl w-full flex flex-col items-center text-center space-y-8">
        {/* Animated Glowing Album Artwork */}
        <div className="relative">
          <div
            className={`w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden border-4 border-neutral-800 shadow-[0_0_60px_rgba(30,215,96,0.3)] ${
              isPlaying ? 'animate-[spin_18s_linear_infinite]' : ''
            }`}
          >
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
            {/* Center vinyl hole */}
            <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#121212] border-4 border-neutral-700 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-[#1ed760]" />
            </div>
          </div>
        </div>

        {/* Track Title & Artist */}
        <div className="space-y-2 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {currentTrack.title}
          </h2>
          <p className="text-base font-semibold text-neutral-400">{currentTrack.artist}</p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
            <Radio className="w-3.5 h-3.5" /> High-Fidelity YouTube Audio Stream
          </span>
        </div>

        {/* Visualizer Spectrum Bars */}
        <div className="w-full h-28 flex items-end justify-center gap-1.5 sm:gap-2 px-8">
          {[
            30, 45, 60, 80, 95, 70, 50, 85, 100, 75, 45, 90, 65, 40, 80, 95,
            60, 40, 75, 90, 85, 55, 35, 70, 90, 60, 45, 80, 65, 30,
          ].map((val, idx) => (
            <div
              key={idx}
              className="flex-1 max-w-[14px] bg-gradient-to-t from-[#1db954] via-emerald-400 to-white rounded-t-md transition-all duration-150"
              style={{
                height: isPlaying ? `${Math.max(15, (val * ((idx % 4) + 1.2)) % 100)}%` : '10%',
                opacity: isPlaying ? 0.9 : 0.4,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
