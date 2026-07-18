import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FormInput from '../../components/FormInput';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});

  function validate() {
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = 'Email tələb olunur';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Düzgün email daxil edin';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleReset() {
    if (!validate()) return;
    setLoading(true);
    const error = await resetPassword(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Xəta', error);
    } else {
      setSent(true);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <Text style={styles.logo}>Ticcer</Text>
        <Text style={styles.subtitle}>Şifrəni sıfırla</Text>

        {sent ? (
          <>
            <Text style={styles.successText}>
              Şifrə sıfırlama linki email ünvanınıza göndərildi. Zəhmət olmasa email qutunuzu yoxlayın.
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
              <Text style={styles.buttonText}>Geri dön</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.infoText}>
              Email ünvanınızı daxil edin, sizə şifrə sıfırlama linki göndərək.
            </Text>
            <FormInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleReset} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Göndərilir...' : 'Link göndər'}</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}><Text style={styles.linkHighlight}>Geri dön</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { fontSize: fonts.sizes.title, fontWeight: fonts.weights.bold, color: colors.primary, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: fonts.sizes.lg, color: colors.textSecondary, textAlign: 'center', marginBottom: 8 },
  infoText: { color: colors.textSecondary, fontSize: fonts.sizes.sm, textAlign: 'center', marginBottom: 24 },
  successText: { color: '#4CAF50', fontSize: fonts.sizes.md, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: colors.textSecondary, fontSize: fonts.sizes.sm },
  linkHighlight: { color: colors.primary, fontWeight: fonts.weights.semibold },
});
