import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/theme';
import type { ProfileTheme } from '../../types';

const BUILTIN_THEMES: ProfileTheme[] = [
  { id: 'default', name: 'Standart', primary_color: '#6C63FF', secondary_color: '#FF6584', background_gradient: ['#0F0F23', '#1A1A3E'], card_color: '#252550' },
  { id: 'ocean', name: 'Okean', primary_color: '#0891B2', secondary_color: '#06B6D4', background_gradient: ['#0C1222', '#0E2A47'], card_color: '#163A5F' },
  { id: 'forest', name: 'Meşə', primary_color: '#059669', secondary_color: '#10B981', background_gradient: ['#0A1F15', '#0F2E1F'], card_color: '#1A3D2C' },
  { id: 'sunset', name: 'Günbatımı', primary_color: '#F59E0B', secondary_color: '#EF4444', background_gradient: ['#1C1007', '#2D1A0A'], card_color: '#3D2510' },
  { id: 'lavender', name: 'Lavanda', primary_color: '#A855F7', secondary_color: '#C084FC', background_gradient: ['#150A2A', '#200F3D'], card_color: '#2D1850' },
  { id: 'rose', name: 'Gül', primary_color: '#EC4899', secondary_color: '#F472B6', background_gradient: ['#1F0A15', '#2D1020'], card_color: '#3D1830' },
  { id: 'arctic', name: 'Arktika', primary_color: '#38BDF8', secondary_color: '#7DD3FC', background_gradient: ['#0A1628', '#0E2240'], card_color: '#163050' },
  { id: 'fire', name: 'Od', primary_color: '#EF4444', secondary_color: '#F97316', background_gradient: ['#1A0808', '#2D1010'], card_color: '#3D1818' },
  { id: 'neon', name: 'Neon', primary_color: '#22D3EE', secondary_color: '#A3E635', background_gradient: ['#050A0F', '#0A1414'], card_color: '#0F1E1E' },
  { id: 'midnight', name: 'Gecə Yarısı', primary_color: '#818CF8', secondary_color: '#6366F1', background_gradient: ['#08081A', '#0F0F30'], card_color: '#181845' },
];

export default function ThemeSelectorScreen({ navigation }: any) {
  const { profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const [selectedThemeId, setSelectedThemeId] = useState(profile?.theme_id || 'default');

  async function handleSelectTheme(themeId: string) {
    setSelectedThemeId(themeId);
    if (!profile) return;
    await supabase.from('profiles').update({ theme_id: themeId }).eq('id', profile.id);
    await refreshProfile();
  }

  function renderTheme({ item }: { item: ProfileTheme }) {
    const isSelected = selectedThemeId === item.id;
    return (
      <TouchableOpacity
        style={[styles.themeCard, isSelected && { borderColor: item.primary_color, borderWidth: 2 }]}
        onPress={() => handleSelectTheme(item.id)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={item.background_gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.themePreview}
        >
          <View style={styles.themePreviewHeader}>
            <View style={[styles.themeDot, { backgroundColor: item.primary_color }]} />
            <View style={[styles.themeBar, { backgroundColor: item.primary_color + '40' }]} />
          </View>
          <View style={[styles.themeCardInner, { backgroundColor: item.card_color }]}>
            <View style={[styles.themeLine, { backgroundColor: item.primary_color + '60', width: '70%' }]} />
            <View style={[styles.themeLine, { backgroundColor: item.secondary_color + '40', width: '50%' }]} />
          </View>
        </LinearGradient>
        <View style={styles.themeInfo}>
          <Text style={[styles.themeName, { color: colors.text }]}>{item.name}</Text>
          <View style={styles.themeColors}>
            <View style={[styles.colorDot, { backgroundColor: item.primary_color }]} />
            <View style={[styles.colorDot, { backgroundColor: item.secondary_color }]} />
          </View>
          {isSelected && (
            <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Profil Teması</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Profiliniz üçün tema seçin
      </Text>

      <FlatList
        data={BUILTIN_THEMES}
        keyExtractor={item => item.id}
        renderItem={renderTheme}
        numColumns={2}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
      />
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
  subtitle: { fontSize: fonts.sizes.sm, marginHorizontal: 16, marginBottom: 16 },
  list: { paddingBottom: 40, paddingHorizontal: 12 },
  row: { gap: 12 },
  themeCard: {
    flex: 1, marginBottom: 12, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  themePreview: { height: 120, padding: 10 },
  themePreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  themeDot: { width: 10, height: 10, borderRadius: 5 },
  themeBar: { flex: 1, height: 6, borderRadius: 3 },
  themeCardInner: { flex: 1, borderRadius: 8, padding: 8, justifyContent: 'center', gap: 4 },
  themeLine: { height: 4, borderRadius: 2 },
  themeInfo: { padding: 10, flexDirection: 'row', alignItems: 'center' },
  themeName: { flex: 1, fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  themeColors: { flexDirection: 'row', gap: 4 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  selectedBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
});
