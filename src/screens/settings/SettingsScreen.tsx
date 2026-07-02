import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/theme';
import type { NotificationPreferences } from '../../types';

export default function SettingsScreen({ navigation }: any) {
  const { user, profile, signOut } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('notification_preferences').select('*').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) setPrefs(data);
        else {
          const defaults = { user_id: user.id, likes: true, comments: true, follows: true, mentions: true, messages: true };
          supabase.from('notification_preferences').insert(defaults).select().single()
            .then(({ data }) => { if (data) setPrefs(data); });
        }
      });
  }, [user]);

  async function updatePref(key: keyof NotificationPreferences, value: boolean) {
    if (!user || !prefs) return;
    const { data } = await supabase.from('notification_preferences').update({ [key]: value }).eq('user_id', user.id).select().single();
    if (data) setPrefs(data);
  }

  async function handleLogout() {
    try {
      await signOut();
    } catch (err) {
      Alert.alert('Xəta', 'Çıxış edilərkən xəta baş verdi');
    }
  }

  const notifItems = [
    { key: 'likes' as keyof NotificationPreferences, icon: 'heart', label: 'Bəyənmələr' },
    { key: 'comments' as keyof NotificationPreferences, icon: 'chatbubble-outline', label: 'Şərhlər' },
    { key: 'follows' as keyof NotificationPreferences, icon: 'people-outline', label: 'İzləmələr' },
    { key: 'mentions' as keyof NotificationPreferences, icon: 'megaphone-outline', label: 'Mentionlar' },
    { key: 'messages' as keyof NotificationPreferences, icon: 'mail-outline', label: 'Mesajlar' },
  ];

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>Geri</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Ayarlar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Görünüş</Text>

        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={toggleTheme}>
          <Ionicons name={mode === 'dark' ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.text} style={{ marginRight: 12 }} />
          <Text style={[styles.rowText, { color: colors.text }]}>Tema</Text>
          <Text style={[styles.rowValue, { color: colors.textMuted }]}>
            {mode === 'dark' ? 'Qaranlıq' : 'İşıqlı'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 24 }]}>Bildirişlər</Text>

        {notifItems.map((item) => (
          <View key={item.key} style={[styles.row, { borderBottomColor: colors.border }]}>
            <Ionicons name={item.icon} size={20} color={colors.text} style={{ marginRight: 12 }} />
            <Text style={[styles.rowText, { color: colors.text }]}>{item.label}</Text>
            <Switch
              value={prefs?.[item.key] ?? true}
              onValueChange={(val) => updatePref(item.key, val)}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={prefs?.[item.key] ? colors.primary : colors.textMuted}
            />
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 24 }]}>Hesab</Text>

        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="create-outline" size={20} color={colors.text} style={{ marginRight: 12 }} />
          <Text style={[styles.rowText, { color: colors.text }]}>Profili düzəlt</Text>
        </TouchableOpacity>

        {profile?.verified_type === 'gray' && (
          <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => navigation.navigate('GoldRequest')}>
            <Ionicons name="ribbon-outline" size={20} color={colors.warning} style={{ marginRight: 12 }} />
            <Text style={[styles.rowText, { color: colors.warning }]}>Gold istəyi göndər</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} style={{ marginRight: 12 }} />
          <Text style={[styles.rowText, { color: colors.error }]}>Çıxış et</Text>
        </TouchableOpacity>
      </ScrollView>
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
  sectionTitle: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.semibold, textTransform: 'uppercase', marginBottom: 4, marginLeft: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1,
  },
  rowIcon: { fontSize: 20, marginRight: 12 },
  rowText: { flex: 1, fontSize: fonts.sizes.md, fontWeight: fonts.weights.medium },
  rowValue: { fontSize: fonts.sizes.sm },
});
