import { TelegramConfig, TelegramIncomingItem, TelegramUpdate } from '../types/telegram';
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
} {
  if (!rawText || !rawText.trim()) {
    return { type: 'unknown' };
  }
  const text = rawText.trim();

  // Check for commands
  if (text.startsWith('/')) {
    const cmd = text.split(' ')[0].toLowerCase();
    return { type: 'command', command: cmd };
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
