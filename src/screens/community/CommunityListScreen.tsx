import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import VerifiedBadge from '../../components/VerifiedBadge';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';

const CATEGORY_ICONS: Record<string, string> = {
  gaming: 'game-controller',
  music: 'musical-notes',
  art: 'color-palette',
  tech: 'code-slash',
  sports: 'football',
  education: 'school',
  social: 'people',
  other: 'apps',
};

type Community = {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  cover_url: string | null;
  category: string | null;
  privacy: string;
  verified_type: string | null;
  owner_id: string;
  member_count?: number;
  is_member?: boolean;
  pending_request?: boolean;
};

export default function CommunityListScreen({ navigation }: any) {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteModal, setInviteModal] = useState<Community | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [friendMembers, setFriendMembers] = useState<Record<string, { id: string; avatar_url: string | null; full_name: string }[]>>({});

  async function fetchCommunities() {
    const { data } = await supabase
      .from('communities')
      .select(`*, members:community_members(count)`)
      .order('created_at', { ascending: false });

    if (data) {
      const { data: myMemberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user!.id);

      const memberIds = new Set(myMemberships?.map(m => m.community_id) || []);

      const { data: myRequests } = await supabase
        .from('community_join_requests')
        .select('community_id')
        .eq('user_id', user!.id)
        .eq('status', 'pending');

      const requestIds = new Set(myRequests?.map(r => r.community_id) || []);

      const formatted = data.map((c: any) => ({
        ...c,
        member_count: c.members?.[0]?.count ?? 0,
        is_member: memberIds.has(c.id),
        pending_request: requestIds.has(c.id),
      }));
      setCommunities(formatted);
      fetchFriendMembers(formatted);
    }
    setLoading(false);
  }

  async function fetchFriendMembers(comms: Community[]) {
    if (!user || comms.length === 0) return;
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    if (!following || following.length === 0) return;
    const followingIds = following.map(f => f.following_id);
    const commIds = comms.map(c => c.id);
    const { data: members } = await supabase
      .from('community_members')
      .select('community_id, user_id, profile:profiles!user_id(avatar_url, full_name)')
      .in('community_id', commIds)
      .in('user_id', followingIds);
    if (!members) return;
    const grouped: Record<string, { id: string; avatar_url: string | null; full_name: string }[]> = {};
    members.forEach((m: any) => {
      if (!grouped[m.community_id]) grouped[m.community_id] = [];
      if (grouped[m.community_id].length < 3) {
        grouped[m.community_id].push({
          id: m.user_id,
          avatar_url: m.profile?.avatar_url || null,
          full_name: m.profile?.full_name || '?',
        });
      }
    });
    setFriendMembers(grouped);
  }

  useEffect(() => { fetchCommunities(); }, []);

  async function joinCommunity(community: Community) {
    if (community.privacy === 'public') {
      const { error } = await supabase.from('community_members').insert({
        community_id: community.id, user_id: user!.id, role: 'member',
      });
      if (error) return Alert.alert('Xeta', error.message);
      fetchCommunities();
    } else if (community.privacy === 'private') {
      const { error } = await supabase.from('community_join_requests').insert({
        community_id: community.id, user_id: user!.id, status: 'pending',
      });
      if (error) {
        if (error.message?.includes('already')) {
          return Alert.alert('Artıq sorğu göndərilib', 'Admin cavabını gözləyin');
        }
        return Alert.alert('Xeta', error.message);
      }
      Alert.alert('Sorğu göndərildi', 'Admin təsdiqlədikdən sonra qoşula biləcəksiniz');
      fetchCommunities();
    } else if (community.privacy === 'invite_only') {
      setInviteModal(community);
      setInviteCode('');
    }
  }

  async function handleInviteJoin() {
    if (!inviteCode.trim()) return Alert.alert('Xeta', 'Dəvət kodu daxil edin');
    if (!inviteModal) return;

    setInviteLoading(true);
    const { data, error } = await supabase.rpc('join_community_by_invite', {
      invite_code: inviteCode.trim(),
      user_id: user!.id,
    });

    setInviteLoading(false);
    if (error) {
      return Alert.alert('Xeta', error.message);
    }

    Alert.alert('Qoşuldunuz!', 'Topluluğa uğurla qatıldınız');
    setInviteModal(null);
    fetchCommunities();
  }

  async function leaveCommunity(communityId: string) {
    const { error } = await supabase.from('community_members').delete()
      .eq('community_id', communityId).eq('user_id', user!.id);
    if (error) return Alert.alert('Xeta', error.message);
    fetchCommunities();
  }

  function formatMemberCount(count: number): string {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace('.0', '') + 'K';
    }
    return String(count);
  }

  const filtered = search.trim()
    ? communities.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : communities;

  function renderAvatar(item: Community, size: number = 44) {
    const borderRadius = size / 2;
    if (item.icon_url) {
      return <Image source={{ uri: item.icon_url }} style={{ width: size, height: size, borderRadius }} />;
    }
    return (
      <View style={{ width: size, height: size, borderRadius, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: size * 0.45, fontWeight: '700' }}>{item.name[0]}</Text>
      </View>
    );
  }

  const renderItem = useCallback(({ item }: { item: Community }) => {
    const isJoined = item.is_member;
    return (
      <TouchableOpacity
        style={[styles.card, isJoined && styles.cardJoined]}
        onPress={() => navigation.navigate('CommunityDetail', { community: item })}
        activeOpacity={0.8}
      >
        {item.cover_url ? (
          <View style={styles.coverWrap}>
            <Image source={{ uri: item.cover_url }} style={styles.coverImage} />
            <LinearGradient colors={['transparent', 'rgba(30,41,59,0.7)']} style={styles.coverScrim} />
          </View>
        ) : null}
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            {item.cover_url ? (
              <View style={[styles.avatarOverCover, { width: 44, height: 44, borderRadius: 22 }]}>
                {renderAvatar(item, 44)}
              </View>
            ) : (
              renderAvatar(item, 44)
            )}
            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {item.verified_type && <VerifiedBadge size={14} type={item.verified_type as 'bronze' | 'platinum'} />}
              </View>
              <Text style={styles.memberCount}>{formatMemberCount(item.member_count || 0)} üzv</Text>
            </View>
            {item.pending_request ? (
              <View style={styles.pendingBtn}>
                <Text style={styles.pendingBtnText}>Gözləyir</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={isJoined ? styles.leaveBtn : styles.joinBtn}
                onPress={() => isJoined ? leaveCommunity(item.id) : joinCommunity(item)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isJoined ? ['transparent', 'transparent'] : ['#b76dff', '#0566d9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.btnGradient, isJoined && styles.leaveBtnGradient]}
                >
                  <Text style={[styles.btnText, isJoined && styles.leaveBtnText]}>
                    {isJoined ? 'Çıx' : 'Qatıl'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.tagRow}>
            {item.category && CATEGORY_ICONS[item.category] && (
              <View style={styles.categoryTag}>
                <Ionicons name={CATEGORY_ICONS[item.category] as any} size={11} color={colors.textMuted} />
                <Text style={styles.categoryTagText}>{item.category}</Text>
              </View>
            )}
            {item.privacy === 'private' && (
              <View style={styles.categoryTag}>
                <Ionicons name="lock-closed-outline" size={11} color={colors.textMuted} />
                <Text style={styles.categoryTagText}>Gizli</Text>
              </View>
            )}
          </View>
          {item.description ? (
            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          {friendMembers[item.id] && friendMembers[item.id].length > 0 ? (
            <View style={styles.friendRow}>
              <View style={styles.friendAvatars}>
                {friendMembers[item.id].map((f, i) => (
                  f.avatar_url ? (
                    <Image key={f.id} source={{ uri: f.avatar_url }} style={[styles.friendAvatar, i > 0 && { marginLeft: -8 }]} />
                  ) : (
                    <View key={f.id} style={[styles.friendAvatar, styles.friendAvatarPlaceholder, i > 0 && { marginLeft: -8 }]}>
                      <Text style={styles.friendAvatarLetter}>{f.full_name[0]}</Text>
                    </View>
                  )
                ))}
              </View>
              <Text style={styles.friendText}>
                {`+${friendMembers[item.id].length} dostunuz buradadır`}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <LinearGradient colors={['#0F172A', '#000000']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Topluluqlar</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateCommunity')} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Topluluq axtar..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Heç bir topluluq tapılmadı</Text>}
      />

      <Modal visible={!!inviteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dəvət kodu</Text>
              <TouchableOpacity onPress={() => setInviteModal(null)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              "{inviteModal?.name}" topluluğuna qoşulmaq üçün dəvət kodunu daxil edin
            </Text>
            <TextInput
              style={styles.inviteInput}
              placeholder="Kodu daxil edin"
              placeholderTextColor={colors.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.inviteBtn, inviteLoading && { opacity: 0.5 }]}
              onPress={handleInviteJoin}
              disabled={inviteLoading}
            >
              <Text style={styles.inviteBtnText}>{inviteLoading ? 'Yoxlanılır...' : 'Qoşul'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8,
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(23, 31, 51, 0.5)',
    alignItems: 'center', justifyContent: 'center',
  },

  searchContainer: { paddingHorizontal: 16, marginBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  searchIcon: { paddingLeft: 12 },
  searchInput: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 8,
    color: colors.text, fontSize: 14,
  },

  list: { padding: 16, gap: 12, paddingBottom: 100 },

  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cardJoined: {
    backgroundColor: 'rgba(45, 52, 73, 0.6)',
    borderColor: 'rgba(221, 183, 255, 0.3)',
  },
  coverWrap: { height: 100, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  cardBody: { padding: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarOverCover: { borderWidth: 2, borderColor: 'rgba(30,41,59,0.7)', marginTop: -44 },
  cardInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  memberCount: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  joinBtn: { borderRadius: 999, overflow: 'hidden' },
  btnGradient: { paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  leaveBtn: { borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  leaveBtnGradient: { backgroundColor: 'rgba(45, 52, 73, 0.5)' },
  leaveBtnText: { color: colors.text },

  pendingBtn: {
    backgroundColor: 'rgba(255, 165, 2, 0.2)', borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  pendingBtnText: { color: colors.warning, fontWeight: '700', fontSize: 13 },

  tagRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  categoryTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 5, paddingVertical: 2, paddingHorizontal: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  categoryTagText: { color: colors.textMuted, fontSize: 10, textTransform: 'capitalize' },
  desc: { color: 'rgba(218, 226, 253, 0.8)', fontSize: 14, lineHeight: 20, marginTop: 8 },

  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  friendAvatars: { flexDirection: 'row', alignItems: 'center' },
  friendAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(30, 41, 59, 0.7)' },
  friendAvatarPlaceholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  friendAvatarLetter: { color: '#fff', fontSize: 10, fontWeight: '700' },
  friendText: { color: colors.textMuted, fontSize: 12 },

  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 60 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1A1A3E', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  modalDesc: { color: colors.textSecondary, fontSize: 13, marginBottom: 16 },
  inviteInput: { backgroundColor: '#171F33', borderRadius: 12, padding: 14, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  inviteBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  inviteBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
