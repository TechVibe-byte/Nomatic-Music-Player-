export interface TelegramConfig {
  botToken: string; // e.g. "123456789:ABCdefGHI..."
  chatId: string; // e.g. "12345678" or "-10012345678"
  botUsername?: string; // e.g. "NomaticMusicBot"
  botFirstName?: string; // e.g. "Nomatic Remote"
  isEnabled: boolean; // whether polling/remote sync is active
  autoPlayIncoming: boolean; // whether to auto-play single song links immediately
  autoBackupOnChange: boolean; // whether to push cloud backup when playlists/tracks change
  pollingIntervalSeconds: number; // default: 4 seconds
  lastBackupTimestamp?: number | null;
  lastBackupMessageId?: number | null;
  lastUpdateId?: number; // for Telegram getUpdates offset
}

export type TelegramLinkType = 'single_track' | 'playlist' | 'mixed' | 'command' | 'unknown';

export interface TelegramIncomingItem {
  id: string; // unique message id
  updateId: number;
  messageId?: number;
  senderName: string;
  senderUsername?: string;
  chatId: string | number;
  rawText: string;
  type: TelegramLinkType;
  videoId?: string;
  playlistId?: string;
  metadata?: {
    title: string;
    author: string;
    thumbnail: string;
  };
  receivedAt: number;
  status: 'pending' | 'played' | 'queued' | 'imported' | 'dismissed';
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
      first_name?: string;
    };
    date: number;
    text?: string;
    caption?: string;
    document?: {
      file_id: string;
      file_unique_id: string;
      file_name?: string;
      mime_type?: string;
      file_size?: number;
    };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data?: string;
  };
}
