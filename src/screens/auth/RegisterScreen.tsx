import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FormInput from '../../components/FormInput';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';

export default function RegisterScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    const error = await signUp(email.trim(), password, username.trim(), fullName.trim());
    setLoading(false);
    if (error) Alert.alert('Xəta', error);
    else Alert.alert('Təbriklər!', 'Email təsdiqləmə linki göndərildi. Emailinizi yoxlayın.');
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <Text style={styles.title}>Qeydiyyat</Text>

        <FormInput label="İstifadəçi adı" value={username} onChangeText={setUsername} autoCapitalize="none" error={errors.username} />
        <FormInput label="Ad soyad" value={fullName} onChangeText={setFullName} error={errors.fullName} />
        <FormInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
        <FormInput label="Şifrə" value={password} onChangeText={setPassword} secureTextEntry error={errors.password} />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Qeydiyyat...' : 'Qeydiyyatdan keç'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>Hesabın var? <Text style={styles.linkHighlight}>Daxil ol</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: fonts.sizes.xxl, fontWeight: fonts.weights.bold, color: colors.text, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: colors.textSecondary, fontSize: fonts.sizes.sm },
  linkHighlight: { color: colors.primary, fontWeight: fonts.weights.semibold },
});
