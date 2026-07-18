import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Image, Dimensions, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../lib/supabase';
import { uriToArrayBuffer } from '../../lib/storage';
import { useAuth } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function CreateStoryScreen({ navigation }: any) {
  const { user } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'story' | 'live'>('story');

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  function toggleFacing() {
    setFacing(prev => prev === 'back' ? 'front' : 'back');
  }

  function toggleFlash() {
    setFlash(prev => prev === 'off' ? 'on' : 'off');
  }

  async function takePicture() {
    if (!cameraRef.current || uploading) return;
    setUploading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) return;
      await uploadStory(photo.uri);
    } catch {
      Alert.alert('Xeta', 'Sekil cekile bilmedi');
    } finally {
      setUploading(false);
    }
  }

  async function pickFromGallery() {
    if (uploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadStory(result.assets[0].uri, result.assets[0].type === 'video');
  }

  async function uploadStory(uri: string, isVideo = false) {
    setUploading(true);
    try {
      let finalUri = uri;
      if (!isVideo) {
        const compressed = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1080 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
        finalUri = compressed.uri;
      }
      const ext = isVideo ? 'mp4' : 'jpg';
      const fileName = `story_${user!.id}_${Date.now()}.${ext}`;
      const arrayBuffer = await uriToArrayBuffer(finalUri);
      const { error: uploadError } = await supabase.storage.from('stories').upload(fileName, arrayBuffer, { contentType: isVideo ? 'video/mp4' : 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('stories').getPublicUrl(fileName);
      const { error } = await supabase.from('stories').insert({
        user_id: user!.id, media_url: urlData.publicUrl, type: isVideo ? 'video' : 'image',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      Alert.alert('Story paylaşıldı!');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Xəta', err.message || 'Yüklənə bilmədi');
    } finally {
      setUploading(false);
    }
  }

  function handleGoLive() {
    navigation.navigate('GoLive');
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={48} color="#94A3B8" />
          <Text style={styles.permissionText}>Kamera icazəsi tələb olunur</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>İcazə ver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={48} color="#94A3B8" />
          <Text style={styles.permissionText}>Kamera icazəsi verilməyib</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>İcazə ver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backPermissionBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backPermissionBtnText}>Geri</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Camera Preview */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(15,23,42,0.4)', 'transparent', 'rgba(0,0,0,0.9)']}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={26} color="#dae2fd" />
        </TouchableOpacity>

        <View style={styles.topRightControls}>
          <TouchableOpacity style={styles.topBtn} onPress={toggleFlash} activeOpacity={0.8}>
            <Ionicons
              name={flash === 'on' ? 'flash' : 'flash-off'}
              size={22}
              color="#dae2fd"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.topBtn} activeOpacity={0.8}>
            <Ionicons name="settings-outline" size={22} color="#dae2fd" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Bottom Controls */}
      <View style={styles.bottomContainer}>
        {/* Mode Switcher */}
        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={styles.modeBtn}
            onPress={() => setMode('story')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeText, mode === 'story' && styles.modeTextActive]}>
              STORY
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeBtn}
            onPress={handleGoLive}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeText, mode === 'live' && styles.modeTextActive]}>
              CANLI
            </Text>
            <View style={styles.liveDot} />
          </TouchableOpacity>
        </View>
        {mode === 'story' && <View style={styles.modeIndicator} />}

        {/* Capture Controls */}
        <View style={styles.captureRow}>
          {/* Gallery Preview */}
          <TouchableOpacity
            style={styles.galleryBtn}
            onPress={pickFromGallery}
            activeOpacity={0.8}
            disabled={uploading}
          >
            <View style={[styles.galleryImage, styles.galleryPlaceholder]}>
              <Ionicons name="images-outline" size={22} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* Capture Button */}
          <TouchableOpacity
            style={styles.captureOuter}
            onPress={takePicture}
            activeOpacity={0.7}
            disabled={uploading}
          >
            <View style={[styles.captureRing, uploading && styles.captureRingUploading]}>
              <View style={[styles.captureInner, uploading && styles.captureInnerUploading]}>
                {uploading ? (
                  <Ionicons name="cloud-upload-outline" size={28} color="#fff" />
                ) : null}
              </View>
            </View>
          </TouchableOpacity>

          {/* Camera Flip */}
          <TouchableOpacity
            style={styles.flipBtn}
            onPress={toggleFacing}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-reverse-outline" size={28} color="#dae2fd" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  permissionText: {
    color: '#dae2fd',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: '#ddb7ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 8,
  },
  permissionBtnText: {
    color: '#490080',
    fontWeight: '700',
    fontSize: 14,
  },
  backPermissionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backPermissionBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    zIndex: 10,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30,41,59,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 12,
  },
  spacer: {
    flex: 1,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  modeSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 8,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  modeTextActive: {
    color: '#ddb7ff',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  modeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ddb7ff',
    marginBottom: 16,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
    marginTop: 8,
  },
  galleryBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(30,41,59,0.8)',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    backgroundColor: 'rgba(30,41,59,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(221,183,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureRingUploading: {
    borderColor: 'rgba(148,163,184,0.5)',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ddb7ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  captureInnerUploading: {
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
  },
  flipBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(30,41,59,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
