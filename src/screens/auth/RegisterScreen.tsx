import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { uploadAvatar } from '../../lib/storage';
import { fonts } from '../../constants/theme';

export default function RegisterScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  function validate() {
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = 'İstifadəçi adı tələb olunur';
    if (!fullName.trim()) errs.fullName = 'Ad tələb olunur';
    if (!email.trim()) errs.email = 'Email tələb olunur';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Düzgün email daxil edin';
    if (!password || password.length < 6) errs.password = 'Şifrə ən az 6 simvol olmalıdır';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function pickImage(source: 'camera' | 'gallery') {
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('İcazə tələb olunur', 'Kamera istifadəsi üçün icazə verin');
        return;
      }
    }

    const picker = source === 'camera'
      ? ImagePicker.launchCameraAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });

    const result = await picker;
    if (result.canceled) return;

    const compressed = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 400, height: 400 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    setAvatarUri(compressed.uri);
  }

  function handleAvatarPress() {
    Alert.alert('Profil şəkli', 'Şəkil mənbəyini seçin', [
      { text: 'Ləğv et', style: 'cancel' },
      { text: 'Kamera', onPress: () => pickImage('camera') },
      { text: 'Galeriya', onPress: () => pickImage('gallery') },
    ]);
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);

    const error = await signUp(email.trim(), password, username.trim(), fullName.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Xəta', error);
      return;
    }

    if (avatarUri) {
      setUploading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const url = await uploadAvatar(user.id, avatarUri);
          await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
        }
      } catch {}
      setUploading(false);
    }

    Alert.alert('Təbriklər!', 'Email təsdiqləmə linki göndərildi. Emailinizi yoxlayın.');
  }

  function getFieldStyle(field: string) {
    const isFocused = focusedField === field;
    const hasError = !!errors[field as keyof typeof errors];
    return {
      borderColor: hasError ? '#ffb4ab' : isFocused ? '#ddb7ff' : '#4d4354',
      backgroundColor: '#131b2e',
    };
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F172A', '#000000']} style={StyleSheet.absoluteFill} />

      <View style={styles.bgBlur1} />
      <View style={styles.bgBlur2} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#ddb7ff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brandArea}>
          <Text style={styles.brandText}>Ticcer</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardGlow} />

          <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarSection} activeOpacity={0.7}>
            <View style={styles.avatarOuter}>
              {avatarUri ? (
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  <View style={styles.avatarBadge}>
                    <Ionicons name="add" size={12} color="#490080" />
                  </View>
                </View>
              ) : (
                <View style={[styles.avatarContainer, styles.avatarEmpty]}>
                  <Ionicons name="camera-outline" size={36} color="#4d4354" />
                  <View style={styles.avatarBadge}>
                    <Ionicons name="add" size={12} color="#490080" />
                  </View>
                </View>
              )}
            </View>
            <Text style={styles.avatarHint}>Profil şəkli əlavə et</Text>
          </TouchableOpacity>

          <Text style={styles.cardTitle}>Qeydiyyat</Text>

          <View style={styles.formFields}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>İstifadəçi adı</Text>
              <View style={[styles.inputWrapper, getFieldStyle('username')]}>
                <Ionicons name="person-outline" size={18} color="#988d9f" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="@istifadeci_adi"
                  placeholderTextColor="#988d9f"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ad soyad</Text>
              <View style={[styles.inputWrapper, getFieldStyle('fullName')]}>
                <Ionicons name="badge-outline" size={18} color="#988d9f" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Adınız və Soyadınız"
                  placeholderTextColor="#988d9f"
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={[styles.inputWrapper, getFieldStyle('email')]}>
                <Ionicons name="mail-outline" size={18} color="#988d9f" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="nümunə@email.com"
                  placeholderTextColor="#988d9f"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Şifrə</Text>
              <View style={[styles.inputWrapper, getFieldStyle('password')]}>
                <Ionicons name="lock-closed-outline" size={18} color="#988d9f" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#988d9f"
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#988d9f" />
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldHint}>Minimum 6 simvol olmalıdır.</Text>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (loading || uploading) && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={loading || uploading}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#ddb7ff', '#0566d9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitGradient}>
              {loading || uploading ? (
                <ActivityIndicator color="#2c0051" />
              ) : (
                <>
                  <Text style={styles.submitText}>Qeydiyyatdan keç</Text>
                  <Ionicons name="arrow-forward" size={16} color="#2c0051" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Hesabın var? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.footerLink}>Daxil ol</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgBlur1: {
    position: 'absolute', top: -60, left: -60, width: '40%', height: '40%',
    borderRadius: 200, backgroundColor: 'rgba(221, 183, 255, 0.05)',
  },
  bgBlur2: {
    position: 'absolute', bottom: -60, right: -60, width: '40%', height: '40%',
    borderRadius: 200, backgroundColor: 'rgba(173, 198, 255, 0.05)',
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
  },
  scrollContent: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 100, paddingBottom: 40,
  },
  brandArea: { marginBottom: 24, alignItems: 'center' },
  brandText: {
    fontSize: 32, fontWeight: '700', color: '#FFFFFF',
    letterSpacing: -0.02,
  },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    position: 'relative', overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'transparent',
  },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarOuter: { position: 'relative' },
  avatarContainer: {
    width: 96, height: 96, borderRadius: 48, overflow: 'hidden',
    borderWidth: 2, borderColor: '#4d4354',
  },
  avatarEmpty: {
    backgroundColor: '#222a3d',
    alignItems: 'center', justifyContent: 'center',
    borderStyle: 'dashed',
  },
  avatar: { width: '100%', height: '100%' },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#ddb7ff', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  avatarHint: { color: '#94A3B8', fontSize: 12, fontWeight: '500', marginTop: 8 },
  cardTitle: {
    fontSize: 22, fontWeight: '600', color: '#dae2fd',
    textAlign: 'center', marginBottom: 24,
  },
  formFields: { gap: 16 },
  fieldGroup: { gap: 4 },
  fieldLabel: { color: '#cfc2d6', fontSize: 14, fontWeight: '700', paddingHorizontal: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1, backgroundColor: 'transparent', borderWidth: 0, padding: 0,
    fontSize: 14, color: '#dae2fd',
  },
  fieldHint: { color: '#94A3B8', fontSize: 12, fontWeight: '500', marginTop: 2, paddingHorizontal: 4 },
  errorText: { color: '#ffb4ab', fontSize: 12, fontWeight: '500', paddingHorizontal: 4 },
  submitBtn: { marginTop: 8, borderRadius: 999, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 8,
  },
  submitText: { color: '#2c0051', fontSize: 14, fontWeight: '700' },
  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 24, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerText: { color: '#cfc2d6', fontSize: 14 },
  footerLink: { color: '#ddb7ff', fontSize: 14, fontWeight: '700' },
});
