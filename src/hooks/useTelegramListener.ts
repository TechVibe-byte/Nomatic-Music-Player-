import { useState, useEffect, useRef, useCallback } from 'react';
import { TelegramConfig, TelegramIncomingItem, TelegramUpdate } from '../types/telegram';
import { Track, Playlist } from '../types';
import {
  sendTelegramMessage,
  answerTelegramCallback,
  executeTelegramBackup,
  fetchTelegramFileContent,
  parseTelegramMessageForYouTube,
  saveTelegramConfig,
} from '../utils/telegram';
import { fetchYouTubeMetadata, getYouTubeThumbnail } from '../utils/youtube';
import { fetchYouTubePlaylist, convertPlaylistItemsToTracks } from '../utils/youtubePlaylist';
import { importLocalConfigJSON } from '../utils/storage';

interface UseTelegramListenerProps {
  config: TelegramConfig;
  onUpdateConfig: (newConfig: TelegramConfig) => void;
  tracks: Track[];
  onAddTrack: (track: Track) => void;
  onPlayTrack: (track: Track, newQueue?: Track[]) => void;
  onAddToQueue: (track: Track) => void;
  onAddTracksToQueue: (tracks: Track[]) => void;
  onImportPlaylist: (playlist: Playlist, newTracks: Track[]) => void;
  onToggleLike: (trackId: string) => void;
  likedTrackIds: string[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onShowToast: (msg: string) => void;
  onReloadAllData?: () => void;
}

export function useTelegramListener({
  config,
  onUpdateConfig,
  tracks,
  onAddTrack,
  onPlayTrack,
  onAddToQueue,
  onAddTracksToQueue,
  onImportPlaylist,
  onToggleLike,
  likedTrackIds,
  currentTrack,
  isPlaying,
  onShowToast,
  onReloadAllData,
}: UseTelegramListenerProps) {
  const [incomingPrompt, setIncomingPrompt] = useState<TelegramIncomingItem | null>(null);
  const [incomingBackup, setIncomingBackup] = useState<{
    fileId: string;
    fileName: string;
    senderName: string;
  } | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<number | null>(null);

  // Keep ref of latest state to prevent stale closures inside polling interval
  const stateRef = useRef({
    config,
    tracks,
    currentTrack,
    isPlaying,
    likedTrackIds,
  });

  useEffect(() => {
    stateRef.current = {
      config,
      tracks,
      currentTrack,
      isPlaying,
      likedTrackIds,
    };
  }, [config, tracks, currentTrack, isPlaying, likedTrackIds]);

  const offsetRef = useRef<number>(config.lastUpdateId || 0);

  // Helper to convert videoId & metadata into full Track
  const getOrCreateTrack = useCallback(async (videoId: string): Promise<Track> => {
    const existing = stateRef.current.tracks.find((t) => t.youtubeId === videoId);
    if (existing) return existing;

    const meta = await fetchYouTubeMetadata(videoId);
    const newTrack: Track = {
      id: `tg-${videoId}-${Date.now()}`,
      youtubeId: videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title: meta.title,
      artist: meta.author,
      thumbnail: meta.thumbnail || getYouTubeThumbnail(videoId),
      duration: 0,
      addedAt: Date.now(),
      modePreference: 'audio',
    };
    onAddTrack(newTrack);
    return newTrack;
  }, [onAddTrack]);

  // Handler to import full playlist from Telegram link or button
  const handleImportPlaylistFromTelegram = useCallback(async (playlistId: string, autoPlay: boolean = true) => {
    try {
      onShowToast('Fetching YouTube playlist from Telegram...');
      const plData = await fetchYouTubePlaylist(playlistId);
      if (!plData || !plData.tracks || plData.tracks.length === 0) {
        onShowToast('No playable tracks found in this YouTube playlist');
        return;
      }

      const newTracks = convertPlaylistItemsToTracks(plData.tracks);
      const newPlaylist: Playlist = {
        id: `pl-tg-${playlistId}-${Date.now()}`,
        name: plData.title || `Telegram Playlist (${plData.tracks.length} songs)`,
        description: plData.description || `Imported via Telegram Bot on ${new Date().toLocaleDateString()}`,
        trackIds: newTracks.map((t) => t.id),
        coverUrl: plData.thumbnail || newTracks[0]?.thumbnail,
        gradient: 'from-blue-600 to-indigo-900',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isCustom: true,
        youtubePlaylistId: playlistId,
        lastSyncedAt: Date.now(),
        autoSync: true,
      };

      onImportPlaylist(newPlaylist, newTracks);
      onShowToast(`Imported "${newPlaylist.name}" (${newTracks.length} tracks)!`);

      if (autoPlay && newTracks.length > 0) {
        onPlayTrack(newTracks[0], newTracks);
      }

      // Dismiss any open banner
      setIncomingPrompt(null);
    } catch (err: any) {
      onShowToast(`Failed to import playlist: ${err?.message || 'Error'}`);
    }
  }, [onShowToast, onImportPlaylist, onPlayTrack]);

  // Main polling routine
  useEffect(() => {
    const token = config.botToken?.trim();
    if (!config.isEnabled || !token) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    let isCancelled = false;
    let timeoutId: any = null;

    const poll = async () => {
      if (isCancelled) return;

      try {
        const currentOffset = offsetRef.current;
        const res = await fetch(
          `https://api.telegram.org/bot${token}/getUpdates?offset=${currentOffset}&limit=10&timeout=2`
        );
        const data = await res.json();

        if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
          const updates: TelegramUpdate[] = data.result;

          for (const update of updates) {
            // Update offset to acknowledge processed items
            if (update.update_id >= offsetRef.current) {
              offsetRef.current = update.update_id + 1;
              const updatedConfig = {
                ...stateRef.current.config,
                lastUpdateId: offsetRef.current,
              };
              onUpdateConfig(updatedConfig);
              saveTelegramConfig(updatedConfig);
            }

            // 1. Auto-discover Chat ID if not set
            const msgChatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
            if (msgChatId && !stateRef.current.config.chatId) {
              const newChatId = String(msgChatId);
              const updatedConfig = {
                ...stateRef.current.config,
                chatId: newChatId,
                lastUpdateId: offsetRef.current,
              };
              onUpdateConfig(updatedConfig);
              saveTelegramConfig(updatedConfig);
              onShowToast(`Linked Telegram Chat ID: ${newChatId}`);

              // Welcome message in Telegram
              await sendTelegramMessage(
                token,
                newChatId,
                `🎉 *Nomatic Web Player Connected!*\n\n` +
                `Send any YouTube song or playlist link here, and it will load directly into your Nomatic web app.\n\n` +
                `Commands:\n• /backup - Download full library backup\n• /nowplaying - Check current song\n• /help - Instructions`,
                { parseMode: 'Markdown' }
              );
            }

            // 2. Handle Inline Button Callback Queries
            if (update.callback_query) {
              const cq = update.callback_query;
              const cqData = cq.data || '';
              const cqChatId = cq.message?.chat?.id || stateRef.current.config.chatId;

              if (cqData.startsWith('play:')) {
                const vid = cqData.replace('play:', '');
                await answerTelegramCallback(token, cq.id, '▶️ Playing in Nomatic!');
                const track = await getOrCreateTrack(vid);
                onPlayTrack(track);
                onShowToast(`▶️ Telegram Remote: Playing "${track.title}"`);
                setIncomingPrompt(null);
              } else if (cqData.startsWith('queue:')) {
                const vid = cqData.replace('queue:', '');
                await answerTelegramCallback(token, cq.id, '➕ Added to Queue!');
                const track = await getOrCreateTrack(vid);
                onAddToQueue(track);
                onShowToast(`➕ Added "${track.title}" to Queue`);
                setIncomingPrompt(null);
              } else if (cqData.startsWith('like:')) {
                const vid = cqData.replace('like:', '');
                await answerTelegramCallback(token, cq.id, '❤️ Saved to Liked Songs!');
                const track = await getOrCreateTrack(vid);
                onToggleLike(track.id);
                onShowToast(`❤️ Liked "${track.title}" from Telegram`);
              } else if (cqData.startsWith('playlist:')) {
                const plId = cqData.replace('playlist:', '');
                await answerTelegramCallback(token, cq.id, '📑 Importing Playlist...');
                await handleImportPlaylistFromTelegram(plId, true);
              } else if (cqData.startsWith('queue_playlist:')) {
                const plId = cqData.replace('queue_playlist:', '');
                await answerTelegramCallback(token, cq.id, '➕ Queueing Playlist...');
                const plData = await fetchYouTubePlaylist(plId);
                if (plData && plData.tracks) {
                  const tracksToAdd = convertPlaylistItemsToTracks(plData.tracks);
                  onAddTracksToQueue(tracksToAdd);
                  onShowToast(`➕ Queued ${tracksToAdd.length} songs from Telegram playlist`);
                }
                setIncomingPrompt(null);
              }
              continue;
            }

            // 3. Handle Regular Message
            const msg = update.message;
            if (!msg) continue;

            const text = (msg.text || msg.caption || '').trim();
            const senderName = msg.from?.first_name || 'Telegram User';
            const chatId = msg.chat?.id;

            // Handle Document file (Backup Restore)
            if (msg.document && msg.document.file_name?.endsWith('.json')) {
              setIncomingBackup({
                fileId: msg.document.file_id,
                fileName: msg.document.file_name,
                senderName,
              });
              onShowToast(`Received backup file from Telegram: ${msg.document.file_name}`);
              continue;
            }

            if (!text) continue;

            // Handle Commands
            const parsed = parseTelegramMessageForYouTube(text);

            if (parsed.type === 'command') {
              const cmd = parsed.command?.toLowerCase();
              if (cmd === '/start' || cmd === '/help') {
                await sendTelegramMessage(
                  token,
                  chatId,
                  `👋 *Hello, ${senderName}!*\n\n` +
                  `I am your *Nomatic Music Remote Bot*.\n\n` +
                  `🎵 *How to use:* Paste any YouTube link here!\n` +
                  `• Single Video -> I will offer Play, Queue, and Like buttons.\n` +
                  `• Playlist URL -> I will ask if you want the single song or full playlist.\n` +
                  `• /backup -> Download instant backup of your playlists\n` +
                  `• /nowplaying -> View current playing track\n` +
                  `• /status -> Check connection`,
                  { parseMode: 'Markdown' }
                );
              } else if (cmd === '/backup') {
                await sendTelegramMessage(token, chatId, '⏳ Generating library backup...');
                const backupRes = await executeTelegramBackup(token, chatId);
                if (backupRes.ok) {
                  onShowToast('Cloud Backup sent to Telegram chat!');
                } else {
                  await sendTelegramMessage(token, chatId, `❌ Backup failed: ${backupRes.error}`);
                }
              } else if (cmd === '/nowplaying') {
                const cur = stateRef.current.currentTrack;
                if (cur) {
                  await sendTelegramMessage(
                    token,
                    chatId,
                    `🎶 *Now Playing on Nomatic:*\n\n` +
                    `*${cur.title}*\n` +
                    `👤 Artist: ${cur.artist}\n` +
                    `🔗 [YouTube Video](https://www.youtube.com/watch?v=${cur.youtubeId})`,
                    {
                      parseMode: 'Markdown',
                      replyMarkup: {
                        inline_keyboard: [
                          [
                            { text: '❤️ Like Track', callback_data: `like:${cur.youtubeId}` },
                            { text: '➕ Queue Track', callback_data: `queue:${cur.youtubeId}` },
                          ],
                        ],
                      },
                    }
                  );
                } else {
                  await sendTelegramMessage(token, chatId, '⏸️ No song is currently playing in Nomatic player.');
                }
              } else if (cmd === '/status') {
                await sendTelegramMessage(
                  token,
                  chatId,
                  `🟢 *Nomatic Web Player is Active & Connected!*\n` +
                  `• Auto-Play Incoming: ${stateRef.current.config.autoPlayIncoming ? 'ON' : 'OFF'}\n` +
                  `• Stored Library Tracks: ${stateRef.current.tracks.length}`,
                  { parseMode: 'Markdown' }
                );
              }
              continue;
            }

            // Handle YouTube Links
            if (parsed.type === 'mixed') {
              // Both videoId AND playlistId found
              const meta = await fetchYouTubeMetadata(parsed.videoId!);

              // Reply in Telegram with choices
              await sendTelegramMessage(
                token,
                chatId,
                `🎵 *YouTube Link with Playlist Received!*\n\n` +
                `*Song:* ${meta.title}\n` +
                `*Artist:* ${meta.author}\n\n` +
                `Would you like to play the single song or import the whole playlist?`,
                {
                  parseMode: 'Markdown',
                  replyMarkup: {
                    inline_keyboard: [
                      [
                        { text: '▶️ Play Single Track', callback_data: `play:${parsed.videoId}` },
                        { text: '📑 Import Full Playlist', callback_data: `playlist:${parsed.playlistId}` },
                      ],
                      [
                        { text: '➕ Queue Single Track', callback_data: `queue:${parsed.videoId}` },
                        { text: '➕ Queue All Songs', callback_data: `queue_playlist:${parsed.playlistId}` },
                      ],
                    ],
                  },
                }
              );

              // In Web App: Set incoming prompt banner
              setIncomingPrompt({
                id: `tg-in-${update.update_id}`,
                updateId: update.update_id,
                messageId: msg.message_id,
                senderName,
                senderUsername: msg.from?.username,
                chatId,
                rawText: text,
                type: 'mixed',
                videoId: parsed.videoId,
                playlistId: parsed.playlistId,
                metadata: meta,
                receivedAt: Date.now(),
                status: 'pending',
              });

              if (stateRef.current.config.autoPlayIncoming) {
                const track = await getOrCreateTrack(parsed.videoId!);
                onPlayTrack(track);
                onShowToast(`▶️ Auto-playing single song from Telegram: "${track.title}"`);
              }
            } else if (parsed.type === 'playlist') {
              // Pure playlist link
              await sendTelegramMessage(
                token,
                chatId,
                `📑 *YouTube Playlist Received!*\n\n` +
                `Choose an action for your Nomatic Music player:`,
                {
                  parseMode: 'Markdown',
                  replyMarkup: {
                    inline_keyboard: [
                      [
                        { text: '📑 Import & Play Playlist', callback_data: `playlist:${parsed.playlistId}` },
                        { text: '➕ Queue All Tracks', callback_data: `queue_playlist:${parsed.playlistId}` },
                      ],
                    ],
                  },
                }
              );

              setIncomingPrompt({
                id: `tg-in-${update.update_id}`,
                updateId: update.update_id,
                messageId: msg.message_id,
                senderName,
                senderUsername: msg.from?.username,
                chatId,
                rawText: text,
                type: 'playlist',
                playlistId: parsed.playlistId,
                receivedAt: Date.now(),
                status: 'pending',
              });
            } else if (parsed.type === 'single_track') {
              // Single YouTube Track
              const meta = await fetchYouTubeMetadata(parsed.videoId!);

              await sendTelegramMessage(
                token,
                chatId,
                `🎵 *YouTube Track Received!*\n\n` +
                `*${meta.title}*\n` +
                `👤 ${meta.author}\n\n` +
                `Choose action:`,
                {
                  parseMode: 'Markdown',
                  replyMarkup: {
                    inline_keyboard: [
                      [
                        { text: '▶️ Play Now', callback_data: `play:${parsed.videoId}` },
                        { text: '➕ Add to Queue', callback_data: `queue:${parsed.videoId}` },
                      ],
                      [
                        { text: '❤️ Add to Liked', callback_data: `like:${parsed.videoId}` },
                      ],
                    ],
                  },
                }
              );

              if (stateRef.current.config.autoPlayIncoming) {
                const track = await getOrCreateTrack(parsed.videoId!);
                onPlayTrack(track);
                onShowToast(`▶️ Auto-playing from Telegram: "${track.title}"`);
              } else {
                setIncomingPrompt({
                  id: `tg-in-${update.update_id}`,
                  updateId: update.update_id,
                  messageId: msg.message_id,
                  senderName,
                  senderUsername: msg.from?.username,
                  chatId,
                  rawText: text,
                  type: 'single_track',
                  videoId: parsed.videoId,
                  metadata: meta,
                  receivedAt: Date.now(),
                  status: 'pending',
                });
              }
            }
          }
        }
        setLastPollTime(Date.now());
      } catch (err) {
        // Polling error (e.g. transient network or rate limit)
      }

      if (!isCancelled) {
        const intervalMs = Math.max(2, config.pollingIntervalSeconds || 4) * 1000;
        timeoutId = setTimeout(poll, intervalMs);
      }
    };

    poll();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    config.isEnabled,
    config.botToken,
    config.pollingIntervalSeconds,
    getOrCreateTrack,
    handleImportPlaylistFromTelegram,
    onAddTrack,
    onPlayTrack,
    onAddToQueue,
    onAddTracksToQueue,
    onToggleLike,
    onShowToast,
    onUpdateConfig,
  ]);

  // Handler for user clicking restore from received Telegram backup file
  const handleRestoreFromIncomingBackup = useCallback(async () => {
    if (!incomingBackup || !config.botToken) return;

    try {
      onShowToast('Downloading backup from Telegram...');
      const jsonContent = await fetchTelegramFileContent(config.botToken, incomingBackup.fileId);
      if (!jsonContent) {
        onShowToast('Failed to download backup file from Telegram');
        return;
      }

      const success = importLocalConfigJSON(jsonContent);
      if (success) {
        onShowToast('Successfully restored music library from Telegram backup! 🎉');
        setIncomingBackup(null);
        if (onReloadAllData) onReloadAllData();
      } else {
        onShowToast('Invalid backup JSON format');
      }
    } catch (err: any) {
      onShowToast(`Restore error: ${err?.message || 'Error'}`);
    }
  }, [incomingBackup, config.botToken, onShowToast, onReloadAllData]);

  return {
    isPolling,
    lastPollTime,
    incomingPrompt,
    setIncomingPrompt,
    incomingBackup,
    setIncomingBackup,
    handleRestoreFromIncomingBackup,
    handleImportPlaylistFromTelegram,
    getOrCreateTrack,
  };
}
