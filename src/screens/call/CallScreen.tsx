import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setAudioModeAsync } from 'expo-audio';
import { LiveKitRoom, useTracks, VideoTrack, AudioSession } from '@livekit/react-native';
import { Track, Room } from 'livekit-client';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';
import { getLiveKitToken, LIVEKIT_URL, generateRoomName } from '../../lib/livekit';

function ParticipantVideo() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  if (tracks.length === 0) return null;
  return (
    <View style={styles.videoContainer}>
      {tracks.map((trackRef) => (
        <VideoTrack key={trackRef.participant?.identity || 'local'} trackRef={trackRef} style={styles.video} />
      ))}
    </View>
  );
}

export default function CallScreen({ route, navigation }: any) {
  const { callId: existingCallId, callType, roomName: existingRoom, otherUser, conversationId } = route.params;
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [duration, setDuration] = useState(0);
  const [myCallId, setMyCallId] = useState<string | null>(existingCallId || null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(callType === 'video');

  const roomRef = useRef<Room | null>(null);
  const durInterval = useRef<any>(null);
  const timeoutRef = useRef<any>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
    AudioSession.startAudioSession();
    roomRef.current = new Room();
    initCall();
    return () => {
      AudioSession.stopAudioSession();
      clearInterval(durInterval.current);
      clearTimeout(timeoutRef.current);
      roomRef.current?.disconnect();
    };
  }, []);

  async function insertCallMessage(status: string) {
    const label = callType === 'video' ? '📹 Video zəng' : '📞 Səsli zəng';
    const statusText: Record<string, string> = {
      missed: 'qaçırıldı', rejected: 'rədd edildi',
      cancelled: 'ləğv edildi', ended: 'bitdi',
    };
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user!.id,
      content: null,
      metadata: {
        type: 'call', call_type: callType,
        call_status: status,
        display: `${label} — ${statusText[status] || status}`,
      },
    });
  }

  async function initCall() {
    try {
      let room = existingRoom;
      let callId = existingCallId;

      if (!room || !callId) {
        room = generateRoomName();
        const { data, error } = await supabase.from('calls').insert({
          conversation_id: conversationId,
          caller_id: user!.id,
          callee_id: otherUser.id,
          call_type: callType,
          room_name: room,
        }).select().single();

        if (error || !data) {
          Alert.alert('Xeta', 'Zeng qurula bilmedi');
          navigation.goBack();
          return;
        }

        callId = data.id;
        setMyCallId(callId);

        const channel = supabase.channel(`call_${callId}`)
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${callId}`,
          }, (payload) => {
            const s = (payload.new as any).status;
            if (s === 'ended' || s === 'rejected' || s === 'missed') {
              channel.unsubscribe();
              endedRef.current = true;
              if (s === 'rejected') insertCallMessage('rejected');
              else if (s === 'missed') insertCallMessage('missed');
              navigation.goBack();
            }
          })
          .subscribe();

        timeoutRef.current = setTimeout(async () => {
          const { data: current } = await supabase.from('calls').select('status').eq('id', callId).single();
          if (current && current.status === 'ringing') {
            await supabase.from('calls').update({ status: 'missed', ended_at: new Date().toISOString() }).eq('id', callId);
          }
        }, 30000);
      }

      const t = await getLiveKitToken(room, user!.id);
      setToken(t);
    } catch {
      navigation.goBack();
    }
  }

  function onConnected() {
    setConnected(true);
    clearTimeout(timeoutRef.current);
    if (myCallId) {
      supabase.from('calls').update({ status: 'ongoing', started_at: new Date().toISOString() }).eq('id', myCallId);
    }
    durInterval.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  }

  async function endCall() {
    if (endedRef.current) return;
    endedRef.current = true;
    clearInterval(durInterval.current);
    clearTimeout(timeoutRef.current);

    if (myCallId) {
      await supabase.from('calls').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', myCallId);
    }
    if (!connected && myCallId) {
      await insertCallMessage('cancelled');
    } else if (connected && myCallId) {
      await insertCallMessage('ended');
    }
    roomRef.current?.disconnect();
    navigation.goBack();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    roomRef.current?.localParticipant.setMicrophoneEnabled(!next);
  }

  function toggleCamera() {
    const next = !cameraOn;
    setCameraOn(next);
    roomRef.current?.localParticipant.setCameraEnabled(next);
  }

  function formatDur(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (!token) {
    return (
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="call-outline" size={48} color={colors.primary} />
          <Text style={styles.statusText}>Zəng qurulur...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      onConnected={onConnected}
      onDisconnected={() => { if (!endedRef.current) navigation.goBack(); }}
      options={{ adaptiveStream: { pauseVideoInBackground: false } }}
      audio={true}
      video={callType === 'video'}
      room={roomRef.current || undefined}
    >
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
        <SafeAreaView style={styles.inner}>
          {callType === 'video' && <ParticipantVideo />}

          <View style={styles.info}>
            <Text style={styles.name}>{otherUser?.full_name || 'İstifadəçi'}</Text>
            <Text style={styles.status}>
              {connected ? formatDur(duration) : 'Bağlanır...'}
            </Text>
          </View>

          <View style={styles.controls}>
            {callType === 'video' && (
              <TouchableOpacity
                style={[styles.controlBtn, !cameraOn && styles.controlOff]}
                onPress={toggleCamera}
              >
                <Ionicons name={cameraOn ? 'videocam' : 'videocam-off'} size={28} color={colors.white} />
                <Text style={styles.controlLabel}>Kamera</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.controlBtn, muted && styles.controlOff]}
              onPress={toggleMute}
            >
              <Ionicons name={muted ? 'mic-off' : 'mic'} size={28} color={colors.white} />
              <Text style={styles.controlLabel}>Səs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlBtn, styles.endCallBtn]} onPress={endCall}>
              <Ionicons name="call" size={28} color={colors.white} />
              <Text style={styles.controlLabel}>Bitir</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'space-between', paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  statusText: { color: colors.textMuted, fontSize: fonts.sizes.lg },
  videoContainer: { flex: 1, margin: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.black },
  video: { flex: 1 },
  info: { alignItems: 'center', paddingVertical: 40, gap: 4 },
  name: { color: colors.white, fontSize: fonts.sizes.xl, fontWeight: '700' },
  status: { color: colors.textMuted, fontSize: fonts.sizes.md },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingHorizontal: 24 },
  controlBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 40,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlOff: { backgroundColor: 'rgba(255,255,255,0.05)', opacity: 0.5 },
  controlLabel: { color: colors.white, fontSize: 10, marginTop: 4, position: 'absolute', bottom: -18 },
  endCallBtn: { backgroundColor: '#FF4444' },
});
