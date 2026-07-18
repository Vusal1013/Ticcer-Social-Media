import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/theme';
import type { Profile } from '../../types';

type FriendItem = Profile & { is_close_friend: boolean };

export default function CloseFriendsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [closeFriends, setCloseFriends] = useState<FriendItem[]>([]);
  const [searchResults, setSearchResults] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    fetchCloseFriends();
  }, [user]));

  async function fetchCloseFriends() {
    if (!user) return;
    setLoading(true);

    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = (followingData || []).map((f: any) => f.following_id);

    if (followingIds.length === 0) {
      setCloseFriends([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followingIds);

    const { data: closeFriendData } = await supabase
      .from('close_friends')
      .select('friend_id')
      .eq('user_id', user.id);

    const closeFriendIds = new Set((closeFriendData || []).map((cf: any) => cf.friend_id));

    const friends: FriendItem[] = (profiles || []).map((p: any) => ({
      ...p,
      is_close_friend: closeFriendIds.has(p.id),
    }));

    setCloseFriends(friends);
    setLoading(false);
  }

  async function toggleCloseFriend(friendId: string, isCurrentlyClose: boolean) {
    if (!user) return;
    if (isCurrentlyClose) {
      await supabase.from('close_friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId);
    } else {
      await supabase.from('close_friends')
        .insert({ user_id: user.id, friend_id: friendId });
    }
    fetchCloseFriends();
  }

  async function handleSearch(query: string) {
    setSearch(query);
    if (!query.trim() || !user) {
      setSearchResults([]);
      return;
    }

    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = (followingData || []).map((f: any) => f.following_id);
    if (followingIds.length === 0) { setSearchResults([]); return; }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followingIds)
      .ilike('full_name', `%${query}%`)
      .limit(20);

    const { data: closeFriendData } = await supabase
      .from('close_friends')
      .select('friend_id')
      .eq('user_id', user.id);

    const closeFriendIds = new Set((closeFriendData || []).map((cf: any) => cf.friend_id));

    const results: FriendItem[] = (profiles || []).map((p: any) => ({
      ...p,
      is_close_friend: closeFriendIds.has(p.id),
    }));

    setSearchResults(results);
  }

  function renderItem({ item }: { item: FriendItem }) {
    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholder, { backgroundColor: colors.primary }]}>
            <Text style={styles.placeholderText}>{(item.full_name || '?')[0]}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{item.full_name}</Text>
          <Text style={[styles.handle, { color: colors.textMuted }]}>@{item.username}</Text>
        </View>
        <TouchableOpacity
          onPress={() => toggleCloseFriend(item.id, item.is_close_friend)}
          style={[
            styles.toggleBtn,
            item.is_close_friend
              ? { backgroundColor: colors.success + '20' }
              : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
          ]}
          activeOpacity={0.7}
        >
          {item.is_close_friend ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          ) : (
            <Ionicons name="add-circle-outline" size={20} color={colors.textMuted} />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  const displayData = search.trim() ? searchResults : closeFriends;

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Yaxın Dostlar</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.infoBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
        <Ionicons name="people" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Yalnız yaxın dostlarınızla paylaşdığınız postları görə bilərlər.
        </Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Dost axtar..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setSearchResults([]); }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.countLabel, { color: colors.textMuted }]}>
        {closeFriends.filter(f => f.is_close_friend).length} yaxın dost seçilib
      </Text>

      <FlatList
        data={displayData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {search.trim() ? 'Nəticə tapılmadı' : 'Hələ yaxın dost seçilməyib'}
            </Text>
          </View>
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
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12, borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: fonts.sizes.sm, lineHeight: 18 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: fonts.sizes.md },
  countLabel: { fontSize: fonts.sizes.xs, marginHorizontal: 16, marginBottom: 8 },
  list: { paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  handle: { fontSize: fonts.sizes.xs, marginTop: 1 },
  toggleBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: fonts.sizes.md },
});
