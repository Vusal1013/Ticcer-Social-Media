import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FormInput from '../../components/FormInput';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { pickAndCompressImage, uploadAvatar } from '../../lib/storage';
import { colors, fonts } from '../../constants/theme';

export default function EditProfileScreen({ navigation }: any) {
  const { profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  async function handlePickAvatar() {
    const image = await pickAndCompressImage();
    if (!image) return;

    setUploading(true);
    try {
      const url = await uploadAvatar(profile!.id, image.uri);
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <Text style={styles.title}>Profili düzəliş et</Text>

        <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarContainer}>
          {uploading ? (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarLetter}>{(fullName || '?')[0].toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.avatarHint}>Dəyiş</Text>
        </TouchableOpacity>

        <FormInput label="İstifadəçi adı" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <FormInput label="Ad soyad" value={fullName} onChangeText={setFullName} />
        <FormInput label="Bio" value={bio} onChangeText={setBio} />

        <TouchableOpacity style={[styles.button, (loading || uploading) && styles.buttonDisabled]} onPress={handleSave} disabled={loading || uploading}>
          <Text style={styles.buttonText}>{loading ? 'Yadda saxlanılır...' : 'Yadda saxla'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
  title: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold, color: colors.text, marginBottom: 24 },
  avatarContainer: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed' },
  avatarLetter: { fontSize: 40, fontWeight: fonts.weights.bold, color: colors.primary },
  avatarHint: { color: colors.primary, fontSize: fonts.sizes.xs, marginTop: 6, fontWeight: fonts.weights.medium },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
});
