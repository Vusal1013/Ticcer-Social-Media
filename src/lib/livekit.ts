import { supabase } from './supabase';

let cachedToken: { token: string; room: string; expiresAt: number } | null = null;

export async function getLiveKitToken(roomName: string, userId: string, canPublish = true): Promise<string> {
  if (cachedToken && cachedToken.room === roomName && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const { data, error } = await supabase.functions.invoke('generate-livekit-token', {
    body: { roomName, identity: userId, canPublish },
  });

  if (error || !data?.token) {
    throw new Error(error?.message || 'Failed to get LiveKit token');
  }

  cachedToken = { token: data.token, room: roomName, expiresAt: Date.now() + 5 * 60 * 1000 };
  return data.token;
}

export function generateRoomName(): string {
  return `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const LIVEKIT_URL = 'wss://ticcer-tk77dg81.livekit.cloud';
