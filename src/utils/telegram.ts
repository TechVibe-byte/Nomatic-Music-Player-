import { TelegramConfig, TelegramIncomingItem, TelegramUpdate } from '../types/telegram';
import { Track } from '../types';
import { extractYouTubeId, fetchYouTubeMetadata } from './youtube';
import { extractYouTubePlaylistId } from './youtubePlaylist';
import { exportLocalConfigJSON, importLocalConfigJSON, loadTracks, loadPlaylists, loadLikedTrackIds } from './storage';

const STORAGE_KEY = 'nomatic_telegram_config_v1';

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: '',
  chatId: '',
  botUsername: '',
  botFirstName: '',
  isEnabled: false,
  autoPlayIncoming: false,
  autoBackupOnChange: false,
  pollingIntervalSeconds: 4,
  lastBackupTimestamp: null,
  lastBackupMessageId: null,
  lastUpdateId: 0,
};

export function loadTelegramConfig(): TelegramConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_TELEGRAM_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load Telegram config', e);
  }
  return DEFAULT_TELEGRAM_CONFIG;
}

export function saveTelegramConfig(config: TelegramConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save Telegram config', e);
  }
}

/**
 * Validates a bot token by querying Telegram getMe endpoint.
 * Also automatically configures the bot command menu (/songs, /search, /backup, etc.).
 */
export async function testTelegramConnection(token: string): Promise<{
  ok: boolean;
  bot?: { id: number; username: string; first_name: string };
  error?: string;
}> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: 'Please enter a Telegram Bot Token' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const data = await res.json();
    if (data.ok && data.result) {
      // Auto-configure the bot's command menu in Telegram
      setTelegramBotCommands(cleanToken).catch(() => {});

      return {
        ok: true,
        bot: {
          id: data.result.id,
          username: data.result.username || '',
          first_name: data.result.first_name || 'Nomatic Bot',
        },
      };
    } else {
      return { ok: false, error: data.description || 'Invalid Telegram Bot Token' };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error connecting to Telegram API' };
  }
}

/**
 * Registers Telegram Bot commands so the user sees a quick [/] menu in chat.
 */
export async function setTelegramBotCommands(token: string): Promise<boolean> {
  try {
    const commands = [
      { command: 'help', description: 'List all commands and guide' },
      { command: 'songs', description: 'Browse and play songs from your library' },
      { command: 'search', description: 'Search songs by title or artist' },
      { command: 'play', description: 'Play a song by name immediately' },
      { command: 'nowplaying', description: 'See what song is currently playing' },
      { command: 'backup', description: 'Download complete cloud backup' },
      { command: 'status', description: 'Check player connection status' },
    ];
    const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
}

/**
 * Sends a message to a Telegram chat with optional Markdown and Inline Keyboard markup.
 */
export async function sendTelegramMessage(
  token: string,
  chatId: string | number,
  text: string,
  options?: {
    parseMode?: 'Markdown' | 'HTML';
    replyMarkup?: {
      inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
    };
  }
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  try {
    const body: Record<string, any> = {
      chat_id: chatId,
      text,
    };
    if (options?.parseMode) {
      body.parse_mode = options.parseMode;
    }
    if (options?.replyMarkup) {
      body.reply_markup = options.replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.ok) {
      return { ok: true, messageId: data.result?.message_id };
    }
    return { ok: false, error: data.description };
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

/**
 * Updates an existing Telegram message in place (ideal for smooth pagination).
 */
export async function editTelegramMessageText(
  token: string,
  chatId: string | number,
  messageId: number,
  text: string,
  options?: {
    parseMode?: 'Markdown' | 'HTML';
    replyMarkup?: {
      inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
    };
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const body: Record<string, any> = {
      chat_id: String(chatId),
      message_id: messageId,
      text,
      parse_mode: options?.parseMode || 'Markdown',
    };
    if (options?.replyMarkup) {
      body.reply_markup = options.replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return { ok: data.ok, error: data.description };
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

/**
 * Answers a Telegram callback query to dismiss the loading state on the button.
 */
export async function answerTelegramCallback(
  token: string,
  callbackQueryId: string,
  text?: string
): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || 'Received by Nomatic!',
        show_alert: false,
      }),
    });
  } catch {
    // Ignore callback errors
  }
}

/**
 * Uploads a JSON backup document directly to the user's Telegram chat.
 */
export async function sendTelegramBackupDocument(
  token: string,
  chatId: string | number,
  filename: string,
  jsonString: string,
  caption: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('chat_id', String(chatId));
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');

    const blob = new Blob([jsonString], { type: 'application/json' });
    formData.append('document', blob, filename);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.ok) {
      return { ok: true };
    }
    return { ok: false, error: data.description };
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

/**
 * Retrieves raw file content from Telegram by file_id.
 */
export async function fetchTelegramFileContent(
  token: string,
  fileId: string
): Promise<string | null> {
  try {
    const getFileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const getFileData = await getFileRes.json();
    if (!getFileData.ok || !getFileData.result?.file_path) {
      return null;
    }
    const filePath = getFileData.result.file_path;
    const downloadRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (downloadRes.ok) {
      return await downloadRes.text();
    }
  } catch (e) {
    console.error('Failed to fetch Telegram file', e);
  }
  return null;
}

/**
 * Parses raw text from a Telegram message to determine whether it contains
 * a single YouTube video, a playlist, a mixed link (both video + playlist),
 * or a bot command.
 */
export function parseTelegramMessageForYouTube(rawText: string): {
  type: 'single_track' | 'playlist' | 'mixed' | 'command' | 'unknown';
  videoId?: string;
  playlistId?: string;
  cleanUrl?: string;
  command?: string;
  query?: string;
} {
  if (!rawText || !rawText.trim()) {
    return { type: 'unknown' };
  }
  const text = rawText.trim();

  // Check for commands (e.g. /songs, /list, /search coldplay, /songs@bot 2)
  if (text.startsWith('/')) {
    const parts = text.split(/\s+/);
    const rawCmd = parts[0].toLowerCase();
    const cmd = rawCmd.split('@')[0]; // Strip bot username suffix if present
    const query = parts.slice(1).join(' ').trim();
    return { type: 'command', command: cmd, query };
  }

  // Check for YouTube link components
  const hasYouTubePattern = /(?:youtube\.com|youtu\.be)/i.test(text);
  const videoId = extractYouTubeId(text);
  const playlistId = extractYouTubePlaylistId(text);

  // If text contains both videoId AND playlistId (e.g. watch?v=xxx&list=yyy)
  if (videoId && playlistId) {
    return {
      type: 'mixed',
      videoId,
      playlistId,
      cleanUrl: `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`,
    };
  }

  // If text contains playlistId only (or /playlist?list=...)
  if (playlistId && !videoId) {
    return {
      type: 'playlist',
      playlistId,
      cleanUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
    };
  }

  // If text contains single videoId
  if (videoId) {
    return {
      type: 'single_track',
      videoId,
      cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }

  // If user pasted a raw 11-char ID or raw PL playlist ID
  if (hasYouTubePattern) {
    return { type: 'unknown' };
  }

  return { type: 'unknown' };
}

/**
 * Builds an interactive paginated Telegram message with inline buttons for each song.
 */
export function createSongsListMessage(
  tracks: Track[],
  page: number = 1,
  pageSize: number = 5
): {
  text: string;
  replyMarkup: {
    inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  };
} {
  if (!tracks || tracks.length === 0) {
    return {
      text: `📂 *Your Nomatic Music Library is empty.*\n\nSend any YouTube song or playlist link here to add and play songs!`,
      replyMarkup: {
        inline_keyboard: [
          [{ text: '🔄 Check Again', callback_data: 'page:1' }],
        ],
      },
    };
  }

  const totalPages = Math.ceil(tracks.length / pageSize) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const pageTracks = tracks.slice(startIndex, startIndex + pageSize);

  let text = `🎵 *Nomatic Music Library* (Page ${currentPage}/${totalPages} • ${tracks.length} songs)\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;

  pageTracks.forEach((t, i) => {
    const itemNum = startIndex + i + 1;
    text += `${itemNum}. *${t.title}*\n    👤 _${t.artist || 'Unknown Artist'}_\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Tap any song button below to play instantly in Nomatic:_`;

  const inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> = [];

  // Individual play and queue buttons for each song on current page
  pageTracks.forEach((t, i) => {
    const itemNum = startIndex + i + 1;
    const shortTitle = t.title.length > 25 ? t.title.substring(0, 23) + '…' : t.title;
    inline_keyboard.push([
      {
        text: `▶️ ${itemNum}. ${shortTitle}`,
        callback_data: `play:${t.youtubeId}`,
      },
      {
        text: `➕ Queue`,
        callback_data: `queue:${t.youtubeId}`,
      },
    ]);
  });

  // Pagination navigation row
  const navRow: Array<{ text: string; callback_data?: string }> = [];
  if (currentPage > 1) {
    navRow.push({
      text: '◀️ Prev',
      callback_data: `page:${currentPage - 1}`,
    });
  }

  navRow.push({
    text: `📄 ${currentPage}/${totalPages}`,
    callback_data: 'noop',
  });

  if (currentPage < totalPages) {
    navRow.push({
      text: 'Next ▶️',
      callback_data: `page:${currentPage + 1}`,
    });
  }

  inline_keyboard.push(navRow);

  // Quick Action row
  inline_keyboard.push([
    { text: '🔍 Search Songs', callback_data: 'cmd:search_prompt' },
    { text: '🎶 Now Playing', callback_data: 'cmd:nowplaying' },
  ]);

  return {
    text,
    replyMarkup: { inline_keyboard },
  };
}

/**
 * Searches the library for matching tracks and generates an interactive choice message.
 */
export function createSongSearchMessage(
  tracks: Track[],
  query: string,
  maxResults: number = 6
): {
  text: string;
  replyMarkup: {
    inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  };
} {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) {
    return {
      text: `🔍 *Search Nomatic Music:*\n\nUsage: Send \`/search <song or artist>\`\nExample: \`/search blinding lights\``,
      replyMarkup: {
        inline_keyboard: [
          [{ text: '📂 View All Songs', callback_data: 'page:1' }],
        ],
      },
    };
  }

  const matches = tracks
    .filter((t) =>
      t.title.toLowerCase().includes(cleanQ) ||
      (t.artist && t.artist.toLowerCase().includes(cleanQ))
    )
    .slice(0, maxResults);

  if (matches.length === 0) {
    return {
      text: `🔍 *Search for "${query}":*\n\nNo tracks found in your library matching this query.\n\n_Tip: You can paste any YouTube URL directly into this chat to add & play it instantly!_`,
      replyMarkup: {
        inline_keyboard: [
          [{ text: '📂 Browse Full Library', callback_data: 'page:1' }],
        ],
      },
    };
  }

  let text = `🔍 *Search Results for "${query}"* (${matches.length} found):\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;

  matches.forEach((t, i) => {
    text += `${i + 1}. *${t.title}*\n    👤 _${t.artist || 'Unknown Artist'}_\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━\n_Tap a button to play in Nomatic:_`;

  const inline_keyboard: Array<Array<{ text: string; callback_data?: string }>> = [];

  matches.forEach((t, i) => {
    const shortTitle = t.title.length > 25 ? t.title.substring(0, 23) + '…' : t.title;
    inline_keyboard.push([
      {
        text: `▶️ ${i + 1}. ${shortTitle}`,
        callback_data: `play:${t.youtubeId}`,
      },
      {
        text: `➕ Queue`,
        callback_data: `queue:${t.youtubeId}`,
      },
    ]);
  });

  inline_keyboard.push([
    { text: '📂 Back to Full Library', callback_data: 'page:1' },
  ]);

  return {
    text,
    replyMarkup: { inline_keyboard },
  };
}

/**
 * Executes a full backup of all Nomatic library data directly to the user's Telegram chat.
 */
export async function executeTelegramBackup(
  token: string,
  chatId: string | number
): Promise<{ ok: boolean; error?: string; timestamp?: number }> {
  if (!token || !chatId) {
    return { ok: false, error: 'Telegram Bot Token and Chat ID are required' };
  }

  const jsonString = exportLocalConfigJSON();
  const tracks = loadTracks();
  const playlists = loadPlaylists();
  const liked = loadLikedTrackIds();

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `nomatic_backup_${dateStr}.json`;

  const caption = 
`💾 *Nomatic Music - Cloud Backup*
━━━━━━━━━━━━━━━━━━━
📅 *Date:* ${now.toLocaleString()}
🎵 *Total Tracks:* ${tracks.length}
📑 *Playlists:* ${playlists.length}
❤️ *Liked Songs:* ${liked.length}
⚡ *Status:* Encrypted local configuration & playlists
━━━━━━━━━━━━━━━━━━━
_To restore this library anytime, send this JSON file back to your bot or upload it in Nomatic Settings._`;

  const result = await sendTelegramBackupDocument(
    token,
    chatId,
    filename,
    jsonString,
    caption
  );

  if (result.ok) {
    const currentConfig = loadTelegramConfig();
    const updated = {
      ...currentConfig,
      lastBackupTimestamp: Date.now(),
    };
    saveTelegramConfig(updated);
    return { ok: true, timestamp: updated.lastBackupTimestamp };
  }

  return { ok: false, error: result.error || 'Failed to send backup to Telegram' };
}

/**
 * Builds a comprehensive Help & Commands guide message for Telegram.
 */
export function createHelpMessage(senderName: string = 'Music Lover'): {
  text: string;
  replyMarkup: {
    inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  };
} {
  const text = 
`📖 *Nomatic Music - Bot Command List*
━━━━━━━━━━━━━━━━━━━━━
👋 Hello *${senderName}*! Here is your full list of available remote commands:

🎵 *Music & Playback:*
• \`/songs\` or \`/list\` — Browse your full music library with interactive page buttons and instant [▶️ Play].
• \`/search <name>\` — Search songs by title or artist (e.g. \`/search starboy\`).
• \`/play <name>\` — Instantly start playing a song in Nomatic (e.g. \`/play blinding\`).
• \`/nowplaying\` — Show the currently playing track with direct YouTube audio link and Like button.

💾 *Backup & Sync:*
• \`/backup\` — Download an encrypted cloud backup file (.json) of all your tracks and custom playlists.
• \`/status\` — Check connection status between Telegram and your Nomatic web player.
• \`/help\` — Display this command reference list anytime.

🔗 *YouTube Links:*
• Paste *any YouTube song link* — Bot gives [Play], [Queue], and [Like] options.
• Paste *any YouTube playlist link* — Bot prompts to play single song or import full playlist.

💡 *Offline Queue:* If Nomatic is closed, Telegram queues your play choice and begins playing as soon as you open the web app!
━━━━━━━━━━━━━━━━━━━━━
_Tap a quick action button below to start:_`;

  return {
    text,
    replyMarkup: {
      inline_keyboard: [
        [
          { text: '🎵 View Song List (/songs)', callback_data: 'page:1' },
          { text: '💾 Cloud Backup (/backup)', callback_data: 'cmd:backup' },
        ],
        [
          { text: '🎶 Now Playing', callback_data: 'cmd:nowplaying' },
          { text: '🟢 Player Status', callback_data: 'cmd:status' },
        ],
      ],
    },
  };
}

