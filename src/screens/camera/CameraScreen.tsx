import { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { uriToArrayBuffer } from '../../lib/storage';
import { useAuth } from '../../lib/auth';
import { FILTERS, STICKERS } from '../../constants/filters';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CameraScreen({ navigation }: any) {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [mode, setMode] = useState<'camera' | 'gallery'>('camera');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function takePicture() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync();
    if (photo?.uri) setCapturedUri(photo.uri);
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled) setCapturedUri(result.assets[0].uri);
  }

  async function applyEffects(uri: string) {
    let manipulated = uri;
    if (selectedFilter.id !== 'none') {
      manipulated = (await ImageManipulator.manipulateAsync(
        manipulated, [], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      )).uri;
    }
    return manipulated;
  }

  async function shareAsPost() {
    if (!capturedUri) return;
    setUploading(true);
    try {
      const finalUri = await applyEffects(capturedUri);
      const compressed = await ImageManipulator.manipulateAsync(
        finalUri, [{ resize: { width: 1080 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      const fileName = `camera_${user!.id}_${Date.now()}.jpg`;
      const arrayBuffer = await uriToArrayBuffer(compressed.uri);
      const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(fileName);

      await supabase.from('posts').insert({
        user_id: user!.id, content: '(kamera)', image_url: urlData.publicUrl,
      });

      Alert.alert('Paylasildi!');
      setCapturedUri(null);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Xeta', err.message || 'Yuklene bilmedi');
    } finally {
      setUploading(false);
    }
  }

  async function shareAsStory() {
    if (!capturedUri) return;
    setUploading(true);
    try {
      const finalUri = await applyEffects(capturedUri);
      const compressed = await ImageManipulator.manipulateAsync(
        finalUri, [{ resize: { width: 1080 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      const fileName = `story_${user!.id}_${Date.now()}.jpg`;
      const arrayBuffer = await uriToArrayBuffer(compressed.uri);
      await supabase.storage.from('stories').upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });
      const { data: urlData } = supabase.storage.from('stories').getPublicUrl(fileName);

      await supabase.from('stories').insert({
        user_id: user!.id, media_url: urlData.publicUrl, type: 'image',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      Alert.alert('Story olaraq paylasildi!');
      setCapturedUri(null);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Xeta', err.message || 'Yuklene bilmedi');
    } finally {
      setUploading(false);
    }
  }

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
        <View style={styles.permissionView}>
          <Text style={styles.permissionText}>Kamera icazesi teleb olunur</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permissionBtn}>
            <Text style={styles.permissionBtnText}>Icaze ver</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (capturedUri) {
    return (
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={() => setCapturedUri(null)}>
            <Text style={styles.backBtn}>Geri</Text>
          </TouchableOpacity>
          <Text style={styles.previewTitle}>On izleme</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.previewImage, { backgroundColor: selectedFilter.color }]}>
          <View style={{ flex: 1 }} />
        </View>

        <Text style={styles.previewNote}>Foto chekildi. Effektler elave edildi.</Text>

        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.shareBtn} onPress={shareAsPost} disabled={uploading}>
            {uploading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.shareBtnText}>Post kimi paylas</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.storyBtn} onPress={shareAsStory} disabled={uploading}>
            {uploading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.storyBtnText}>Story kimi paylas</Text>}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {mode === 'camera' ? (
        <CameraView ref={cameraRef} style={styles.camera} facing="front">
          <View style={[styles.filterOverlay, { backgroundColor: selectedFilter.color }]} />
          {selectedSticker && <Text style={styles.sticker}>{selectedSticker}</Text>}

          <View style={styles.cameraTop}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.closeBtn}>X</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('gallery')}>
              <Text style={styles.galleryBtn}>Galeriya</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cameraBottom}>
            <TouchableOpacity onPress={takePicture} style={styles.captureBtn}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f.id} style={[styles.filterItem, selectedFilter.id === f.id && styles.filterItemActive]}
                  onPress={() => setSelectedFilter(f)}
                >
                  <View style={[styles.filterCircle, { backgroundColor: f.color || colors.surface }]} />
                  <Text style={styles.filterName}>{f.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.stickerBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickerScroll}>
              {STICKERS.map(s => (
                <TouchableOpacity
                  key={s} style={[styles.stickerItem, selectedSticker === s && styles.stickerItemActive]}
                  onPress={() => setSelectedSticker(selectedSticker === s ? null : s)}
                >
                  <Text style={styles.stickerEmoji}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </CameraView>
      ) : (
        <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
          <View style={styles.galleryTop}>
            <TouchableOpacity onPress={() => setMode('camera')}>
              <Text style={styles.backBtn}>Kameraya don</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.galleryContent}>
            <TouchableOpacity onPress={pickFromGallery} style={styles.galleryPicker}>
              <Ionicons name="image-outline" size={60} color={colors.textMuted} />
              <Text style={styles.galleryPickerText}>Sekil sec</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  camera: { flex: 1, position: 'relative' },
  filterOverlay: { ...StyleSheet.absoluteFill, zIndex: 2, pointerEvents: 'none' } as any,
  sticker: { position: 'absolute', bottom: 200, right: 40, fontSize: 60, zIndex: 3 },
  cameraTop: { position: 'absolute', top: 60, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  closeBtn: { color: colors.white, fontSize: 24, fontWeight: '700' },
  galleryBtn: { color: colors.white, fontSize: fonts.sizes.sm, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: 8 },
  cameraBottom: { position: 'absolute', bottom: 180, alignSelf: 'center', zIndex: 10 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.white },
  filterBar: { position: 'absolute', bottom: 100, left: 0, right: 0, zIndex: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 12 },
  filterItem: { alignItems: 'center', width: 56 },
  filterItemActive: { transform: [{ scale: 1.1 }] },
  filterCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.white },
  filterName: { color: colors.white, fontSize: fonts.sizes.xs, marginTop: 4 },
  stickerBar: { position: 'absolute', bottom: 60, left: 0, right: 0, zIndex: 10 },
  stickerScroll: { paddingHorizontal: 16, gap: 8 },
  stickerItem: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)' },
  stickerItemActive: { backgroundColor: colors.primary },
  stickerEmoji: { fontSize: 28 },
  galleryTop: { padding: 16, paddingTop: 60 },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  galleryContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  galleryPicker: { alignItems: 'center' },
  galleryPickerIcon: { fontSize: 60, marginBottom: 12 },
  galleryPickerText: { color: colors.textMuted, fontSize: fonts.sizes.md },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  previewTitle: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  previewImage: { flex: 1, margin: 16, borderRadius: 16 },
  previewNote: { color: colors.textMuted, textAlign: 'center', fontSize: fonts.sizes.xs, marginBottom: 8 },
  previewActions: { padding: 16, gap: 8, paddingBottom: 40 },
  shareBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  shareBtnText: { color: colors.white, fontWeight: '700' },
  storyBtn: { backgroundColor: colors.secondary, borderRadius: 12, padding: 14, alignItems: 'center' },
  storyBtnText: { color: colors.white, fontWeight: '700' },
  permissionView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionText: { color: colors.text, fontSize: fonts.sizes.md, marginBottom: 16, textAlign: 'center' },
  permissionBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, paddingHorizontal: 24 },
  permissionBtnText: { color: colors.white, fontWeight: '600' },
});
