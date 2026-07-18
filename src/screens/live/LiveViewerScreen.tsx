import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LiveKitRoom, useTracks, VideoTrack } from '@livekit/react-native';
import { Track, Room } from 'livekit-client';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';
import { getLiveKitToken, LIVEKIT_URL } from '../../lib/livekit';

function BroadcasterVideo() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  if (tracks.length === 0) {
    return (
      <View style={styles.waitingContainer}>
        <Ionicons name="videocam-off" size={48} color="rgba(255,255,255,0.3)" />
        <Text style={styles.waitingText}>Yayin gormek ucun gozleyin...</Text>
      </View>
    );
  }
  return (
    <View style={styles.videoContainer}>
      {tracks.map((trackRef) => (
        <VideoTrack key={trackRef.participant?.identity || 'broadcaster'} trackRef={trackRef} style={styles.video} />
      ))}
    </View>
  );
}

export default function LiveViewerScreen({ route, navigation }: any) {
  const { live, broadcaster } = route.params;
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [ended, setEnded] = useState(false);
  const [viewerCount, setViewerCount] = useState(live.viewer_count || 0);
  const [duration, setDuration] = useState(0);

  const roomRef = useRef<Room | null>(null);
  const durInterval = useRef<any>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    roomRef.current = new Room();
    initViewer();
    return () => {
      clearInterval(durInterval.current);
      leaveLiveViewers();
      if (roomRef.current) {
        roomRef.current.removeAllListeners();
        roomRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (!live.id) return;
    const channel = supabase.channel(`live_viewer_${live.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'lives', filter: `id=eq.${live.id}`,
      }, (payload) => {
        const data = payload.new as any;
        if (data.status === 'ended') {
          endedRef.current = true;
          setEnded(true);
          clearInterval(durInterval.current);
          if (roomRef.current) {
            roomRef.current.removeAllListeners();
            roomRef.current.disconnect();
          }
          supabase.removeChannel(channel);
        }
        if (data.viewer_count !== undefined) {
          setViewerCount(data.viewer_count);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [live.id]);

  async function initViewer() {
    try {
      const t = await getLiveKitToken(live.room_name, user!.id, false);
      setToken(t);
    } catch {
      navigation.goBack();
    }
  }

  async function onConnected() {
    setConnected(true);
    durInterval.current = setInterval(() => setDuration(p => p + 1), 1000);
    await supabase.from('live_viewers').upsert({ live_id: live.id, user_id: user!.id }, { onConflict: 'live_id,user_id' });
    await supabase.rpc('increment_live_viewers', { live_id: live.id });
  }

  async function leaveLiveViewers() {
    await supabase.from('live_viewers').delete().eq('live_id', live.id).eq('user_id', user!.id);
    await supabase.rpc('decrement_live_viewers', { live_id: live.id });
  }

  function formatDur(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (ended) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="stop-circle-outline" size={64} color={colors.primary} />
        <Text style={styles.endedText}>Yayin sona erdi</Text>
        <TouchableOpacity style={styles.closeBtn2} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>Bagla</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Qosulur...</Text>
      </View>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      onConnected={onConnected}
      onDisconnected={() => { if (!endedRef.current) { setEnded(true); leaveLiveViewers(); } }}
      options={{ adaptiveStream: { pauseVideoInBackground: false } }}
      audio={true}
      video={false}
      room={roomRef.current || undefined}
    >
      <View style={styles.container}>
        <BroadcasterVideo />
        <SafeAreaView style={styles.overlay}>
          <View style={styles.topBar}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>Canli</Text>
              {connected && <Text style={styles.liveDur}>{formatDur(duration)}</Text>}
            </View>
            <View style={styles.viewerBadge}>
              <Ionicons name="eye" size={14} color="#FFF" />
              <Text style={styles.viewerText}>{viewerCount}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.bottomBar}>
            <View style={styles.broadcasterInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{broadcaster?.username?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              <View>
                <Text style={styles.broadcasterName}>{broadcaster?.full_name || broadcaster?.username || 'Istifadeci'}</Text>
                {live.title && <Text style={styles.liveTitle}>{live.title}</Text>}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  loadingText: { color: colors.textMuted, fontSize: fonts.sizes.lg },
  endedText: { color: colors.text, fontSize: fonts.sizes.xl, fontWeight: '600' },
  waitingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  waitingText: { color: 'rgba(255,255,255,0.5)', fontSize: fonts.sizes.md },
  videoContainer: { ...StyleSheet.absoluteFill },
  video: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between', padding: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF4444',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  liveLabel: { color: '#FFF', fontWeight: '700', fontSize: fonts.sizes.sm },
  liveDur: { color: '#FFF', fontSize: fonts.sizes.sm },
  viewerBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 4,
  },
  viewerText: { color: '#FFF', fontSize: fonts.sizes.sm },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 'auto',
  },
  closeBtn2: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 32, paddingVertical: 12,
  },
  closeBtnText: { color: '#FFF', fontSize: fonts.sizes.md, fontWeight: '600' },
  bottomBar: { paddingBottom: 40 },
  broadcasterInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: '#FFF', fontSize: fonts.sizes.lg, fontWeight: '700' },
  broadcasterName: { color: '#FFF', fontWeight: '600', fontSize: fonts.sizes.md },
  liveTitle: { color: 'rgba(255,255,255,0.7)', fontSize: fonts.sizes.sm, marginTop: 2 },
});
