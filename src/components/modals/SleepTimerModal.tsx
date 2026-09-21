import React, { useState } from 'react';
import { Moon, Check, X, Clock, BellOff, Music, Timer } from 'lucide-react';
import { SleepTimerState } from '../../types';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sleepTimerState: SleepTimerState;
  onSetTimerDuration: (minutes: number) => void;
  onSetTimerEndOfTrack: () => void;
  onCancelTimer: () => void;
}

const PRESET_OPTIONS = [
  { minutes: 5, label: '5 minutes', desc: 'Short rest' },
  { minutes: 15, label: '15 minutes', desc: 'Power nap' },
  { minutes: 30, label: '30 minutes', desc: 'Wind down' },
  { minutes: 45, label: '45 minutes', desc: 'Falling asleep' },
  { minutes: 60, label: '1 hour', desc: 'Deep sleep' },
  { minutes: 90, label: '1.5 hours', desc: 'Full sleep cycle' },
];

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  onClose,
  sleepTimerState,
  onSetTimerDuration,
  onSetTimerEndOfTrack,
  onCancelTimer,
}) => {
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  if (!isOpen) return null;

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hrs}h ${remainingMins}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectPreset = (minutes: number) => {
    onSetTimerDuration(minutes);
    onClose();
  };

  const handleSelectEndOfTrack = () => {
    onSetTimerEndOfTrack();
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customMinutes, 10);
    if (!isNaN(val) && val > 0 && val <= 360) {
      onSetTimerDuration(val);
      onClose();
    }
  };

  const handleCancel = () => {
    onCancelTimer();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="sleep-timer-modal-card"
        className="w-full max-w-md rounded-2xl bg-[#181818] border border-neutral-800 p-5 sm:p-6 shadow-2xl text-white my-auto max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-[#1ed760]">
              <Moon className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">Sleep Timer</h2>
              <p className="text-xs text-neutral-400">Stop playback automatically</p>
            </div>
          </div>
          <button
            id="close-sleep-timer-modal"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Timer Banner */}
        {sleepTimerState.isActive && (
          <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-neutral-900 border border-[#1ed760]/40 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1ed760] animate-pulse" />
              <div>
                <span className="text-xs font-semibold text-[#1ed760] block">Timer Running</span>
                <span className="text-sm font-mono font-bold text-white">
                  {sleepTimerState.type === 'end_of_track'
                    ? 'At end of current track'
                    : `${formatRemaining(sleepTimerState.remainingSeconds)} remaining`}
                </span>
              </div>
            </div>

            <button
              id="cancel-active-sleep-timer-btn"
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 hover:text-white transition cursor-pointer border border-neutral-700/60"
            >
              <BellOff className="w-3.5 h-3.5 text-neutral-400" />
              <span>Turn off</span>
            </button>
          </div>
        )}

        {/* Options List */}
        <div className="mt-4 space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {PRESET_OPTIONS.map((opt) => {
            const isSelected = 
              sleepTimerState.isActive && 
              sleepTimerState.type === 'duration' && 
              sleepTimerState.durationMinutes === opt.minutes;

            return (
              <button
                key={opt.minutes}
                id={`sleep-timer-preset-${opt.minutes}`}
                onClick={() => handleSelectPreset(opt.minutes)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[#1ed760]/15 text-[#1ed760] border border-[#1ed760]/40'
                    : 'bg-neutral-800/40 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className={`w-4 h-4 ${isSelected ? 'text-[#1ed760]' : 'text-neutral-400'}`} />
                  <div>
                    <span className="text-sm font-medium block">{opt.label}</span>
                    <span className="text-[11px] text-neutral-400">{opt.desc}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#1ed760]" />}
              </button>
            );
          })}

          {/* End of Current Track Option */}
          <button
            id="sleep-timer-preset-end-of-track"
            onClick={handleSelectEndOfTrack}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition text-left cursor-pointer ${
              sleepTimerState.isActive && sleepTimerState.type === 'end_of_track'
                ? 'bg-[#1ed760]/15 text-[#1ed760] border border-[#1ed760]/40'
                : 'bg-neutral-800/40 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Music className={`w-4 h-4 ${sleepTimerState.isActive && sleepTimerState.type === 'end_of_track' ? 'text-[#1ed760]' : 'text-neutral-400'}`} />
              <div>
                <span className="text-sm font-medium block">End of current track</span>
                <span className="text-[11px] text-neutral-400">Stops after currently playing song</span>
              </div>
            </div>
            {sleepTimerState.isActive && sleepTimerState.type === 'end_of_track' && (
              <Check className="w-4 h-4 text-[#1ed760]" />
            )}
          </button>

          {/* Custom Duration Option */}
          <div className="pt-2">
            {!showCustomInput ? (
              <button
                id="sleep-timer-custom-toggle"
                onClick={() => setShowCustomInput(true)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-neutral-800/20 hover:bg-neutral-800/50 text-neutral-300 hover:text-white border border-dashed border-neutral-700 text-sm font-medium transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Timer className="w-4 h-4 text-neutral-400" />
                  <span>Custom minutes...</span>
                </div>
              </button>
            ) : (
              <form onSubmit={handleCustomSubmit} className="p-3 rounded-xl bg-neutral-850 border border-neutral-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="custom-timer-input" className="text-xs font-semibold text-neutral-300">
                    Set Custom Minutes (1 - 360)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="custom-timer-input"
                    type="number"
                    min="1"
                    max="360"
                    placeholder="e.g. 20"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    autoFocus
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#1ed760]"
                  />
                  <button
                    type="submit"
                    disabled={!customMinutes || parseInt(customMinutes, 10) <= 0}
                    className="px-4 py-2 rounded-lg bg-[#1ed760] hover:bg-[#1db954] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs transition cursor-pointer"
                  >
                    Set
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 flex-shrink-0">
          <span>Playback will automatically pause</span>
          {sleepTimerState.isActive && (
            <button
              onClick={handleCancel}
              className="text-red-400 hover:text-red-300 hover:underline cursor-pointer font-medium"
            >
              Turn off timer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
