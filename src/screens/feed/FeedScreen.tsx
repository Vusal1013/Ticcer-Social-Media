import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import PostCard from '../../components/PostCard';
import StoryPreview from '../../components/StoryPreview';
import StoryViewer from '../../components/StoryViewer';
import { fonts } from '../../constants/theme';
import type { Post, Profile } from '../../types';

export default function FeedScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<any[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyVisible, setStoryVisible] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);

  async function fetchFollowingIds(): Promise<string[]> {
    if (!user) return [];
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    return (data || []).map((f: any) => f.following_id);
  }

  async function fetchPosts() {
    if (!user) return;
    const followingIds = await fetchFollowingIds();

    const { data } = await supabase
      .from('posts')
      .select(`*, profile:profiles(*), likes:post_likes(count), comments:post_comments(count)`)
      .order('created_at', { ascending: false });

    if (data) {
      const followingSet = new Set(followingIds);
      const followed = data.filter((p: any) => followingSet.has(p.user_id));
      const others = data.filter((p: any) => !followingSet.has(p.user_id) && p.user_id !== user.id).slice(0, 5);

      setPosts([...followed, ...others].map((p: any) => ({
        ...p,
        likes_count: p.likes?.[0]?.count ?? 0,
        comments_count: p.comments?.[0]?.count ?? 0,
        is_liked: false,
      })));
    }
    setLoading(false);
  }

  async function fetchSuggestedUsers() {
    if (!user) return;
    const followingIds = await fetchFollowingIds();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .not('id', 'eq', user.id)
      .limit(10);

    if (data) {
      setSuggestedUsers(data.filter((p) => !followingIds.includes(p.id)));
    }
  }

  async function handleFollow(targetId: string) {
    await supabase.from('follows').insert({ follower_id: user!.id, following_id: targetId });
    setSuggestedUsers((prev) => prev.filter((p) => p.id !== targetId));
    fetchPosts();
  }

  useEffect(() => {
    fetchPosts();
    fetchSuggestedUsers();
    const channel = supabase.channel('feed-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts())
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') console.warn('Realtime feed status:', status);
      });
    return () => { supabase.removeChannel(channel); };
  }, []);

  useFocusEffect(useCallback(() => {
    fetchPosts();
  }, []));

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard post={item} onPress={() => navigation.navigate('PostDetail', { post: item })} />
  ), [navigation]);

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.logo, { color: colors.primary }]}>Ticcer</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('CreateStory')} style={[styles.storyBtn, { backgroundColor: colors.primary + '30' }]}>
            <Text style={[styles.storyBtnText, { color: colors.primary }]}>Story</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CreatePost')} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.createText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <StoryPreview
                onPress={(storyList, idx) => {
                  setStories(storyList);
                  setStoryIndex(idx);
                  setStoryVisible(true);
                }}
              />
              {suggestedUsers.length > 0 && (
                <View style={[styles.suggestedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.suggestedTitle, { color: colors.text }]}>Tövsiyə olunanlar</Text>
                  <FlatList
                    horizontal
                    data={suggestedUsers}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <View style={styles.suggestedUser}>
                        <View style={[styles.suggestedAvatar, { backgroundColor: colors.primary }]}>
                          <Text style={styles.suggestedAvatarText}>
                            {item.full_name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.suggestedName, { color: colors.text }]} numberOfLines={1}>
                          {item.username}
                        </Text>
                        <TouchableOpacity
                          style={[styles.followBtn, { backgroundColor: colors.primary }]}
                          onPress={() => handleFollow(item.id)}
                        >
                          <Text style={styles.followBtnText}>+ İzlə</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Hələ post yoxdur. İzləməyə başla!
            </Text>
          }
        />
      )}

      <Modal visible={storyVisible} animationType="fade" statusBarTranslucent>
        <StoryViewer stories={stories} initialIndex={storyIndex} onClose={() => setStoryVisible(false)} />
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1,
  },
  logo: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold },
  headerRight: { flexDirection: 'row', gap: 8 },
  storyBtn: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  storyBtnText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  createBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  createText: { color: '#FFFFFF', fontSize: 22, fontWeight: fonts.weights.bold, marginTop: -2 },
  list: { paddingBottom: 20 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: fonts.sizes.md },
  suggestedCard: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 8, padding: 12,
    borderRadius: 16, borderWidth: 1,
  },
  suggestedTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, marginBottom: 10 },
  suggestedUser: { alignItems: 'center', marginRight: 16, width: 80 },
  suggestedAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  suggestedAvatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: fonts.weights.bold },
  suggestedName: { fontSize: fonts.sizes.xs, marginTop: 4, textAlign: 'center' },
  followBtn: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 12, marginTop: 6 },
  followBtnText: { color: '#FFFFFF', fontSize: fonts.sizes.xs, fontWeight: fonts.weights.semibold },
});
