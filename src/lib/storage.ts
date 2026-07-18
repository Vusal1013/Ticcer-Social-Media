import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

export async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function pickAndCompressImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled) return null;

  const compressed = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
  );

  return compressed;
}

export async function uploadAvatar(userId: string, uri: string) {
  const ext = 'jpg';
  const fileName = `avatar-${userId}.${ext}`;
  const filePath = `${userId}/${fileName}`;

  const arrayBuffer = await uriToArrayBuffer(uri);

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, arrayBuffer, { upsert: true, contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function uploadCommunityIcon(communityId: string, uri: string) {
  const ext = 'jpg';
  const fileName = `icon-${communityId}.${ext}`;
  const filePath = `community-icons/${fileName}`;

  const arrayBuffer = await uriToArrayBuffer(uri);

  const { error: uploadError } = await supabase.storage
    .from('community-icons')
    .upload(filePath, arrayBuffer, { upsert: true, contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('community-icons')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function uploadCommunityCover(communityId: string, uri: string) {
  const ext = 'jpg';
  const fileName = `cover-${communityId}.${ext}`;
  const filePath = `community-covers/${fileName}`;

  const arrayBuffer = await uriToArrayBuffer(uri);

  const { error: uploadError } = await supabase.storage
    .from('community-covers')
    .upload(filePath, arrayBuffer, { upsert: true, contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('community-covers')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}
