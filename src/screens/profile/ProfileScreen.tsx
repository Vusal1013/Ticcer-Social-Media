import { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import VerifiedBadge from '../../components/VerifiedBadge';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/theme';
import type { Profile } from '../../types';

type MediaTab = 'posts' | 'reels' | 'saved';

export default function ProfileScreen({ navigation, route }: any) {
  const { profile: myProfile, user } = useAuth();
  const { colors } = useTheme();
  const paramUserId = route?.params?.userId;
  const isOwnProfile = !paramUserId || paramUserId === user?.id;

  const [profileUser, setProfileUser] = useState<Profile | null>(isOwnProfile ? myProfile : null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [mediaTab, setMediaTab] = useState<MediaTab>('posts');
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userReels, setUserReels] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);

  const targetId = paramUserId || user?.id;

  async function fetchSavedPosts() {
    if (!targetId || !isOwnProfile) return;
    const { data } = await supabase
      .from('saved_posts')
      .select('*, post:posts(*, profile:profiles(*))')
      .eq('user_id', targetId)
      .order('created_at', { ascending: false });
    setSavedPosts(data?.map((s: any) => s.post) || []);
  }

  useFocusEffect(useCallback(() => {
    if (!targetId) return;

    async function loadProfile() {
      if (paramUserId && paramUserId !== user?.id) {
        const { data } = await supabase.from('profiles').select('*').eq('id', paramUserId).single();
        setProfileUser(data);
      }

      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', targetId)
        .then(({ count }) => setFollowersCount(count ?? 0));
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', targetId)
        .then(({ count }) => setFollowingCount(count ?? 0));
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', targetId)
        .then(({ count }) => setPostsCount(count ?? 0));
      supabase.from('posts').select('*, profile:profiles(*)').eq('user_id', targetId).order('created_at', { ascending: false })
        .then(({ data }) => setUserPosts(data || []));
      supabase.from('reels').select('*').eq('user_id', targetId).order('created_at', { ascending: false })
        .then(({ data }) => setUserReels(data || []));

      if (isOwnProfile) {
        fetchSavedPosts();
      }
    }
    loadProfile();
  }, [targetId, user, paramUserId, isOwnProfile]));

  useEffect(() => {
    if (mediaTab === 'saved') fetchSavedPosts();
  }, [mediaTab]);

  const displayProfile = isOwnProfile ? myProfile : profileUser;
  const imagePosts = userPosts.filter((p: any) => p.image_url);
  const videoReels = userReels.filter((r: any) => r.video_url);

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      {isOwnProfile && (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.settingsBtn, { borderColor: colors.border }]}>
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {!isOwnProfile && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Geri</Text>
        </TouchableOpacity>
      )}

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {displayProfile?.avatar_url ? (
            <Image source={{ uri: displayProfile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarLetter}>
                {(displayProfile?.full_name || '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.nameRow}>
          <Text style={[styles.fullName, { color: colors.text }]}>{displayProfile?.full_name || 'Adsız'}</Text>
          {displayProfile?.verified_type && displayProfile?.verified_type !== 'none' && <VerifiedBadge size={18} type={displayProfile?.verified_type} />}
        </View>
        <Text style={[styles.username, { color: colors.textMuted }]}>@{displayProfile?.username || 'username'}</Text>
        {displayProfile?.bio ? <Text style={[styles.bio, { color: colors.textSecondary }]}>{displayProfile.bio}</Text> : null}

        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          <View style={styles.stat}>
            <Text style={[styles.statCount, { color: colors.text }]}>{postsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Paylaşımlar</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statCount, { color: colors.text }]}>{followersCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>İzləyicilər</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statCount, { color: colors.text }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>İzlənilən</Text>
          </View>
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, mediaTab === 'posts' && [styles.activeTab, { borderBottomColor: colors.primary }]]}
          onPress={() => setMediaTab('posts')}
        >
          <Ionicons name="image-outline" size={16} color={mediaTab === 'posts' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: mediaTab === 'posts' ? colors.primary : colors.textMuted }]}>Şəkillər</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mediaTab === 'reels' && [styles.activeTab, { borderBottomColor: colors.primary }]]}
          onPress={() => setMediaTab('reels')}
        >
          <Ionicons name="videocam-outline" size={16} color={mediaTab === 'reels' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: mediaTab === 'reels' ? colors.primary : colors.textMuted }]}>Videolar</Text>
        </TouchableOpacity>
        {isOwnProfile && (
          <TouchableOpacity
            style={[styles.tab, mediaTab === 'saved' && [styles.activeTab, { borderBottomColor: colors.primary }]]}
            onPress={() => setMediaTab('saved')}
          >
            <Ionicons name="bookmark" size={16} color={mediaTab === 'saved' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: mediaTab === 'saved' ? colors.primary : colors.textMuted }]}>Saxlanılan</Text>
          </TouchableOpacity>
        )}
      </View>

      {mediaTab === 'posts' ? (
        imagePosts.length > 0 ? (
          <FlatList
            data={imagePosts}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.grid}
            renderItem={({ item }: { item: any }) => (
              <TouchableOpacity
                style={[styles.gridItem, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('FeedTab', { screen: 'PostDetail', params: { post: item, source: 'ProfileTab' } })}
              >
                <Image source={{ uri: item.image_url }} style={styles.gridImage} />
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Hələ şəkil yoxdur</Text>
          </View>
        )
      ) : mediaTab === 'reels' ? (
        videoReels.length > 0 ? (
          <FlatList
            data={videoReels}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.grid}
            renderItem={({ item }: { item: any }) => (
              <TouchableOpacity style={[styles.gridItem, { backgroundColor: colors.card }]}>
                <Image source={{ uri: item.thumbnail_url || item.video_url }} style={styles.gridImage} />
                <Ionicons name="play-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Hələ video yoxdur</Text>
          </View>
        )
      ) : (
        savedPosts.length > 0 ? (
          <FlatList
            data={savedPosts}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.grid}
            renderItem={({ item }: { item: any }) => (
              <TouchableOpacity
                style={[styles.gridItem, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('FeedTab', { screen: 'PostDetail', params: { post: item, source: 'ProfileTab' } })}
              >
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.gridImage} />
                ) : (
                  <View style={[styles.gridImage, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', padding: 2 }} numberOfLines={3}>{item.content}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Saxlanılan post yoxdur</Text>
          </View>
        )
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
  adminText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  settingsBtn: { borderRadius: 20, borderWidth: 1, padding: 8 },
  backBtn: { padding: 16, paddingTop: 60 },
  backText: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  profileSection: { alignItems: 'center', padding: 24 },
  avatarContainer: { marginBottom: 8 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 36, fontWeight: fonts.weights.bold, color: '#FFFFFF' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fullName: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold },
  username: { fontSize: fonts.sizes.sm, marginTop: 2 },
  bio: { fontSize: fonts.sizes.sm, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  statsRow: { flexDirection: 'row', marginTop: 20, gap: 40, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 14, justifyContent: 'center', width: '100%' },
  stat: { alignItems: 'center' },
  statCount: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
  statLabel: { fontSize: fonts.sizes.xs, marginTop: 2 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  activeTab: { borderBottomWidth: 2 },
  tabIcon: { fontSize: 16 },
  tabLabel: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  grid: { padding: 2 },
  gridItem: { flex: 1, margin: 2, aspectRatio: 1, borderRadius: 4, overflow: 'hidden' },
  gridImage: { width: '100%', height: '100%' },
  videoOverlay: { position: 'absolute', top: '40%', left: '40%', fontSize: 24 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: fonts.sizes.md },
});
