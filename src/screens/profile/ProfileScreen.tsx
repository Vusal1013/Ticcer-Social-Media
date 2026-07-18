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
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewsCount, setViewsCount] = useState(0);

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

        if (user) {
          const { data: existingView } = await supabase
            .from('profile_views')
            .select('id')
            .eq('viewer_id', user.id)
            .eq('profile_id', paramUserId)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();
          if (!existingView) {
            await supabase.from('profile_views').insert({
              viewer_id: user.id,
              profile_id: paramUserId,
            });
          }
        }
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

      if (user && paramUserId && paramUserId !== user.id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', paramUserId)
          .maybeSingle();
        setIsFollowing(!!followData);
      }

      if (isOwnProfile) {
        fetchSavedPosts();
        supabase.from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', targetId)
          .then(({ count }) => setViewsCount(count ?? 0));
      }
    }
    loadProfile();
  }, [targetId, user, paramUserId, isOwnProfile]));

  useEffect(() => {
    if (mediaTab === 'saved') fetchSavedPosts();
  }, [mediaTab]);

  const displayProfile = isOwnProfile ? myProfile : profileUser;

  function handleShareProfile() {
    if (!displayProfile) return;
    navigation.navigate('ConversationsList', { shareProfile: displayProfile });
  }

  async function handleFollow() {
    if (!user || !paramUserId) return;
    await supabase.from('follows').insert({ follower_id: user.id, following_id: paramUserId });
    setIsFollowing(true);
    setFollowersCount(prev => prev + 1);
  }

  async function handleUnfollow() {
    if (!user || !paramUserId) return;
    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', paramUserId);
    setIsFollowing(false);
    setFollowersCount(prev => Math.max(0, prev - 1));
  }

  const imagePosts = userPosts.filter((p: any) => p.image_url);
  const videoReels = userReels.filter((r: any) => r.video_url);

  return (
    <LinearGradient colors={['#0F172A', '#000000']} style={styles.container}>
      {isOwnProfile ? (
        <View style={styles.header}>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity onPress={() => navigation.navigate('CloseFriends')} activeOpacity={0.7}>
              <Ionicons name="people-circle-outline" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShareProfile} activeOpacity={0.7}>
              <Ionicons name="paper-plane-outline" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} activeOpacity={0.7}>
              <Ionicons name="settings-outline" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity onPress={handleShareProfile} activeOpacity={0.7}>
              <Ionicons name="paper-plane-outline" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.profileSection}>
        <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
          <View style={styles.avatarInner}>
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
        </View>

        <View style={styles.nameRow}>
          <Text style={[styles.fullName, { color: colors.text }]}>{displayProfile?.full_name || 'Adsız'}</Text>
          {displayProfile?.verified_type && displayProfile?.verified_type !== 'none' &&
            (displayProfile?.verified_type === 'gold' ? (
              <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
            ) : (
              <VerifiedBadge size={18} type={displayProfile?.verified_type} />
            ))}
        </View>
        <Text style={[styles.username, { color: colors.textMuted }]}>@{displayProfile?.username || 'username'}</Text>
        {displayProfile?.bio ? (
          <Text style={[styles.bio, { color: colors.textSecondary }]}>{displayProfile.bio}</Text>
        ) : null}

        <View style={[styles.statsRow, { borderColor: colors.glassBorder }]}>
          <View style={styles.stat}>
            <Text style={[styles.statCount, { color: colors.text }]}>{postsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Paylaşımlar</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.glassBorder }]} />
          <TouchableOpacity
            style={styles.stat}
            onPress={() => navigation.navigate('Followers', { userId: targetId, profileName: displayProfile?.full_name })}
            activeOpacity={0.7}
          >
            <Text style={[styles.statCount, { color: colors.text }]}>{followersCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>İzləyicilər</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: colors.glassBorder }]} />
          <TouchableOpacity
            style={styles.stat}
            onPress={() => navigation.navigate('Following', { userId: targetId })}
            activeOpacity={0.7}
          >
            <Text style={[styles.statCount, { color: colors.text }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>İzlənilən</Text>
          </TouchableOpacity>
          {isOwnProfile && (
            <>
              <View style={[styles.statDivider, { backgroundColor: colors.glassBorder }]} />
              <TouchableOpacity
                style={styles.stat}
                onPress={() => navigation.navigate('ProfileViews')}
                activeOpacity={0.7}
              >
                <Text style={[styles.statCount, { color: colors.text }]}>{viewsCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Görüntülər</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {!isOwnProfile && (
          <View style={styles.followRow}>
            {isFollowing ? (
              <TouchableOpacity style={styles.followingBtn} onPress={handleUnfollow} activeOpacity={0.8}>
                <Text style={styles.followingBtnText}>İzlənir</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.followBtn} onPress={handleFollow} activeOpacity={0.9}>
                <LinearGradient
                  colors={['#b76dff', '#0566d9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.followGradient}
                >
                  <Text style={styles.followBtnText}>İzlə</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity
          style={[styles.tab, mediaTab === 'posts' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setMediaTab('posts')}
        >
          <Ionicons
            name="grid"
            size={28}
            color={mediaTab === 'posts' ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mediaTab === 'reels' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setMediaTab('reels')}
        >
          <Ionicons
            name="play-circle-outline"
            size={28}
            color={mediaTab === 'reels' ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
        {isOwnProfile && (
          <TouchableOpacity
            style={[styles.tab, mediaTab === 'saved' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setMediaTab('saved')}
          >
            <Ionicons
              name={mediaTab === 'saved' ? 'bookmark' : 'bookmark-outline'}
              size={28}
              color={mediaTab === 'saved' ? colors.primary : colors.textMuted}
            />
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
                style={styles.gridItem}
                onPress={() => navigation.navigate('FeedTab', { screen: 'PostDetail', params: { post: item, source: 'ProfileTab' } })}
                activeOpacity={0.8}
              >
                <Image source={{ uri: item.image_url }} style={styles.gridImage} />
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { borderColor: colors.textMuted }]}>
              <Ionicons name="image-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Hələ şəkil yoxdur</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>İlk şəklinizi paylaşaraq profilinizi canlandırın.</Text>
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
              <TouchableOpacity style={styles.gridItem} activeOpacity={0.8}>
                <Image source={{ uri: item.thumbnail_url || item.video_url }} style={styles.gridImage} />
                <View style={styles.playOverlay}>
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { borderColor: colors.textMuted }]}>
              <Ionicons name="videocam-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Hələ video yoxdur</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>İlk videonuzu paylaşaraq profilinizi canlandırın.</Text>
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
                style={styles.gridItem}
                onPress={() => navigation.navigate('FeedTab', { screen: 'PostDetail', params: { post: item, source: 'ProfileTab' } })}
                activeOpacity={0.8}
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
            <View style={[styles.emptyIcon, { borderColor: colors.textMuted }]}>
              <Ionicons name="bookmark-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Saxlanılan post yoxdur</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Bəyəndiyiniz postları saxlayın.</Text>
          </View>
        )
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  profileSection: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 36, fontWeight: fonts.weights.bold, color: '#FFFFFF' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24 },
  fullName: { fontSize: 22, fontWeight: fonts.weights.semibold },
  username: { fontSize: 14, marginTop: 4 },
  bio: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 300 },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 16,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
  },
  followRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingHorizontal: 32,
    width: '100%',
  },
  followBtn: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  followGradient: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  followingBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  followingBtnText: {
    color: '#dae2fd',
    fontSize: 14,
    fontWeight: '700',
  },
  stat: { alignItems: 'center' },
  statDivider: { width: 1, height: 32 },
  statCount: { fontSize: 20, fontWeight: fonts.weights.semibold },
  statLabel: { fontSize: 12, fontWeight: fonts.weights.medium, marginTop: 4 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  grid: { padding: 2 },
  gridItem: {
    flex: 1,
    margin: 1,
    aspectRatio: 1,
    overflow: 'hidden',
  },
  gridImage: { width: '100%', height: '100%' },
  playOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 64,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: fonts.weights.semibold,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
