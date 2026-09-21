import React, { useState } from 'react';
import { Download, Share2, Smartphone, X, Monitor, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { NomaticLogo } from './NomaticLogo';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running inside installed standalone PWA
  if (isInstalled) {
    return (
      <span 
        id="pwa-installed-badge"
        className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold"
        title="Running as installed Progressive Web App"
      >
        <CheckCircle2 className="w-3 h-3 text-[#1ed760]" />
        <span>PWA Installed</span>
      </span>
    );
  }

  const handleClick = () => {
    if (isInstallable) {
      install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        id="pwa-install-btn"
        onClick={handleClick}
        className={`flex items-center gap-1.5 rounded-full bg-[#1ed760] text-black font-bold shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs'
        }`}
        title="Install Nomatic Music player as a Progressive Web App for full-screen music playback"
      >
        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Install App</span>
      </button>

      {/* Universal PWA Install Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-[#1e1e1e] border border-neutral-700 p-5 sm:p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-700">
              <div className="flex items-center gap-2.5">
                <NomaticLogo size="sm" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Install Nomatic PWA</h3>
                  <p className="text-[11px] text-neutral-400">Play music in background & offline</p>
                </div>
              </div>
              <button
                id="close-pwa-guide-btn"
                onClick={() => setShowGuide(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-neutral-300">
              {isIOS ? (
                <>
                  <div className="p-3 bg-neutral-800/80 rounded-xl space-y-2 border border-neutral-700">
                    <div className="flex items-center gap-2 text-white font-semibold text-xs">
                      <Smartphone className="w-4 h-4 text-[#1ed760]" />
                      <span>iOS (Safari)</span>
                    </div>
                    <div className="space-y-1.5 pl-6 text-neutral-300">
                      <p>1. Tap the <strong className="text-white">Share</strong> button <Share2 className="inline w-3.5 h-3.5 text-blue-400" /> at the bottom of Safari.</p>
                      <p>2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.</p>
                      <p>3. Tap <strong className="text-[#1ed760]">Add</strong> to open Nomatic like a native app!</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Android / Chrome */}
                  <div className="p-3 bg-neutral-800/80 rounded-xl space-y-2 border border-neutral-700">
                    <div className="flex items-center gap-2 text-white font-semibold text-xs">
                      <Smartphone className="w-4 h-4 text-[#1ed760]" />
                      <span>Android / Mobile Browser</span>
                    </div>
                    <div className="space-y-1 pl-6 text-neutral-300">
                      <p>1. Tap the browser menu (<strong className="text-white">⋮</strong>) at the top or bottom right.</p>
                      <p>2. Tap <strong className="text-white">Install App</strong> or <strong className="text-white">Add to Home screen</strong>.</p>
                    </div>
                  </div>

                  {/* Desktop Chrome / Edge */}
                  <div className="p-3 bg-neutral-800/80 rounded-xl space-y-2 border border-neutral-700">
                    <div className="flex items-center gap-2 text-white font-semibold text-xs">
                      <Monitor className="w-4 h-4 text-[#1ed760]" />
                      <span>Desktop (Chrome / Edge / Brave)</span>
                    </div>
                    <div className="space-y-1 pl-6 text-neutral-300">
                      <p>1. Look for the install icon (<strong className="text-white">⊕</strong>) on the right side of the address bar.</p>
                      <p>2. Click <strong className="text-white">Install</strong> to run Nomatic as a desktop app.</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              {isInstallable && (
                <button
                  id="pwa-prompt-install-btn"
                  onClick={() => {
                    install();
                    setShowGuide(false);
                  }}
                  className="flex-1 rounded-full bg-[#1ed760] py-2 text-xs font-bold text-black hover:bg-[#1db954] transition cursor-pointer"
                >
                  Prompt Install Now
                </button>
              )}
              <button
                id="pwa-guide-dismiss-btn"
                onClick={() => setShowGuide(false)}
                className="flex-1 rounded-full bg-neutral-800 hover:bg-neutral-700 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

