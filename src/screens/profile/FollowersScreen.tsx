import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { fonts } from '../../constants/theme';

type Follower = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  verified_type: string;
  is_following_back: boolean;
};

export default function FollowersScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { userId, profileName } = route.params || {};
  const targetId = userId || user?.id;
  const isOwn = !userId || userId === user?.id;

  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  async function fetchFollowers() {
    if (!targetId) return;
    setLoading(true);

    const { data: follows } = await supabase
      .from('follows')
      .select('follower_id, profile:profiles!follower_id(*)')
      .eq('following_id', targetId)
      .order('created_at', { ascending: false });

    if (!follows) { setLoading(false); return; }

    const myFollows: string[] = [];
    if (user && targetId !== user.id) {
      const { data: myF } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      myFollows.push(...(myF?.map(f => f.following_id) || []));
    } else if (user) {
      myFollows.push(...follows.map(f => f.follower_id));
    }

    const list: Follower[] = follows.map(f => ({
      id: f.follower_id,
      full_name: (f.profile as any)?.full_name || 'Adsız',
      username: (f.profile as any)?.username || 'username',
      avatar_url: (f.profile as any)?.avatar_url || null,
      verified_type: (f.profile as any)?.verified_type || 'none',
      is_following_back: myFollows.includes(f.follower_id),
    }));

    setFollowers(list);
    setFollowingIds(new Set(myFollows));

    // Also fetch own following to check follow-back if viewing others
    if (targetId !== user?.id && user) {
      const { data: ownFollows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      if (ownFollows) {
        setFollowingIds(new Set(ownFollows.map(f => f.following_id)));
      }
    }

    setLoading(false);
  }

  useFocusEffect(useCallback(() => { fetchFollowers(); }, [targetId]));

  async function toggleFollow(targetUserId: string, currentlyFollowing: boolean) {
    if (!user) return;
    if (currentlyFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
      setFollowingIds(prev => { const n = new Set(prev); n.delete(targetUserId); return n; });
      setFollowers(prev => prev.map(f => f.id === targetUserId ? { ...f, is_following_back: false } : f));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
      setFollowingIds(prev => { const n = new Set(prev); n.add(targetUserId); return n; });
      setFollowers(prev => prev.map(f => f.id === targetUserId ? { ...f, is_following_back: true } : f));
    }
  }

  const filtered = search.trim()
    ? followers.filter(f =>
        f.full_name.toLowerCase().includes(search.toLowerCase()) ||
        f.username.toLowerCase().includes(search.toLowerCase()))
    : followers;

  function getButtonState(f: Follower) {
    if (f.id === user?.id) return null;
    const isFollowing = followingIds.has(f.id);
    if (isFollowing && f.is_following_back) return 'following';
    if (isFollowing) return 'follows_you';
    return 'follow';
  }

  const renderFollower = ({ item }: { item: Follower }) => {
    const btnState = getButtonState(item);
    return (
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.rowLeft}
          onPress={() => navigation.navigate('ProfileMain', { userId: item.id })}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>{item.full_name[0].toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{item.full_name}</Text>
              {item.verified_type === 'gold' && (
                <Ionicons name="checkmark-circle" size={14} color="#FFD700" />
              )}
              {item.verified_type === 'gray' && (
                <Ionicons name="checkmark-circle" size={14} color="#8E8E93" />
              )}
              {item.verified_type === 'red' && (
                <Ionicons name="checkmark-circle" size={14} color="#FF3B30" />
              )}
            </View>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
        </TouchableOpacity>

        {btnState && (
          <TouchableOpacity
            style={[
              styles.followBtn,
              btnState === 'following' && styles.followingBtn,
              btnState === 'follows_you' && styles.followsYouBtn,
              btnState === 'follow' && styles.followBtnActive,
            ]}
            onPress={() => toggleFollow(item.id, btnState !== 'follow')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.followBtnText,
              btnState === 'following' && styles.followingBtnText,
              btnState === 'follows_you' && styles.followsYouBtnText,
              btnState === 'follow' && styles.followBtnActiveText,
            ]}>
              {btnState === 'following' ? 'İzləyirsən' : btnState === 'follows_you' ? 'Çıxar' : 'İzlə'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <LinearGradient colors={['#0F172A', '#0b1326']} style={styles.container}>
      <LinearGradient colors={['#0F172A', 'transparent']} style={styles.headerScrim} pointerEvents="none" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#cfc2d6" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İzləyicilər</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#cfc2d6" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Axtar..."
            placeholderTextColor="rgba(207, 194, 214, 0.5)"
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#ddb7ff" style={{ marginTop: 40 }} />
      ) : filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderFollower}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="people-outline" size={48} color="rgba(207, 194, 214, 0.2)" />
          </View>
          <Text style={styles.emptyTitle}>
            {search ? 'Nəticə tapılmadı' : 'Hələ izləyiciniz yoxdur.'}
          </Text>
          {!search && (
            <Text style={styles.emptyDesc}>Dostlarınızı dəvət edin və ya yeni insanları kəşf etməyə başlayın.</Text>
          )}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 80, zIndex: 10,
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingTop: 60, paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '600', color: '#dae2fd' },
  searchContainer: { paddingHorizontal: 16, paddingTop: 100, paddingBottom: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#131b2e', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(77, 67, 84, 0.3)',
    paddingHorizontal: 16, height: 48, gap: 12,
  },
  searchInput: { flex: 1, color: '#dae2fd', fontSize: 14, padding: 0 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, marginBottom: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarContainer: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(221, 183, 255, 0.2)' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#222a3d' },
  avatarLetter: { fontSize: 20, fontWeight: '700', color: '#490080' },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 14, fontWeight: '700', color: '#dae2fd' },
  username: { fontSize: 12, fontWeight: '500', color: '#cfc2d6', marginTop: 2 },
  followBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
  },
  followingBtn: { backgroundColor: '#0566d9' },
  followsYouBtn: { borderWidth: 1, borderColor: '#4d4354' },
  followBtnActive: { backgroundColor: '#ddb7ff' },
  followBtnText: { fontSize: 14, fontWeight: '700' },
  followingBtnText: { color: '#e6ecff' },
  followsYouBtnText: { color: '#cfc2d6' },
  followBtnActiveText: { color: '#490080' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 80 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#222a3d', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#dae2fd', marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: '#cfc2d6', textAlign: 'center', maxWidth: 240, lineHeight: 20 },
});
