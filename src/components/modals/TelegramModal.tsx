import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Check, 
  AlertCircle, 
  DownloadCloud, 
  Upload, 
  ExternalLink, 
  HelpCircle, 
  RefreshCw, 
  Play, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Radio, 
  MessageSquare,
  Bot,
  Copy
} from 'lucide-react';
import { TelegramConfig } from '../../types/telegram';
import { TelegramIcon } from '../common/TelegramNotification';
import { 
  testTelegramConnection, 
  sendTelegramMessage, 
  executeTelegramBackup, 
  saveTelegramConfig 
} from '../../utils/telegram';
import { Track, Playlist } from '../../types';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TelegramConfig;
  onUpdateConfig: (newConfig: TelegramConfig) => void;
  tracks: Track[];
  playlists: Playlist[];
  likedCount: number;
  isPolling: boolean;
  onReloadAllData?: () => void;
  onShowToast: (msg: string) => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  tracks,
  playlists,
  likedCount,
  isPolling,
  onReloadAllData,
  onShowToast,
}) => {
  const [tokenInput, setTokenInput] = useState(config.botToken || '');
  const [chatIdInput, setChatIdInput] = useState(config.chatId || '');
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showGuide, setShowGuide] = useState(!config.botToken);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setTokenInput(config.botToken || '');
    setChatIdInput(config.chatId || '');
  }, [config.botToken, config.chatId]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!tokenInput.trim()) {
      setTestResult({ ok: false, message: 'Please enter a Telegram Bot Token first' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    const res = await testTelegramConnection(tokenInput.trim());
    setIsTesting(false);

    if (res.ok && res.bot) {
      const updated: TelegramConfig = {
        ...config,
        botToken: tokenInput.trim(),
        botUsername: res.bot.username,
        botFirstName: res.bot.first_name,
        isEnabled: true,
      };
      onUpdateConfig(updated);
      saveTelegramConfig(updated);
      setTestResult({
        ok: true,
        message: `Connected successfully to @${res.bot.username} (${res.bot.first_name})!`,
      });
      onShowToast(`Connected to Telegram Bot: @${res.bot.username}`);
    } else {
      setTestResult({
        ok: false,
        message: res.error || 'Connection failed. Verify your token from @BotFather',
      });
    }
  };

  const handleSaveSettings = () => {
    const updated: TelegramConfig = {
      ...config,
      botToken: tokenInput.trim(),
      chatId: chatIdInput.trim(),
    };
    onUpdateConfig(updated);
    saveTelegramConfig(updated);
    onShowToast('Telegram configuration saved');
  };

  const handleManualBackup = async () => {
    if (!config.botToken || !config.chatId) {
      onShowToast('Please configure both Bot Token and Chat ID first');
      return;
    }

    setIsBackingUp(true);
    try {
      const res = await executeTelegramBackup(config.botToken, config.chatId);
      if (res.ok) {
        const updated: TelegramConfig = {
          ...config,
          lastBackupTimestamp: res.timestamp || Date.now(),
        };
        onUpdateConfig(updated);
        saveTelegramConfig(updated);
        onShowToast('Full music library backup sent to your Telegram chat! 💾');
      } else {
        onShowToast(`Backup error: ${res.error}`);
      }
    } catch (e: any) {
      onShowToast(`Failed to backup: ${e?.message || 'Error'}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!config.botToken || !config.chatId) {
      onShowToast('Configure and test your bot first');
      return;
    }

    const res = await sendTelegramMessage(
      config.botToken,
      config.chatId,
      `🎵 *Nomatic Music Connection Verified!*\n\n` +
      `Your Telegram bot is linked with Nomatic Web Player.\n` +
      `• *Tracks:* ${tracks.length}\n` +
      `• *Playlists:* ${playlists.length}\n\n` +
      `Try sending any YouTube link or YouTube playlist link right here!`,
      {
        parseMode: 'Markdown',
        replyMarkup: {
          inline_keyboard: [
            [{ text: '💾 Request Cloud Backup', callback_data: 'backup' }],
          ],
        },
      }
    );

    if (res.ok) {
      onShowToast('Test message sent to Telegram chat! Check your app.');
    } else {
      onShowToast(`Failed to send test message: ${res.error}`);
    }
  };

  const isConnected = !!(config.botToken && config.botUsername);
  const isFullyConfigured = !!(config.botToken && config.chatId && config.isEnabled);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#141414] border border-[#229ED9]/40 shadow-2xl text-white max-h-[92vh] overflow-y-auto custom-scrollbar flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-[#191919]/60 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <TelegramIcon className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Telegram Backup & Remote Sync</h2>
                {isFullyConfigured ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-950/90 text-[#1ed760] border border-[#1ed760]/40 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] animate-pulse" />
                    LIVE
                  </span>
                ) : isConnected ? (
                  <span className="text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-full">
                    AWAITING CHAT ID
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
                    DISCONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                Cloud backup to your chat & auto-play YouTube links sent to your Telegram bot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 flex-1">
          {/* Quick Status banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-neutral-900 to-neutral-900 border border-[#229ED9]/30 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#229ED9]" />
                How It Works
              </p>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Send any single song or playlist link in Telegram. The bot instantly provides 
                <strong className="text-white"> Play</strong> and <strong className="text-white"> Import</strong> buttons that load into this web app in real time!
              </p>
            </div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-2.5 py-1 text-[11px] font-semibold text-[#229ED9] hover:text-white bg-blue-950/60 hover:bg-blue-900/60 border border-[#229ED9]/40 rounded-lg transition cursor-pointer flex-shrink-0"
            >
              {showGuide ? 'Hide Guide' : 'Setup Guide'}
            </button>
          </div>

          {/* Setup Guide (Collapsible) */}
          {showGuide && (
            <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2.5 text-xs text-neutral-300">
              <h4 className="font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#229ED9]" />
                Quick 3-Step Setup (Takes 1 Minute)
              </h4>
              <ol className="space-y-2 list-decimal list-inside text-[11px] text-neutral-300 leading-relaxed">
                <li>
                  Open Telegram, search for <strong className="text-[#229ED9]">@BotFather</strong>, and send <code className="bg-black/60 px-1 py-0.5 rounded text-neutral-200">/newbot</code>.
                </li>
                <li>
                  Give your bot a name (e.g. <em>My Music Remote</em>) and a username (e.g. <em>nomatic_mymusic_bot</em>).
                </li>
                <li>
                  Copy the <strong className="text-white">HTTP API Token</strong> provided by BotFather, paste it into the field below, and click <strong className="text-white">Connect Bot</strong>!
                </li>
              </ol>
            </div>
          )}

          {/* Credentials Input */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-[#229ED9]" />
              Bot Credentials & Authentication
            </h3>

            {/* Bot Token */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>Telegram Bot API Token</span>
                <span className="text-[10px] text-neutral-500 font-normal">Stored locally in browser</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="e.g. 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                    className="w-full bg-[#1c1c1c] border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-[#229ED9]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={handleTestConnection}
                  className="px-3.5 py-2 bg-[#229ED9] hover:bg-[#2cb2f4] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Connect Bot</span>
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.ok
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      : 'bg-red-950/80 text-red-300 border border-red-800/60'
                  }`}
                >
                  {testResult.ok ? <Check className="w-4 h-4 text-[#1ed760]" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Chat ID Input with Auto-discovery indicator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300">
                  Target Chat ID / Saved Messages
                </label>
                <span className="text-[10px] text-[#229ED9] font-medium">
                  Auto-detects when you message the bot
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatIdInput}
                  onChange={(e) => setChatIdInput(e.target.value)}
                  placeholder="e.g. 123456789 (Discovered automatically)"
                  className="w-full bg-[#1c1c1c] border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-[#229ED9]"
                />
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl transition cursor-pointer flex-shrink-0"
                >
                  Save ID
                </button>
              </div>
              <p className="text-[11px] text-neutral-400">
                To auto-link your Chat ID, simply open your bot in Telegram and click <strong className="text-white">START</strong>.
              </p>
            </div>

            {/* Bot Profile Card when connected */}
            {config.botUsername && (
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#229ED9]/20 text-[#229ED9] flex items-center justify-center font-bold">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{config.botFirstName || 'Nomatic Bot'}</p>
                    <p className="text-[11px] text-[#229ED9]">@{config.botUsername}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendTestMessage}
                    className="px-2.5 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition cursor-pointer border border-neutral-700"
                  >
                    Send Test Msg
                  </button>
                  <a
                    href={`https://t.me/${config.botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-bold bg-[#229ED9] hover:bg-[#2cb2f4] text-white rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Bot</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Preferences / Toggles */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#1ed760]" />
              Remote Sync & Auto-Play Preferences
            </h3>

            {/* Enable Sync Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <div>
                <p className="text-xs font-semibold text-white">Enable Telegram Remote Listener</p>
                <p className="text-[11px] text-neutral-400">
                  Polls for YouTube links and commands sent to your bot
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={(e) => {
                    const updated = { ...config, isEnabled: e.target.checked };
                    onUpdateConfig(updated);
                    saveTelegramConfig(updated);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#229ED9]"></div>
              </label>
            </div>

            {/* Auto-Play Incoming Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800">
              <div>
                <p className="text-xs font-semibold text-white">Auto-Play Single YouTube Links</p>
                <p className="text-[11px] text-neutral-400">
                  Automatically start playing as soon as a YouTube link is sent to Telegram
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoPlayIncoming}
                  onChange={(e) => {
                    const updated = { ...config, autoPlayIncoming: e.target.checked };
                    onUpdateConfig(updated);
                    saveTelegramConfig(updated);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1ed760]"></div>
              </label>
            </div>

            {/* Smart Playlist vs Single Choice Info */}
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Smart Single Song vs Playlist Detection</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                When you share a link that has both a video ID and playlist ID (or a full playlist URL), your Telegram bot replies with interactive buttons asking:
                <span className="text-[#1ed760] font-medium"> "Play Single Track"</span> or <span className="text-[#229ED9] font-medium">"Import Entire Playlist"</span>.
              </p>
            </div>
          </div>

          {/* Cloud Backup to Telegram */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <DownloadCloud className="w-3.5 h-3.5 text-[#1ed760]" />
              Cloud Library Backup to Telegram
            </h3>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Backup to Telegram Cloud Storage</p>
                  <p className="text-[11px] text-neutral-400">
                    Sends full JSON backup file directly to your private Telegram chat
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#1ed760]">{tracks.length} tracks</span>
                  <p className="text-[10px] text-neutral-500">{playlists.length} playlists</p>
                </div>
              </div>

              {config.lastBackupTimestamp && (
                <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 bg-[#161616] p-2 rounded-lg border border-neutral-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1ed760]" />
                  <span>Last Telegram Backup: {new Date(config.lastBackupTimestamp).toLocaleString()}</span>
                </div>
              )}

              <button
                type="button"
                disabled={isBackingUp || !config.botToken || !config.chatId}
                onClick={handleManualBackup}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                {isBackingUp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Backup to Telegram...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-4 h-4" />
                    <span>Backup Entire Library to Telegram Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-[#161616] flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">
            {isPolling ? '🟢 Remote Listener Active' : '⚪ Remote Listener Idle'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
