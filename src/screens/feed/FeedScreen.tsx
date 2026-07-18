import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import PostCard from '../../components/PostCard';
import StoryPreview from '../../components/StoryPreview';
import StoryViewer from '../../components/StoryViewer';
import LiveViewerScreen from '../live/LiveViewerScreen';
import { fonts } from '../../constants/theme';
import type { Post } from '../../types';

export default function FeedScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<any[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyVisible, setStoryVisible] = useState(false);
  const [liveView, setLiveView] = useState<{ live: any; broadcaster: any } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

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

    const { data: savedData } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', user.id);
    const savedSet = new Set((savedData || []).map((s: any) => s.post_id));

    const { data: closeFriendData } = await supabase
      .from('close_friends')
      .select('friend_id')
      .eq('user_id', user.id);
    const myCloseFriendIds = new Set((closeFriendData || []).map((cf: any) => cf.friend_id));

    const { data } = await supabase
      .from('posts')
      .select(`*, profile:profiles(*), likes:post_likes(count), comments:post_comments(count)`)
      .order('created_at', { ascending: false });

    if (data) {
      const followingSet = new Set(followingIds);
      const filtered = data.filter((p: any) => {
        if (p.user_id === user.id) return true;
        if (p.visibility === 'close_friends') {
          return myCloseFriendIds.has(p.user_id);
        }
        return true;
      });

      const followed = filtered.filter((p: any) => followingSet.has(p.user_id));
      const others = filtered.filter((p: any) => !followingSet.has(p.user_id) && p.user_id !== user.id).slice(0, 5);

      setPosts([...followed, ...others].map((p: any) => ({
        ...p,
        likes_count: p.likes?.[0]?.count ?? 0,
        comments_count: p.comments?.[0]?.count ?? 0,
        is_liked: false,
        is_saved: savedSet.has(p.id),
      })));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (count !== null) setUnreadCount(count);
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  useFocusEffect(useCallback(() => {
    fetchPosts();
    if (user) {
      supabase.from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
        .then(({ count }) => {
          if (count !== null) setUnreadCount(count);
        });
    }
  }, [user]));

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard post={item} onPress={() => navigation.navigate('PostDetail', { post: item })} />
  ), [navigation]);

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('CreateStory')} style={styles.headerBtn}>
            <Ionicons name="camera-outline" size={24} color={colors.text} />
          </TouchableOpacity>

        </View>
        <Text style={[styles.logo, { color: colors.primary }]}>Ticcer</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.headerBtn}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ConversationsList')} style={styles.headerBtn}>
            <Ionicons name="paper-plane-outline" size={24} color={colors.text} />
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
                onLivePress={(live, broadcaster) => setLiveView({ live, broadcaster })}
              />
            </View>
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Hələ post yoxdur. İzləməyə başla!
            </Text>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <Ionicons name="create-outline" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal visible={storyVisible} animationType="fade" statusBarTranslucent>
        <StoryViewer stories={stories} initialIndex={storyIndex} onClose={() => setStoryVisible(false)} />
      </Modal>

      {liveView && (
        <Modal visible={true} animationType="fade" statusBarTranslucent>
          <LiveViewerScreen
            route={{ params: { live: liveView.live, broadcaster: liveView.broadcaster } }}
            navigation={{ goBack: () => setLiveView(null) } as any}
          />
        </Modal>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row', gap: 4 },
  badge: { position: 'absolute', top: -2, right: -4, backgroundColor: '#FF4757', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  logo: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold },
  list: { paddingBottom: 80 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: fonts.sizes.md },
  fab: {
    position: 'absolute', bottom: 80, right: 20, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },
});
