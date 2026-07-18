import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Vibration, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { fonts } from '../../constants/theme';

export default function IncomingCallScreen({ route, navigation }: any) {
  const { callId, callerId, callType, roomName, conversationId, callerInfo } = route.params;
  const { user } = useAuth();
  const [callerName, setCallerName] = useState(callerInfo?.full_name || '');
  const [callerAvatar, setCallerAvatar] = useState(callerInfo?.avatar_url || '');
  const endedRef = useRef(false);

  const pingAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pingAnim, { toValue: 1.3, duration: 2500, useNativeDriver: true }),
        Animated.timing(pingAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    );
    pingLoop.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 3000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    bounceLoop.start();

    Vibration.vibrate([0, 500, 500, 500], true);

    if (!callerName) {
      supabase.from('profiles').select('full_name, avatar_url').eq('id', callerId).single()
        .then(({ data }) => {
          if (data) {
            setCallerName(data.full_name);
            if (data.avatar_url) setCallerAvatar(data.avatar_url);
          }
        });
    }

    const channel = supabase.channel(`incoming_call_${callId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${callId}`,
      }, (payload) => {
        const status = (payload.new as any).status;
        if (status === 'ended' || status === 'missed' || status === 'ongoing') {
          Vibration.cancel();
          channel.unsubscribe();
          if (status !== 'ongoing' && !endedRef.current) {
            endedRef.current = true;
            navigation.goBack();
          }
        }
      })
      .subscribe();

    return () => {
      Vibration.cancel();
      channel.unsubscribe();
      pingLoop.stop();
      pulseLoop.stop();
      bounceLoop.stop();
    };
  }, []);

  async function insertCallMessage(status: string) {
    const label = callType === 'video' ? '📹 Video zəng' : '📞 Səsli zəng';
    const statusText = status === 'missed' ? 'qaçırıldı' : 'rədd edildi';
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user!.id,
      content: null,
      metadata: {
        type: 'call',
        call_type: callType,
        call_status: status,
        display: `${label} — ${statusText}`,
      },
    });
  }

  async function acceptCall() {
    endedRef.current = true;
    await supabase.from('calls').update({ status: 'ongoing', started_at: new Date().toISOString() }).eq('id', callId);
    Vibration.cancel();
    navigation.replace('CallScreen', {
      callId,
      callType,
      roomName,
      otherUser: { id: callerId, full_name: callerName },
      conversationId,
    });
  }

  async function rejectCall() {
    if (endedRef.current) return;
    endedRef.current = true;
    await supabase.from('calls').update({ status: 'rejected', ended_at: new Date().toISOString() }).eq('id', callId);
    await insertCallMessage('rejected');
    Vibration.cancel();
    navigation.goBack();
  }

  const bounceTranslateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <LinearGradient colors={['#0F172A', '#0b1326', '#000000']} locations={[0, 0.5, 1]} style={styles.container}>
      <View style={styles.bgGlow} />

      <SafeAreaView style={styles.inner}>
        <View style={styles.callerSection}>
          <View style={styles.avatarWrapper}>
            <Animated.View
              style={[
                styles.pingRing,
                { borderColor: 'rgba(221, 183, 255, 0.3)', transform: [{ scale: pingAnim }] },
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRing,
                { borderColor: 'rgba(221, 183, 255, 0.1)', opacity: pulseAnim },
              ]}
            />
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {callerAvatar ? (
                  <Image source={{ uri: callerAvatar }} style={styles.avatarImage} />
                ) : (
                  <Ionicons
                    name={callType === 'video' ? 'videocam' : 'call'}
                    size={64}
                    color="#ddb7ff"
                  />
                )}
              </View>
            </View>
            <View style={styles.hubBadge}>
              <Ionicons name="grid" size={20} color="#ddb7ff" />
            </View>
          </View>

          <Text style={styles.name}>{callerName || 'İstifadəçi'}</Text>

          <View style={styles.typeBadge}>
            <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={18} color="#94A3B8" />
            <Text style={styles.typeText}>
              {callType === 'video' ? 'Video zəng' : 'Səsli zəng'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionGroup} onPress={rejectCall} activeOpacity={0.7}>
            <View style={styles.rejectBtn}>
              <Ionicons name="call" size={32} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </View>
            <Text style={styles.actionLabel}>Rədd et</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionGroup} onPress={acceptCall} activeOpacity={0.7}>
            <Animated.View style={[styles.acceptBtn, { transform: [{ translateY: bounceTranslateY }] }]}>
              <Ionicons
                name={callType === 'video' ? 'videocam' : 'call'}
                size={36}
                color="#003915"
              />
            </Animated.View>
            <Text style={[styles.actionLabel, { color: '#dae2fd' }]}>Qəbul et</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlow: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(221, 183, 255, 0.03)',
    marginLeft: -300,
    opacity: 0.5,
  },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 96,
    paddingBottom: 64,
    paddingHorizontal: 16,
  },
  callerSection: { alignItems: 'center', marginTop: 48 },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    width: 280,
    height: 280,
  },
  pingRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
  },
  pulseRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
  },
  avatarContainer: {
    width: 192,
    height: 192,
    borderRadius: 96,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(30, 41, 59, 0.7)',
  },
  avatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#171f33',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
    elevation: 20,
  },
  avatarImage: { width: '100%', height: '100%' },
  hubBadge: {
    position: 'absolute',
    bottom: -8,
    right: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: '#dae2fd',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.02,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  typeText: {
    fontSize: 14,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 16,
  },
  actionGroup: { alignItems: 'center', gap: 8 },
  rejectBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(255, 59, 48, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 15,
  },
  acceptBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4ae176',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(74, 225, 118, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 15,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cfc2d6',
  },
});
