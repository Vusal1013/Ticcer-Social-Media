import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { fonts } from '../../constants/theme';
import type { Profile } from '../../types';

export default function SearchScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  async function fetchFollowingIds() {
    if (!user) return;
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    setFollowingIds(new Set((data || []).map((f: any) => f.following_id)));
  }

  useFocusEffect(useCallback(() => {
    fetchFollowingIds();
  }, []));

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(20);
      if (data) setResults(data);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleFollow(targetId: string) {
    await supabase.from('follows').insert({ follower_id: user!.id, following_id: targetId });
    setFollowingIds((prev) => new Set([...prev, targetId]));
  }

  async function handleUnfollow(targetId: string) {
    await supabase.from('follows').delete().eq('follower_id', user!.id).eq('following_id', targetId);
    setFollowingIds((prev) => { const s = new Set(prev); s.delete(targetId); return s; });
  }

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Axtarış</Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.searchIcon, { color: colors.textMuted }]}>🔍</Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="İstifadəçi axtar..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={[styles.clearBtn, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {searching ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userItem, { borderBottomColor: colors.border }]}
              onPress={() => navigation.navigate('ProfileTab', { screen: 'ProfileMain', params: { userId: item.id } })}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{item.full_name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
                <Text style={[styles.fullName, { color: colors.textMuted }]}>{item.full_name}</Text>
              </View>
              {item.id !== user?.id && (
                followingIds.has(item.id) ? (
                  <TouchableOpacity style={[styles.followingBtn, { borderColor: colors.border }]} onPress={() => handleUnfollow(item.id)}>
                    <Text style={[styles.followingText, { color: colors.text }]}>İzlənir</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.followBtn, { backgroundColor: colors.primary }]} onPress={() => handleFollow(item.id)}>
                    <Text style={styles.followBtnText}>İzlə</Text>
                  </TouchableOpacity>
                )
              )}
            </TouchableOpacity>
          )}
        />
      ) : query.trim() ? (
        <Text style={[styles.noResults, { color: colors.textMuted }]}>İstifadəçi tapılmadı</Text>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', margin: 16, borderRadius: 12,
    borderWidth: 1, paddingHorizontal: 12, height: 44,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: fonts.sizes.md },
  clearBtn: { fontSize: 16, padding: 4 },
  list: { paddingHorizontal: 16 },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: fonts.weights.bold },
  userInfo: { flex: 1, marginLeft: 12 },
  username: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  fullName: { fontSize: fonts.sizes.sm, marginTop: 2 },
  followBtn: { borderRadius: 16, paddingVertical: 6, paddingHorizontal: 16 },
  followBtnText: { color: '#FFFFFF', fontWeight: fonts.weights.semibold, fontSize: fonts.sizes.sm },
  followingBtn: { borderRadius: 16, paddingVertical: 6, paddingHorizontal: 16, borderWidth: 1 },
  followingText: { fontWeight: fonts.weights.semibold, fontSize: fonts.sizes.sm },
  noResults: { textAlign: 'center', marginTop: 40, fontSize: fonts.sizes.md },
});
