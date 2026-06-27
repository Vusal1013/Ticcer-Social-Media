import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FormInput from '../../components/FormInput';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <Text style={styles.logo}>Ticcer</Text>
        <Text style={styles.subtitle}>Daxil ol</Text>

        <FormInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
        <FormInput label="Şifrə" value={password} onChangeText={setPassword} secureTextEntry error={errors.password} />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Daxil olunur...' : 'Daxil ol'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.link}>
          <Text style={styles.linkText}>Şifrəni unutdun?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.link}>
          <Text style={styles.linkText}>Hesabın yoxdur? <Text style={styles.linkHighlight}>Qeydiyyat</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { fontSize: fonts.sizes.title, fontWeight: fonts.weights.bold, color: colors.primary, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: fonts.sizes.lg, color: colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: colors.textSecondary, fontSize: fonts.sizes.sm },
  linkHighlight: { color: colors.primary, fontWeight: fonts.weights.semibold },
});
