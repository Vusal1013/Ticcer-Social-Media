import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../constants/theme';
import type { AppNotification } from '../types';

function getToastIcon(type: string) {
  switch (type) {
    case 'like': return 'heart';
    case 'comment': return 'chatbubble-outline';
    case 'follow': return 'people-outline';
    case 'mention': return 'megaphone-outline';
    case 'message': return 'mail-outline';
    default: return 'notifications-outline';
  }
}

export default function NotificationBanner() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [toast, setToast] = useState<AppNotification | null>(null);
  const toastAnim = useRef(new Animated.Value(-120)).current;

  function showBanner(notif: AppNotification) {
    setToast(notif);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(toastAnim, { toValue: -120, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-banner')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          showBanner(payload.new as AppNotification);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  if (!toast) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate('FeedTab', { screen: 'Notifications' })}
      style={styles.wrapper}
    >
      <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
        <Ionicons name={getToastIcon(toast.type)} size={20} color={colors.text} style={{ marginRight: 10 }} />
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{toast.title}</Text>
          {toast.body && <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={1}>{toast.body}</Text>}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', top: 100, left: 16, right: 16, zIndex: 9999 },
  toast: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  content: { flex: 1 },
  title: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold },
  body: { fontSize: fonts.sizes.xs, marginTop: 2 },
});
