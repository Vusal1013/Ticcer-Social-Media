import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { fonts } from '../../constants/theme';
import type { AppNotification } from '../../types';

export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchNotifications() {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setNotifications(data);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  useFocusEffect(useCallback(() => {
    fetchNotifications();
  }, [user]));

  function getIcon(type: string) {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'follow': return '👥';
      case 'mention': return '📢';
      case 'message': return '✉️';
      default: return '🔔';
    }
  }

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>Geri</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Bildirişlər</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Yüklənir...</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notifItem, !item.read && { backgroundColor: colors.primary + '10' }, { borderBottomColor: colors.border }]}
              onPress={() => markAsRead(item.id)}
            >
              <Text style={styles.notifIcon}>{getIcon(item.type)}</Text>
              <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, { color: colors.text }]}>{item.title}</Text>
                {item.body && <Text style={[styles.notifBody, { color: colors.textSecondary }]}>{item.body}</Text>}
                <Text style={[styles.notifTime, { color: colors.textMuted }]}>
                  {new Date(item.created_at).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bildiriş yoxdur</Text>
          }
        />
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
  backBtn: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  title: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold },
  list: { padding: 16 },
  notifItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  notifIcon: { fontSize: 24, marginRight: 12 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  notifBody: { fontSize: fonts.sizes.sm, marginTop: 2 },
  notifTime: { fontSize: fonts.sizes.xs, marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  emptyText: { textAlign: 'center', marginTop: 60, fontSize: fonts.sizes.md },
});
