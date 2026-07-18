import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export async function uploadVoice(uri: string, userId: string): Promise<string> {
  const fileName = `${userId}/${Date.now()}.m4a`;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const { error: uploadError } = await supabase.storage
    .from('voice-messages')
    .upload(fileName, bytes.buffer, {
      contentType: 'audio/mp4',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('voice-messages')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
