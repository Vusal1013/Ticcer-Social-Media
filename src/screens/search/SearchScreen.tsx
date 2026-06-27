import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { fonts } from '../../constants/theme';
import type { Profile } from '../../types';

export default function SearchScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const initialHashtag = route?.params?.hashtag || '';
  const initialSearchUser = route?.params?.searchUser || '';
  const [query, setQuery] = useState(initialHashtag || initialSearchUser || '');
  const [results, setResults] = useState<Profile[]>([]);
  const [hashtagResults, setHashtagResults] = useState<any[]>([]);
  const [communityResults, setCommunityResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'users' | 'hashtags' | 'communities'>(initialHashtag ? 'hashtags' : 'users');

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
    if (!query.trim()) { setResults([]); setHashtagResults([]); setCommunityResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);

      if (mode === 'hashtags' || query.startsWith('#')) {
        const tag = query.replace('#', '').toLowerCase();
        const { data: posts } = await supabase
          .from('post_hashtags')
          .select('post_id, hashtags!inner(tag)')
          .eq('hashtags.tag', tag);
        if (posts) {
          const postIds = posts.map((p: any) => p.post_id);
          const { data: postsData } = await supabase
            .from('posts')
            .select('*, profile:profiles(*)')
            .in('id', postIds)
            .order('created_at', { ascending: false })
            .limit(20);
          setHashtagResults(postsData || []);
        }
        setResults([]);
        setCommunityResults([]);
      } else if (mode === 'communities') {
        const { data } = await supabase
          .from('communities')
          .select('*')
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(20);
        if (data) setCommunityResults(data);
        setResults([]);
        setHashtagResults([]);
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(20);
        if (data) setResults(data);
        setHashtagResults([]);
        setCommunityResults([]);
      }

      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, mode]);

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
          placeholder="İstifadəçi, #hashtag və ya community axtar..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={(t) => { setQuery(t); if (t.startsWith('#')) setMode('hashtags'); else setMode('users'); }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={[styles.clearBtn, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, mode === 'users' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setMode('users')}
        >
          <Text style={[styles.tabText, { color: mode === 'users' ? colors.primary : colors.textMuted }]}>İstifadəçilər</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'hashtags' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setMode('hashtags')}
        >
          <Text style={[styles.tabText, { color: mode === 'hashtags' ? colors.primary : colors.textMuted }]}>Hashtag</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'communities' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setMode('communities')}
        >
          <Text style={[styles.tabText, { color: mode === 'communities' ? colors.primary : colors.textMuted }]}>Community</Text>
        </TouchableOpacity>
      </View>

      {searching ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : mode === 'hashtags' && hashtagResults.length > 0 ? (
        <FlatList
          data={hashtagResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.postItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('FeedTab', { screen: 'PostDetail', params: { post: item, source: 'SearchTab' } })}
            >
              <Text style={[styles.postContent, { color: colors.text }]} numberOfLines={2}>{item.content}</Text>
              <Text style={[styles.postAuthor, { color: colors.textMuted }]}>@{item.profile?.username}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={null}
        />
      ) : mode === 'communities' && communityResults.length > 0 ? (
        <FlatList
          data={communityResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userItem, { borderBottomColor: colors.border }]}
              onPress={() => navigation.navigate('CommunityTab', { screen: 'CommunityDetail', params: { communityId: item.id, community: item } })}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase() || 'C'}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.username, { color: colors.text }]}>{item.name}</Text>
                {item.description && <Text style={[styles.fullName, { color: colors.textMuted }]} numberOfLines={1}>{item.description}</Text>}
              </View>
            </TouchableOpacity>
          )}
        />
      ) : mode === 'users' && results.length > 0 ? (
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
                <Text style={styles.avatarText}>{item.full_name?.charAt(0).toUpperCase() || '?'}</Text>
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
        <Text style={[styles.noResults, { color: colors.textMuted }]}>Nəticə tapılmadı</Text>
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
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabText: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
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
  postItem: {
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1,
  },
  postContent: { fontSize: fonts.sizes.sm, lineHeight: 18 },
  postAuthor: { fontSize: fonts.sizes.xs, marginTop: 4 },
  noResults: { textAlign: 'center', marginTop: 40, fontSize: fonts.sizes.md },
});
