import { useState, useEffect } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { uploadAvatar } from '../../lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/theme';

export default function EditProfileScreen({ navigation }: any) {
  const { profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  async function pickImage(source: 'camera' | 'gallery') {
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('İcazə tələb olunur', 'Kamera istifadəsi üçün icazə verin');
        return null;
      }
    }

    const picker = source === 'camera'
      ? ImagePicker.launchCameraAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });

    const result = await picker;
    if (result.canceled) return null;

    const compressed = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 400, height: 400 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    return compressed;
  }

  async function handlePickAvatar() {
    Alert.alert('Profil şəkli', 'Şəkil mənbəyini seçin', [
      { text: 'Ləğv et', style: 'cancel' },
      { text: 'Kamera', onPress: async () => {
        const image = await pickImage('camera');
        if (!image) return;
        await uploadAndSet(image.uri);
      }},
      { text: 'Galeriya', onPress: async () => {
        const image = await pickImage('gallery');
        if (!image) return;
        await uploadAndSet(image.uri);
      }},
    ]);
  }

  async function uploadAndSet(uri: string) {
    setUploading(true);
    try {
      const url = await uploadAvatar(profile!.id, uri);
      setAvatarUrl(url);
    } catch (err: any) {
      Alert.alert('Xəta', err.message || 'Şəkil yüklənə bilmədi');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!username.trim()) return Alert.alert('Xəta', 'İstifadəçi adı tələb olunur');
    setLoading(true);

    const updates: Record<string, any> = {
      username: username.trim(),
      full_name: fullName.trim(),
      bio: bio.trim() || null,
    };
    if (avatarUrl) updates.avatar_url = avatarUrl;

    const { error } = await supabase.from('profiles').update(updates).eq('id', profile!.id);
    setLoading(false);
    if (error) return Alert.alert('Xəta', error.message);
    await refreshProfile();
    Alert.alert('Yadda saxlanıldı');
    navigation.goBack();
  }

  function getGlassStyle(field: string) {
    const isFocused = focusedField === field;
    return {
      backgroundColor: isFocused ? 'rgba(30, 41, 59, 0.6)' : 'rgba(30, 41, 59, 0.4)',
      borderColor: isFocused ? '#ddb7ff' : 'rgba(255, 255, 255, 0.08)',
    };
  }

  const displayName = profile?.full_name || '?';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F172A', '#000000']} style={StyleSheet.absoluteFill} />

      <View style={styles.bgBlur1} />
      <View style={styles.bgBlur2} />

      <LinearGradient colors={['#0F172A', 'transparent']} style={styles.headerScrim} pointerEvents="none" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#dae2fd" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profili redaktə et</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.7} style={styles.avatarOuter}>
            <LinearGradient colors={['#ddb7ff', '#adc6ff']} style={styles.avatarGradient}>
              <View style={styles.avatarInner}>
                {uploading ? (
                  <ActivityIndicator color="#ddb7ff" />
                ) : avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarLetter}>{displayName[0].toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
            <View style={styles.avatarOverlay}>
              <Ionicons name="camera" size={32} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.7}>
            <Text style={styles.avatarHint}>Dəyiş</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formFields}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>İstifadəçi adı</Text>
            <View style={[styles.glassPanel, getGlassStyle('username')]}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="İstifadəçi adı"
                placeholderTextColor="#6B6B8A"
                autoCapitalize="none"
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Ad soyad</Text>
            <View style={[styles.glassPanel, getGlassStyle('fullName')]}>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Ad və Soyad"
                placeholderTextColor="#6B6B8A"
                onFocus={() => setFocusedField('fullName')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <View style={[styles.glassPanel, styles.bioPanel, getGlassStyle('bio')]}>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Özünüz haqqında bir az danışın..."
                placeholderTextColor="#6B6B8A"
                multiline
                textAlignVertical="top"
                onFocus={() => setFocusedField('bio')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.glassPanel, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 }]}
            onPress={() => navigation.navigate('ThemeSelector')}
            activeOpacity={0.7}
          >
            <Ionicons name="color-palette-outline" size={20} color="#ddb7ff" />
            <Text style={[styles.fieldLabel, { flex: 1, marginHorizontal: 0 }]}>Profil Teması</Text>
            <Ionicons name="chevron-forward" size={18} color="#6B6B8A" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <LinearGradient colors={['transparent', '#0b1326']} style={styles.bottomGradient} pointerEvents="none" />
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.saveBtn, (loading || uploading) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading || uploading}
          activeOpacity={0.9}
        >
          <LinearGradient colors={['#b76dff', '#0566d9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveGradient}>
            <Text style={styles.saveText}>
              {loading ? 'Yadda saxlanılır...' : 'Yadda saxla'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 80, zIndex: 10,
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '600', color: '#ddb7ff' },
  scrollContent: { paddingTop: 100, paddingHorizontal: 16, alignItems: 'center' },
  avatarSection: { alignItems: 'center', marginTop: 24, marginBottom: 40 },
  avatarOuter: { position: 'relative', borderRadius: 56, overflow: 'hidden' },
  avatarGradient: { width: 112, height: 112, borderRadius: 56, padding: 4 },
  avatarInner: {
    width: 104, height: 104, borderRadius: 52, overflow: 'hidden',
    borderWidth: 4, borderColor: '#0b1326',
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#171f33' },
  avatarLetter: { fontSize: 40, fontWeight: '700', color: '#ddb7ff' },
  avatarOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 56, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarHint: { marginTop: 8, color: '#ddb7ff', fontSize: 14, fontWeight: '700' },
  formFields: { width: '100%', maxWidth: 400, gap: 24 },
  fieldGroup: { flexDirection: 'column', gap: 4 },
  fieldLabel: { paddingHorizontal: 4, color: '#cfc2d6', fontSize: 14, fontWeight: '700' },
  glassPanel: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  atSign: { color: '#cfc2d6', marginRight: 4, fontSize: 16 },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    fontSize: 16,
    color: '#dae2fd',
  },
  bioPanel: { minHeight: 120, paddingVertical: 12 },
  bioInput: { height: 96, textAlignVertical: 'top' },
  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, zIndex: 10,
  },
  bottomContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 11,
    padding: 16, paddingBottom: 32,
  },
  saveBtn: { borderRadius: 999, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveGradient: { paddingVertical: 16, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  bgBlur1: {
    position: 'absolute', top: -60, left: -60, width: '40%', height: '40%',
    borderRadius: 200, backgroundColor: 'rgba(221, 183, 255, 0.05)',
  },
  bgBlur2: {
    position: 'absolute', bottom: -60, right: -60, width: '40%', height: '40%',
    borderRadius: 200, backgroundColor: 'rgba(173, 198, 255, 0.05)',
  },
});
