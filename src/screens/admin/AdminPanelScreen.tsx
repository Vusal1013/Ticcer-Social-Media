import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import VerifiedBadge from '../../components/VerifiedBadge';
import { colors, fonts } from '../../constants/theme';
import type { Profile } from '../../types';

export default function AdminPanelScreen({ navigation }: any) {
  const { profile: currentProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentProfile?.role !== 'admin') {
      navigation.goBack();
      return;
    }
    fetchUsers();
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

  async function toggleVerify(userId: string, current: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({ verified: !current })
      .eq('id', userId);

    if (error) return Alert.alert('Xəta', error.message);

    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, verified: !current } : u
    ));
  }

  async function toggleRole(userId: string, current: string) {
    const newRole = current === 'admin' ? 'user' : 'admin';
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) return Alert.alert('Xəta', error.message);

    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, role: newRole as 'user' | 'admin' } : u
    ));
  }

  const renderUser = useCallback(({ item }: { item: Profile }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{item.full_name}</Text>
          {item.verified && <VerifiedBadge size={14} />}
        </View>
        <Text style={styles.userHandle}>@{item.username}</Text>
        {item.role === 'admin' && (
          <View style={styles.adminTag}>
            <Text style={styles.adminTagText}>Admin</Text>
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, item.verified ? styles.actionActive : styles.actionInactive]}
          onPress={() => toggleVerify(item.id, item.verified)}
        >
          <Text style={styles.actionText}>{item.verified ? 'Təsdiqlənib' : 'Təsdiq et'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.roleBtn]}
          onPress={() => toggleRole(item.id, item.role)}
        >
          <Text style={styles.actionText}>
            {item.role === 'admin' ? 'Admin çıx' : 'Admin et'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  ), []);

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
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
  list: { padding: 16, gap: 12 },
  userCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userName: { color: colors.text, fontWeight: fonts.weights.semibold, fontSize: fonts.sizes.md },
  userHandle: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginTop: 2 },
  adminTag: {
    backgroundColor: colors.warning + '30', alignSelf: 'flex-start',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4,
  },
  adminTagText: { color: colors.warning, fontSize: fonts.sizes.xs, fontWeight: fonts.weights.medium },
  actions: { gap: 6 },
  actionBtn: {
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
  },
  actionActive: { backgroundColor: colors.success + '30' },
  actionInactive: { backgroundColor: colors.primary + '30' },
  roleBtn: { backgroundColor: colors.warning + '30' },
  actionText: { color: colors.white, fontSize: fonts.sizes.xs, fontWeight: fonts.weights.medium },
});
