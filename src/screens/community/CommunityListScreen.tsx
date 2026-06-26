import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import VerifiedBadge from '../../components/VerifiedBadge';
import { colors, fonts } from '../../constants/theme';

type Community = {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  verified: boolean;
  owner_id: string;
  member_count?: number;
  is_member?: boolean;
};

export default function CommunityListScreen({ navigation }: any) {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

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

      setCommunities(data.map((c: any) => ({
        ...c,
        member_count: c.members?.[0]?.count ?? 0,
        is_member: memberIds.has(c.id),
      })));
    }
    setLoading(false);
  }

  useEffect(() => { fetchCommunities(); }, []);

  async function joinCommunity(communityId: string) {
    const { error } = await supabase.from('community_members').insert({
      community_id: communityId, user_id: user!.id, role: 'member',
    });
    if (error) return Alert.alert('Xeta', error.message);
    fetchCommunities();
  }

  async function leaveCommunity(communityId: string) {
    const { error } = await supabase.from('community_members').delete()
      .eq('community_id', communityId).eq('user_id', user!.id);
    if (error) return Alert.alert('Xeta', error.message);
    fetchCommunities();
  }

  const renderItem = useCallback(({ item }: { item: Community }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CommunityDetail', { community: item })}
    >
      {item.icon_url ? (
        <Image source={{ uri: item.icon_url }} style={styles.icon} />
      ) : (
        <View style={[styles.icon, styles.iconPlaceholder]}>
          <Text style={styles.iconLetter}>{item.name[0]}</Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          {item.verified && <VerifiedBadge size={14} />}
        </View>
        <Text style={styles.memberCount}>{item.member_count} uye</Text>
        {item.description ? <Text style={styles.desc} numberOfLines={1}>{item.description}</Text> : null}
      </View>
      <TouchableOpacity
        style={[styles.joinBtn, item.is_member && styles.joinedBtn]}
        onPress={() => item.is_member ? leaveCommunity(item.id) : joinCommunity(item.id)}
      >
        <Text style={[styles.joinBtnText, item.is_member && styles.joinedBtnText]}>
          {item.is_member ? 'Cix' : 'Qatil'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), []);

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Topluluqlar</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateCommunity')} style={styles.createBtn}>
          <Text style={styles.createBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={communities}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Henuz topluluq yox</Text>}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  title: { fontSize: fonts.sizes.xl, fontWeight: '700', color: colors.text },
  createBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: colors.white, fontSize: 22, fontWeight: '700', marginTop: -2 },
  list: { padding: 16, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12 },
  icon: { width: 50, height: 50, borderRadius: 12 },
  iconPlaceholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  iconLetter: { color: colors.white, fontSize: 22, fontWeight: '700' },
  info: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { color: colors.text, fontWeight: '600', fontSize: fonts.sizes.md },
  memberCount: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginTop: 2 },
  desc: { color: colors.textSecondary, fontSize: fonts.sizes.xs, marginTop: 2 },
  joinBtn: { backgroundColor: colors.primary + '30', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  joinedBtn: { backgroundColor: colors.error + '20' },
  joinBtnText: { color: colors.primary, fontWeight: '600', fontSize: fonts.sizes.sm },
  joinedBtnText: { color: colors.error },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 60 },
});
