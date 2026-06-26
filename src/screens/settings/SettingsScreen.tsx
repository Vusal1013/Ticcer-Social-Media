import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { fonts } from '../../constants/theme';

export default function SettingsScreen({ navigation }: any) {
  const { signOut } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();

  function handleLogout() {
    Alert.alert('Çıxış', 'Hesabdan çıxmaq istədiyinizə əminsiniz?', [
      { text: 'Ləğv et', style: 'cancel' },
      { text: 'Çıxış', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>Geri</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Ayarlar</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={toggleTheme}>
          <Text style={[styles.rowIcon]}>{mode === 'dark' ? '🌙' : '☀️'}</Text>
          <Text style={[styles.rowText, { color: colors.text }]}>Tema</Text>
          <Text style={[styles.rowValue, { color: colors.textMuted }]}>
            {mode === 'dark' ? 'Qaranlıq' : 'İşıqlı'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.rowIcon}>✏️</Text>
          <Text style={[styles.rowText, { color: colors.text }]}>Profili düzəlt</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={handleLogout}>
          <Text style={styles.rowIcon}>🚪</Text>
          <Text style={[styles.rowText, { color: colors.error }]}>Çıxış et</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  title: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold },
  content: { padding: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1,
  },
  rowIcon: { fontSize: 20, marginRight: 12 },
  rowText: { flex: 1, fontSize: fonts.sizes.md, fontWeight: fonts.weights.medium },
  rowValue: { fontSize: fonts.sizes.sm },
});
