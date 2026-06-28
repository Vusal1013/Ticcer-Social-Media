import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../lib/supabase';
import { uriToArrayBuffer } from '../../lib/storage';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';

export default function CreateStoryScreen({ navigation }: any) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  async function pickMedia(useCamera: boolean) {
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          quality: 0.8,
          allowsEditing: false,
        });
    if (result.canceled || !result.assets[0]) return;
    await uploadStory(result.assets[0]);
  }

  async function uploadStory(asset: any) {
    setUploading(true);
    try {
      const isVideo = asset.type === 'video';
      let uri = asset.uri;
      if (!isVideo) {
        const compressed = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1080 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
        uri = compressed.uri;
      }
      const ext = isVideo ? 'mp4' : 'jpg';
      const fileName = `story_${user!.id}_${Date.now()}.${ext}`;
      const arrayBuffer = await uriToArrayBuffer(uri);
      const { error: uploadError } = await supabase.storage.from('stories').upload(fileName, arrayBuffer, { contentType: isVideo ? 'video/mp4' : 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('stories').getPublicUrl(fileName);
      const { error } = await supabase.from('stories').insert({
        user_id: user!.id, media_url: urlData.publicUrl, type: isVideo ? 'video' : 'image',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      Alert.alert('Story paylasildi!');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Xeta', err.message || 'Yuklene bilmedi');
    } finally {
      setUploading(false);
    }
  }

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <Text style={styles.title}>Story elave et</Text>
      <Text style={styles.subtitle}>24 saat erzinde gorunecek</Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.btn, uploading && styles.btnDisabled]} onPress={() => pickMedia(true)} disabled={uploading}>
          <Text style={styles.btnIcon}>Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, uploading && styles.btnDisabled]} onPress={() => pickMedia(false)} disabled={uploading}>
          <Text style={styles.btnIcon}>Galeriya</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.cancelText}>Legv et</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: fonts.sizes.xxl, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { color: colors.textSecondary, marginBottom: 40 },
  buttons: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  btn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 20, paddingHorizontal: 32, alignItems: 'center', minWidth: 130 },
  btnDisabled: { opacity: 0.5 },
  btnIcon: { color: colors.white, fontSize: fonts.sizes.lg, fontWeight: '600' },
  cancelText: { color: colors.textMuted, fontSize: fonts.sizes.md },
});
