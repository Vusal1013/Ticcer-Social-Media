import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import { useLanguage } from '../../i18n/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/theme';
import { getLocaleLabel } from '../../i18n';
import type { Locale } from '../../types';

const LANGUAGES: { id: Locale; flag: string }[] = [
  { id: 'az', flag: '🇦🇿' },
  { id: 'en', flag: '🇬🇧' },
  { id: 'ru', flag: '🇷🇺' },
  { id: 'zh', flag: '🇨🇳' },
  { id: 'es', flag: '🇪🇸' },
  { id: 'hi', flag: '🇮🇳' },
  { id: 'ar', flag: '🇸🇦' },
  { id: 'pt', flag: '🇧🇷' },
  { id: 'fr', flag: '🇫🇷' },
  { id: 'de', flag: '🇩🇪' },
  { id: 'ja', flag: '🇯🇵' },
  { id: 'ko', flag: '🇰🇷' },
  { id: 'tr', flag: '🇹🇷' },
];

export default function LanguageSelectorScreen({ navigation }: any) {
  const { profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const { locale, setLocale, deviceLocale, isAuto, setAuto } = useLanguage();

  async function handleSelectLanguage(lang: Locale) {
    setLocale(lang);
    if (profile) {
      await supabase.from('profiles').update({ language: lang }).eq('id', profile.id);
      await refreshProfile();
    }
  }

  async function handleAuto() {
    setAuto();
    if (profile) {
      await supabase.from('profiles').update({ language: deviceLocale }).eq('id', profile.id);
      await refreshProfile();
    }
  }

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Dil Seçin</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.autoBanner, { backgroundColor: isAuto ? colors.primary + '15' : colors.card, borderColor: isAuto ? colors.primary + '30' : colors.border }]}>
        <TouchableOpacity style={styles.autoRow} onPress={handleAuto} activeOpacity={0.7}>
          <Ionicons name="phone-portrait-outline" size={20} color={isAuto ? colors.primary : colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.autoTitle, { color: colors.text }]}>Avtomatik (Cihaz dili)</Text>
            <Text style={[styles.autoDesc, { color: colors.textMuted }]}>
              {getLocaleLabel(deviceLocale)} dilinə uyğunlaşır
            </Text>
          </View>
          {isAuto && (
            <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Və ya əl ilə seçin:</Text>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {LANGUAGES.map((lang) => {
          const isSelected = locale === lang.id;
          return (
            <TouchableOpacity
              key={lang.id}
              style={[styles.option, { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.border }]}
              onPress={() => handleSelectLanguage(lang.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text style={[styles.langName, { color: colors.text }]}>{getLocaleLabel(lang.id)}</Text>
              {lang.id === deviceLocale && (
                <View style={[styles.deviceBadge, { backgroundColor: colors.success + '20' }]}>
                  <Text style={[styles.deviceText, { color: colors.success }]}>Cihaz</Text>
                </View>
              )}
              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
  },
  title: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
  autoBanner: {
    marginHorizontal: 16, marginBottom: 16, padding: 4, borderRadius: 14, borderWidth: 1,
  },
  autoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
  },
  autoTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold },
  autoDesc: { fontSize: fonts.sizes.xs, marginTop: 1 },
  sectionLabel: { fontSize: fonts.sizes.xs, marginHorizontal: 16, marginBottom: 8, fontWeight: fonts.weights.semibold },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 14, borderWidth: 1.5,
  },
  flag: { fontSize: 28 },
  langName: { flex: 1, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  deviceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 6 },
  deviceText: { fontSize: 10, fontWeight: '700' },
  checkBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
