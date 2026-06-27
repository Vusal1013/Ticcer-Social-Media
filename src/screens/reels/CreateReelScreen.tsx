import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';

export default function CreateReelScreen({ navigation }: any) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [video, setVideo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos',
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) setVideo(result.assets[0].uri);
  }

  async function uploadVideo(uri: string) {
    const ext = 'mp4';
    const fileName = `${user!.id}_${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from('reels').upload(fileName, blob, { contentType: 'video/mp4' });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('reels').getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  async function handleUpload() {
    if (!video) return Alert.alert('Xəta', 'Video seçin');
    setUploading(true);
    try {
      const videoUrl = await uploadVideo(video);
      const { error } = await supabase.from('reels').insert({
        user_id: user!.id,
        video_url: videoUrl,
        description: description.trim() || null,
      });
      if (error) throw error;
      Alert.alert('Reel paylaşıldı!');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Xəta', err.message || 'Yüklənə bilmədi');
    } finally {
      setUploading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.cancel}>Ləğv et</Text></TouchableOpacity>
        <Text style={styles.title}>Reel yüklə</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity onPress={pickVideo} style={styles.videoPicker}>
          {video ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name="checkmark-outline" size={16} color={colors.success} /><Text style={[styles.selectedText, { marginLeft: 6 }]}> Video seçildi</Text></View>
          ) : (
            <>
              <Ionicons name="videocam-outline" size={40} color={colors.textMuted} />
              <Text style={styles.pickerText}>Video seç</Text>
            </>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Başlıq yaz..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity
          style={[styles.uploadBtn, (!video || uploading) && styles.uploadBtnDisabled]}
          onPress={handleUpload}
          disabled={!video || uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.uploadText}>Paylaş</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  cancel: { color: colors.textMuted, fontSize: fonts.sizes.md },
  title: { color: colors.text, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.lg },
  content: { padding: 16, gap: 16 },
  videoPicker: {
    height: 180, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  pickerIcon: { fontSize: 40, marginBottom: 8 },
  pickerText: { color: colors.textMuted, fontSize: fonts.sizes.md },
  selectedText: { color: colors.success, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  input: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, color: colors.text,
    fontSize: fonts.sizes.md, minHeight: 80, textAlignVertical: 'top',
  },
  uploadBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadText: { color: colors.white, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
});
