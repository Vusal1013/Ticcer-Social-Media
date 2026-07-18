import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { fonts } from '../../constants/theme';

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  function validate() {
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = 'Email tələb olunur';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Düzgün email daxil edin';
    if (!password) errs.password = 'Şifrə tələb olunur';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    const error = await signIn(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert('Xəta', error);
  }

  function getGlassStyle(field: string) {
    const isFocused = focusedField === field;
    const hasError = !!errors[field as keyof typeof errors];
    return {
      borderColor: hasError ? '#ffb4ab' : isFocused ? '#b76dff' : 'rgba(255,255,255,0.08)',
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
    };
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0b1326', '#060e20']} style={StyleSheet.absoluteFill} />

      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.headerSection}>
          <LinearGradient colors={['#ddb7ff', '#0566d9']} style={styles.iconBox}>
            <Ionicons name="apps" size={32} color="#490080" />
          </LinearGradient>
          <Text style={styles.brandText}>Ticcer</Text>
          <Text style={styles.subtitle}>Daxil ol</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={[styles.glassInput, getGlassStyle('email')]}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="adiniz@email.com"
                placeholderTextColor="rgba(45, 52, 73, 0.4)"
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
            <View style={[styles.glassInput, getGlassStyle('password')]}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="rgba(45, 52, 73, 0.4)"
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotRow}>
              <Text style={styles.forgotText}>Şifrəni unutdun?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#b76dff', '#0566d9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitGradient}>
              <Text style={styles.submitText}>
                {loading ? 'Daxil olunur...' : 'Daxil ol'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Hesabınız yoxdur?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Qeydiyyat</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb1: {
    position: 'absolute', top: '-10%', left: '-10%',
    width: '60%', height: '60%', borderRadius: 300,
    backgroundColor: 'rgba(183, 109, 255, 0.08)',
  },
  orb2: {
    position: 'absolute', bottom: '-20%', right: '-10%',
    width: '80%', height: '80%', borderRadius: 400,
    backgroundColor: 'rgba(5, 102, 217, 0.05)',
  },
  scrollContent: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 40,
  },
  headerSection: { alignItems: 'center', gap: 8, marginBottom: 24 },
  iconBox: {
    width: 64, height: 64, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
    elevation: 10, shadowColor: 'rgba(221,183,255,0.2)',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 30,
  },
  brandText: {
    fontSize: 32, fontWeight: '700', color: '#FFFFFF',
    letterSpacing: -0.02,
  },
  subtitle: {
    fontSize: 16, color: '#cfc2d6', opacity: 0.8,
  },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: '#131b2e',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    padding: 24, gap: 16,
  },
  fieldGroup: { gap: 4 },
  fieldLabel: {
    fontSize: 12, fontWeight: '500', color: '#cfc2d6',
    marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  glassInput: {
    borderRadius: 12, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, height: 48,
    borderWidth: 1, transition: 'all 0.2s',
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1, backgroundColor: 'transparent', borderWidth: 0, padding: 0,
    fontSize: 16, color: '#dae2fd',
  },
  errorText: { color: '#ffb4ab', fontSize: 12, fontWeight: '500', marginLeft: 4 },
  forgotRow: { alignItems: 'flex-end', marginTop: 4 },
  forgotText: { color: '#ddb7ff', fontSize: 12, fontWeight: '600' },
  submitBtn: { marginTop: 8, borderRadius: 999, overflow: 'hidden', elevation: 8, shadowColor: 'rgba(183,109,255,0.4)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 20 },
  submitBtnDisabled: { opacity: 0.6 },
  submitGradient: { height: 56, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 16,
  },
  footerText: { color: '#cfc2d6', opacity: 0.7, fontSize: 14 },
  footerLink: { color: '#adc6ff', fontSize: 14, fontWeight: '700', borderBottomWidth: 1, borderBottomColor: 'rgba(173, 198, 255, 0.3)' },
});
