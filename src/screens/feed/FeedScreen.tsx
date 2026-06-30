import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import PostCard from '../../components/PostCard';
import StoryPreview from '../../components/StoryPreview';
import StoryViewer from '../../components/StoryViewer';
import { fonts } from '../../constants/theme';
import type { Post, AppNotification } from '../../types';

export default function FeedScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<any[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyVisible, setStoryVisible] = useState(false);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const toastAnim = useRef(new Animated.Value(-100)).current;

  function showToast(notification: AppNotification) {
    setToast(notification);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  function getToastIcon(type: string) {
    switch (type) {
      case 'like': return 'heart';
      case 'comment': return 'chatbubble-outline';
      case 'follow': return 'people-outline';
      case 'mention': return 'megaphone-outline';
      case 'message': return 'mail-outline';
      default: return 'notifications-outline';
    }
  }

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
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(1);
      if (notifs?.[0]) showToast(notifs[0] as AppNotification);

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

  useFocusEffect(useCallback(() => {
    fetchPosts();
  }, []));

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard post={item} onPress={() => navigation.navigate('PostDetail', { post: item })} />
  ), [navigation]);

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.navigate('CreateStory')} style={styles.headerBtn}>
          <Ionicons name="camera-outline" size={24} color={colors.text} />
        </TouchableOpacity>
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

      {toast && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Notifications')}
          style={{ position: 'absolute', top: 100, left: 16, right: 16, zIndex: 100 }}
        >
          <Animated.View style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ translateY: toastAnim }] }]}>
            <Ionicons name={getToastIcon(toast.type)} size={20} color={colors.text} style={{ marginRight: 10 }} />
            <View style={styles.toastContent}>
              <Text style={[styles.toastTitle, { color: colors.text }]} numberOfLines={1}>{toast.title}</Text>
              {toast.body && <Text style={[styles.toastBody, { color: colors.textSecondary }]} numberOfLines={1}>{toast.body}</Text>}
            </View>
          </Animated.View>
        </TouchableOpacity>
      )}

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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row', gap: 4 },
  badge: { position: 'absolute', top: -2, right: -4, backgroundColor: '#FF4757', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  logo: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold },
  toast: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12,
    borderWidth: 1, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6,
  },
  toastIcon: { fontSize: 20, marginRight: 10 },
  toastContent: { flex: 1 },
  toastTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  toastBody: { fontSize: fonts.sizes.xs, marginTop: 2 },
  list: { paddingBottom: 80 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: fonts.sizes.md },
  fab: {
    position: 'absolute', bottom: 80, right: 20, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },
});
