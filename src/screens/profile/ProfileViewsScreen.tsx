import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/theme';
import type { Profile } from '../../types';

type ViewItem = {
  id: string;
  viewer_id: string;
  created_at: string;
  viewer: Profile;
};

function timeAgo(date: string) {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'İndi';
  if (mins < 60) return `${mins} dəq əvvəl`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat əvvəl`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün əvvəl`;
  return new Date(date).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' });
}

export default function ProfileViewsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [views, setViews] = useState<ViewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchViews();
  }, [user]);

  async function fetchViews() {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('profile_views')
      .select('*, viewer:profiles!profile_views_viewer_id_fkey(*)')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) setViews(data as any[]);
    setLoading(false);
  }

  function renderItem({ item }: { item: ViewItem }) {
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={() => navigation.navigate('ProfileMain', { userId: item.viewer.id })}
        activeOpacity={0.7}
      >
        {item.viewer?.avatar_url ? (
          <Image source={{ uri: item.viewer.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder, { backgroundColor: colors.primary }]}>
            <Text style={styles.placeholderText}>{(item.viewer?.full_name || '?')[0]}</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>{item.viewer?.full_name}</Text>
            {item.viewer?.verified_type && item.viewer?.verified_type !== 'none' && (
              <Ionicons
                name={item.viewer?.verified_type === 'gold' ? 'checkmark-circle' : 'shield-checkmark'}
                size={14}
                color={item.viewer?.verified_type === 'gold' ? '#FFD700' : colors.primary}
              />
            )}
          </View>
          <Text style={[styles.handle, { color: colors.textMuted }]}>@{item.viewer?.username}</Text>
        </View>
        <Text style={[styles.time, { color: colors.textMuted }]}>{timeAgo(item.created_at)}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Profil Görüntüləri</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={views}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="eye-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Hələ profil görüntüsü yoxdur</Text>
            </View>
          ) : null
        }
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
  list: { paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  info: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  handle: { fontSize: fonts.sizes.xs, marginTop: 1 },
  time: { fontSize: fonts.sizes.xs },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: fonts.sizes.md },
});
