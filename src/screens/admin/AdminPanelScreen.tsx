import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import VerifiedBadge from '../../components/VerifiedBadge';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';
import type { Profile } from '../../types';

type Section = 'users' | 'gold_requests' | 'reports';

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam', harassment: 'Təhqir', hate_speech: 'Nifrət nitqi',
  nudity: 'Yetkin məzmun', violence: 'Zorakılıq', copyright: 'Müəllif hüququ', other: 'Digər',
};

export default function AdminPanelScreen({ navigation }: any) {
  const { profile: currentProfile } = useAuth();
  const [section, setSection] = useState<Section>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentProfile?.role !== 'admin' && currentProfile?.verified_type !== 'red') {
      navigation.goBack();
      return;
    }
    fetchUsers();
    fetchReports();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  }

  async function fetchReports() {
    const { data: reportData } = await supabase
      .from('reports')
      .select('*, reporter:profiles!reporter_id(full_name, username)')
      .order('created_at', { ascending: false });
    if (!reportData) return;

    const enriched = await Promise.all(reportData.map(async (r: any) => {
      let content: any = null;
      if (r.content_type === 'post') {
        const { data: post } = await supabase.from('posts').select('*, profile:profiles(full_name, username)').eq('id', r.content_id).single();
        content = post;
      } else if (r.content_type === 'reel') {
        const { data: reel } = await supabase.from('reels').select('*, profile:profiles(full_name, username)').eq('id', r.content_id).single();
        content = reel;
      } else if (r.content_type === 'message') {
        const { data: msg } = await supabase.from('messages').select('*, sender:profiles!sender_id(full_name, username)').eq('id', r.content_id).single();
        content = msg;
      }
      return { ...r, content };
    }));
    setReports(enriched);
  }

  async function handleReportAction(reportId: string, status: 'approved' | 'rejected', reporterId: string, targetUserId?: string) {
    Alert.alert(
      status === 'approved' ? 'Təsdiq et' : 'Rədd et',
      status === 'approved' ? 'Bu şikayəti təsdiq edib istifadəçiyə xəbərdarlıq edilsin?' : 'Bu şikayət rədd edilsin? Şikayət edənə bildiriş gedəcək.',
      [
        { text: 'Ləğv et', style: 'cancel' },
        {
          text: status === 'approved' ? 'Təsdiq et' : 'Rədd et',
          style: status === 'approved' ? 'destructive' : 'default',
          onPress: async () => {
            await supabase.from('reports').update({ status }).eq('id', reportId);
            await supabase.from('notifications').insert({
              user_id: status === 'approved' ? (targetUserId || reporterId) : reporterId,
              type: 'message',
              title: status === 'approved' ? 'Xəbərdarlıq' : 'Şikayət cavablandırıldı',
              body: status === 'approved' ? 'Sizə qarşı şikayət təsdiqləndi. Hesabınıza xəbərdarlıq edildi.' : 'Şikayətiniz dəyərləndirildi və rədd edildi. Ətraflı məlumat üçün adminlə əlaqə saxlayın.',
              data: {},
            });
            fetchReports();
          },
        },
      ]
    );
  }

  function nextVerifyType(current: string): 'none' | 'gold' {
    return current === 'gold' ? 'none' : 'gold';
  }

  async function toggleGold(userId: string, current: string) {
    const nextType = nextVerifyType(current);
    const { error } = await supabase
      .from('profiles')
      .update({ verified_type: nextType })
      .eq('id', userId);

    if (error) return Alert.alert('Xəta', error.message);

    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, verified_type: nextType } : u
    ));
  }

  const renderUser = useCallback(({ item }: { item: Profile }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{item.full_name}</Text>
          {item.verified_type !== 'none' && <VerifiedBadge size={14} type={item.verified_type} />}
        </View>
        <Text style={styles.userHandle}>@{item.username}</Text>
      </View>
      <View style={styles.actions}>
        {item.verified_type === 'red' ? (
          <View style={[styles.actionBtn, styles.adminBadge]}>
            <Text style={styles.actionText}>Admin</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, item.verified_type === 'gold' ? styles.actionActive : styles.actionInactive]}
            onPress={() => toggleGold(item.id, item.verified_type)}
          >
            <Text style={styles.actionText}>{item.verified_type === 'gold' ? 'Geri al' : 'Gold et'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), []);

  const renderReport = useCallback(({ item }: { item: any }) => (
    <View style={[styles.reportCard, { backgroundColor: colors.surface }]}>
      <View style={styles.reportHeader}>
        <Ionicons name={
          item.content_type === 'post' ? 'document-text-outline' :
          item.content_type === 'reel' ? 'videocam-outline' : 'chatbubble-outline'
        } size={18} color={colors.textMuted} />
        <Text style={[styles.reportType, { color: colors.textMuted }]}>
          {item.content_type === 'post' ? 'Post' : item.content_type === 'reel' ? 'Reel' : 'Mesaj'}
        </Text>
        <View style={[styles.statusBadge, {
          backgroundColor: item.status === 'pending' ? colors.warning + '30' :
                          item.status === 'approved' ? colors.error + '30' : colors.success + '30'
        }]}>
          <Text style={[styles.statusText, {
            color: item.status === 'pending' ? colors.warning :
                   item.status === 'approved' ? colors.error : colors.success
          }]}>
            {item.status === 'pending' ? 'Gözləyir' : item.status === 'approved' ? 'Təsdiqləndi' : 'Rədd edildi'}
          </Text>
        </View>
      </View>

      <View style={styles.reportBody}>
        <Text style={[styles.reportLabel, { color: colors.textMuted }]}>Şikayət edən</Text>
        <Text style={[styles.reportValue, { color: colors.text }]}>{item.reporter?.full_name || item.reporter?.username} (@{item.reporter?.username})</Text>
      </View>

      <View style={styles.reportBody}>
        <Text style={[styles.reportLabel, { color: colors.textMuted }]}>Səbəb</Text>
        <Text style={[styles.reportValue, { color: colors.text }]}>{REASON_LABELS[item.reason] || item.reason}</Text>
      </View>

      {item.content && (
        <View style={[styles.reportContent, { backgroundColor: colors.background }]}>
          <Text style={[styles.reportLabel, { color: colors.textMuted, marginBottom: 4 }]}>
            Şikayət edilən {item.content_type === 'post' ? 'post' : item.content_type === 'reel' ? 'reel' : 'mesaj'}
          </Text>
          {item.content_type === 'message' ? (
            <>
              <Text style={[styles.reportValue, { color: colors.textSecondary }]}>
                {item.content.sender?.full_name || item.content.sender?.username}:
              </Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{item.content.content}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.reportValue, { color: colors.textSecondary }]}>
                @{item.content.profile?.username}:
              </Text>
              {item.content.content && (
                <Text style={[styles.reportValue, { color: colors.text }]} numberOfLines={3}>{item.content.content}</Text>
              )}
              {item.content_type === 'reel' && item.content.description && (
                <Text style={[styles.reportValue, { color: colors.text }]} numberOfLines={2}>{item.content.description}</Text>
              )}
              {item.content.image_url && (
                <Image source={{ uri: item.content.image_url }} style={styles.reportImage} />
              )}
              {item.content_type === 'post' && item.content.image_url && (
                <Image source={{ uri: item.content.image_url }} style={styles.reportImage} />
              )}
            </>
          )}
        </View>
      )}

      {item.description && (
        <View style={styles.reportBody}>
          <Text style={[styles.reportLabel, { color: colors.textMuted }]}>Ətraflı</Text>
          <Text style={[styles.reportValue, { color: colors.text }]}>{item.description}</Text>
        </View>
      )}

      <View style={styles.reportBody}>
        <Text style={[styles.reportLabel, { color: colors.textMuted }]}>Tarix</Text>
        <Text style={[styles.reportValue, { color: colors.textSecondary }]}>
          {new Date(item.created_at).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      {item.status === 'pending' && (
        <View style={styles.reportActions}>
          <TouchableOpacity
            style={[styles.reportActionBtn, { backgroundColor: colors.error }]}
            onPress={() => handleReportAction(item.id, 'approved', item.reporter_id, item.content?.user_id || item.content?.sender_id)}
          >
            <Text style={styles.reportActionText}>Təsdiq et (ceza)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reportActionBtn, { backgroundColor: colors.success }]}
            onPress={() => handleReportAction(item.id, 'rejected', item.reporter_id)}
          >
            <Text style={styles.reportActionText}>Rədd et</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), []);

  function renderSection() {
    switch (section) {
      case 'users':
        return loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
          />
        );
      case 'gold_requests':
        return (
          <View style={styles.placeholder}>
            <Ionicons name="ribbon-outline" size={48} color={colors.textMuted} />
            <Text style={styles.placeholderText}>Gold istəkləri</Text>
            <Text style={styles.placeholderDesc}>Hələ ki, boşdur</Text>
          </View>
        );
      case 'reports':
        return (
          <FlatList
            data={reports}
            renderItem={renderReport}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.placeholder}>
                <Ionicons name="flag-outline" size={48} color={colors.textMuted} />
                <Text style={styles.placeholderText}>Şikayətlər</Text>
                <Text style={styles.placeholderDesc}>Hələ ki, şikayət yoxdur</Text>
              </View>
            }
          />
        );
    }
  }

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, section === 'users' && styles.activeTab]}
          onPress={() => setSection('users')}
        >
          <Ionicons name="people-outline" size={16} color={section === 'users' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: section === 'users' ? colors.primary : colors.textMuted }]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, section === 'gold_requests' && styles.activeTab]}
          onPress={() => setSection('gold_requests')}
        >
          <Ionicons name="ribbon-outline" size={16} color={section === 'gold_requests' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: section === 'gold_requests' ? colors.primary : colors.textMuted }]}>Gold Request</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, section === 'reports' && styles.activeTab]}
          onPress={() => setSection('reports')}
        >
          <Ionicons name="flag-outline" size={16} color={section === 'reports' ? colors.primary : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: section === 'reports' ? colors.primary : colors.textMuted }]}>Reports</Text>
        </TouchableOpacity>
      </View>

      {renderSection()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
  },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  title: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.text },
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  activeTab: {
    borderBottomWidth: 2, borderBottomColor: colors.primary,
  },
  tabLabel: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  placeholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  placeholderText: { color: colors.text, fontSize: fonts.sizes.lg, fontWeight: fonts.weights.semibold },
  placeholderDesc: { color: colors.textMuted, fontSize: fonts.sizes.sm },
  list: { padding: 16, gap: 12 },
  userCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userName: { color: colors.text, fontWeight: fonts.weights.semibold, fontSize: fonts.sizes.md },
  userHandle: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginTop: 2 },
  actions: { gap: 6 },
  actionBtn: {
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
  },
  actionActive: { backgroundColor: colors.success + '30' },
  actionInactive: { backgroundColor: colors.primary + '30' },
  adminBadge: { backgroundColor: colors.error + '30' },
  actionText: { color: colors.white, fontSize: fonts.sizes.xs, fontWeight: fonts.weights.medium },
  reportCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  reportType: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, flex: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.semibold },
  reportBody: { marginBottom: 6 },
  reportLabel: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.medium },
  reportValue: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, marginTop: 1 },
  reportContent: { borderRadius: 8, padding: 10, marginBottom: 6 },
  reportImage: { width: '100%', height: 120, borderRadius: 8, marginTop: 6 },
  reportActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  reportActionBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  reportActionText: { color: colors.white, fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold },
});
