import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-banner"
      className="fixed bottom-24 left-6 z-50 flex items-center gap-2.5 rounded-full bg-amber-500/90 backdrop-blur-md px-4 py-2 text-xs font-semibold text-black shadow-lg border border-amber-300/40"
    >
      <WifiOff className="w-4 h-4" />
      <span>Offline Mode — Stored local configuration & cached media active</span>
    </div>
  );
};
