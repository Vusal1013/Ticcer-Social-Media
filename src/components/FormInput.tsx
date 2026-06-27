import { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, type KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../constants/theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  error?: string;
};

export default function FormInput({
  label, value, onChangeText, secureTextEntry, autoCapitalize, keyboardType, error,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          placeholderTextColor={colors.textMuted}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { color: colors.textSecondary, fontSize: fonts.sizes.sm, marginBottom: 6, fontWeight: fonts.weights.medium },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  input: {
    flex: 1, padding: 14,
    color: colors.text, fontSize: fonts.sizes.md,
  },
  inputError: { borderColor: colors.error },
  eyeBtn: { padding: 10, paddingRight: 14 },
  eyeIcon: { fontSize: 18 },
  error: { color: colors.error, fontSize: fonts.sizes.xs, marginTop: 4 },
});
