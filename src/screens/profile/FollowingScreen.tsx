import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { fonts } from '../../constants/theme';

type FollowingUser = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  verified_type: string;
  follows_back: boolean;
};

export default function FollowingScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { userId } = route.params || {};
  const targetId = userId || user?.id;

  const [users, setUsers] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  async function fetchFollowing() {
    if (!targetId) return;
    setLoading(true);

    const { data: follows } = await supabase
      .from('follows')
      .select('following_id, profile:profiles!following_id(*)')
      .eq('follower_id', targetId)
      .order('created_at', { ascending: false });

    if (!follows) { setLoading(false); return; }

    const myFollowIds: string[] = [];
    if (user) {
      const { data: myF } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      myFollowIds.push(...(myF?.map(f => f.following_id) || []));
    }

    const list: FollowingUser[] = follows.map(f => ({
      id: f.following_id,
      full_name: (f.profile as any)?.full_name || 'Adsız',
      username: (f.profile as any)?.username || 'username',
      avatar_url: (f.profile as any)?.avatar_url || null,
      verified_type: (f.profile as any)?.verified_type || 'none',
      follows_back: myFollowIds.includes(f.following_id),
    }));

    setUsers(list);
    setFollowingIds(new Set(myFollowIds));
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { fetchFollowing(); }, [targetId]));

  async function toggleFollow(targetUserId: string, currentlyFollowing: boolean) {
    if (!user) return;
    if (currentlyFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
      setFollowingIds(prev => { const n = new Set(prev); n.delete(targetUserId); return n; });
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, follows_back: false } : u));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
      setFollowingIds(prev => { const n = new Set(prev); n.add(targetUserId); return n; });
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, follows_back: true } : u));
    }
  }

  const filtered = search.trim()
    ? users.filter(u =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()))
    : users;

  function getBtnState(u: FollowingUser) {
    if (u.id === user?.id) return null;
    const isFollowing = followingIds.has(u.id);
    if (isFollowing) return 'following';
    return 'follow';
  }

  const renderItem = ({ item }: { item: FollowingUser }) => {
    const btnState = getBtnState(item);
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
              btnState === 'follow' && styles.followBtnActive,
            ]}
            onPress={() => toggleFollow(item.id, btnState === 'following')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={btnState === 'follow' ? ['#b76dff', '#0566d9'] : ['transparent', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.followGradient, btnState === 'following' && styles.followingGradient]}
            >
              <Text style={[
                styles.followBtnText,
                btnState === 'following' && styles.followingBtnText,
                btnState === 'follow' && styles.followBtnActiveText,
              ]}>
                {btnState === 'following' ? 'İzlənilir' : 'İzlə'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <LinearGradient colors={['#0F172A', '#000000']} style={styles.container}>
      <LinearGradient colors={['#0F172A', 'transparent']} style={styles.headerScrim} pointerEvents="none" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={28} color="#ddb7ff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İzlənilənlər</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="search-outline" size={24} color="#cfc2d6" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          Cəmi <Text style={styles.statsHighlight}>{users.length}</Text> nəfər
        </Text>
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
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={48} color="rgba(207, 194, 214, 0.2)" />
          </View>
          <Text style={styles.emptyTitle}>
            {search ? 'Nəticə tapılmadı' : 'Hələ heç kimi izləmirsiniz'}
          </Text>
          {!search && (
            <Text style={styles.emptyDesc}>Maraqlı kontentləri qaçırmamaq üçün yeni insanları tapın və izləyin.</Text>
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
  statsBar: { paddingHorizontal: 24, paddingTop: 100, paddingBottom: 4 },
  statsText: { fontSize: 14, color: '#94A3B8' },
  statsHighlight: { color: '#ddb7ff', fontWeight: '700' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
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
    padding: 16, marginBottom: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(221, 183, 255, 0.2)' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#222a3d' },
  avatarLetter: { fontSize: 18, fontWeight: '700', color: '#490080' },
  userInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 14, fontWeight: '700', color: '#dae2fd' },
  username: { fontSize: 14, color: '#94A3B8' },
  followBtn: { borderRadius: 999, overflow: 'hidden' },
  followGradient: { paddingHorizontal: 24, paddingVertical: 8 },
  followingGradient: { backgroundColor: '#2d3449', borderWidth: 1, borderColor: '#4d4354' },
  followingBtn: {},
  followBtnActive: {},
  followBtnText: { fontSize: 14, fontWeight: '700' },
  followingBtnText: { color: '#cfc2d6' },
  followBtnActiveText: { color: '#490080' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 96 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#171f33', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(77, 67, 84, 0.3)' },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#dae2fd', marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
});
