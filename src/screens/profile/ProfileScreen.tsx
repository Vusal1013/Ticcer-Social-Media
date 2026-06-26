import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import VerifiedBadge from '../../components/VerifiedBadge';
import { fonts } from '../../constants/theme';

type MediaTab = 'posts' | 'reels';

export default function ProfileScreen({ navigation }: any) {
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [mediaTab, setMediaTab] = useState<MediaTab>('posts');
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userReels, setUserReels] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id)
      .then(({ count }) => setFollowersCount(count ?? 0));
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id)
      .then(({ count }) => setFollowingCount(count ?? 0));
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => setPostsCount(count ?? 0));
    supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setUserPosts(data || []));
    supabase.from('reels').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setUserReels(data || []));
  }, [user]);

  const imagePosts = userPosts.filter((p) => p.image_url);
  const videoReels = userReels.filter((r) => r.video_url);

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {profile?.role === 'admin' && (
          <TouchableOpacity onPress={() => navigation.navigate('AdminPanel')}>
            <Text style={[styles.adminText, { color: colors.warning }]}>Admin Panel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.settingsBtn, { borderColor: colors.border }]}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarLetter}>
                {(profile?.full_name || '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.nameRow}>
          <Text style={[styles.fullName, { color: colors.text }]}>{profile?.full_name || 'Adsız'}</Text>
          {profile?.verified && <VerifiedBadge size={18} />}
        </View>
        <Text style={[styles.username, { color: colors.textMuted }]}>@{profile?.username || 'username'}</Text>
        {profile?.bio ? <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text> : null}

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
          <Text style={[styles.tabIcon]}>🖼️</Text>
          <Text style={[styles.tabLabel, { color: mediaTab === 'posts' ? colors.primary : colors.textMuted }]}>Şəkillər</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mediaTab === 'reels' && [styles.activeTab, { borderBottomColor: colors.primary }]]}
          onPress={() => setMediaTab('reels')}
        >
          <Text style={[styles.tabIcon]}>🎬</Text>
          <Text style={[styles.tabLabel, { color: mediaTab === 'reels' ? colors.primary : colors.textMuted }]}>Videolar</Text>
        </TouchableOpacity>
      </View>

      {mediaTab === 'posts' ? (
        imagePosts.length > 0 ? (
          <FlatList
            data={imagePosts}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.gridItem, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('FeedTab', { screen: 'PostDetail', params: { post: item } })}
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
      ) : (
        videoReels.length > 0 ? (
          <FlatList
            data={videoReels}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.gridItem, { backgroundColor: colors.card }]}>
                <Image source={{ uri: item.thumbnail_url || item.video_url }} style={styles.gridImage} />
                <Text style={styles.videoOverlay}>▶️</Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Hələ video yoxdur</Text>
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
