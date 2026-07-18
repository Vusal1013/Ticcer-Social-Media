import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync } from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LiveKitRoom, useTracks, VideoTrack, AudioSession } from '@livekit/react-native';
import { Track, Room } from 'livekit-client';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';
import { getLiveKitToken, LIVEKIT_URL, generateRoomName } from '../../lib/livekit';

function BroadcasterVideo() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  if (tracks.length === 0) return null;
  return (
    <View style={styles.broadcastVideo}>
      {tracks.map((trackRef) => (
        <VideoTrack key={trackRef.participant?.identity || 'local'} trackRef={trackRef} style={styles.video} />
      ))}
    </View>
  );
}

export default function GoLiveScreen({ navigation }: any) {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<'preview' | 'live'>('preview');
  const [title, setTitle] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [roomName] = useState(generateRoomName());
  const [liveId, setLiveId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [viewersModalVisible, setViewersModalVisible] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);

  const roomRef = useRef<Room | null>(null);
  const durInterval = useRef<any>(null);
  const endingRef = useRef(false);
  const liveIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(durInterval.current);
      roomRef.current?.removeAllListeners();
      roomRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    liveIdRef.current = liveId;
  }, [liveId]);

  useEffect(() => {
    if (!liveId) return;
    const channel = supabase.channel(`live_host_${liveId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'lives', filter: `id=eq.${liveId}`,
      }, (payload) => {
        const data = payload.new as any;
        if (data.viewer_count !== undefined) {
          setViewerCount(data.viewer_count);
        }
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'live_viewers', filter: `live_id=eq.${liveId}`,
      }, () => {
        fetchViewers();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [liveId]);

  async function fetchViewers() {
    if (!liveId) return;
    const { data } = await supabase
      .from('live_viewers')
      .select('*, profile:profiles(id, username, full_name, avatar_url)')
      .eq('live_id', liveId)
      .order('joined_at', { ascending: true });
    if (data) setViewers(data);
  }

  async function startLive() {
    try {
      setAudioModeAsync({ playsInSilentMode: true });
      AudioSession.startAudioSession();
      roomRef.current = new Room();

      const { data, error } = await supabase.from('lives').insert({
        user_id: user!.id,
        room_name: roomName,
        title: title.trim() || null,
        status: 'live',
      }).select().single();

      if (error || !data) {
        Alert.alert('Xeta', 'Canli yayin basladila bilmedi');
        return;
      }

      setLiveId(data.id);

      const t = await getLiveKitToken(roomName, user!.id, true);
      setToken(t);
      setStep('live');
    } catch (err: any) {
      Alert.alert('Xeta', err.message || 'Yayin basladila bilmedi');
    }
  }

  function onConnected() {
    setConnected(true);
    durInterval.current = setInterval(() => setDuration(p => p + 1), 1000);
  }

  async function endLive() {
    if (endingRef.current) return;
    endingRef.current = true;

    clearInterval(durInterval.current);
    AudioSession.stopAudioSession();

    const id = liveIdRef.current;
    if (id) {
      await supabase.from('lives').update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      }).eq('id', id);
    }

    if (roomRef.current) {
      roomRef.current.removeAllListeners();
      roomRef.current.disconnect();
    }

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

  if (step === 'preview') {
    return (
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView style={StyleSheet.absoluteFill} facing="front" />
        ) : (
          <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.previewOverlay}>
          <SafeAreaView style={styles.previewSafe}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.previewClose}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.previewBottom}>
              <TextInput
                style={styles.titleInput}
                placeholder="Yayin basligi..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={title}
                onChangeText={setTitle}
                maxLength={60}
              />
              <TouchableOpacity style={styles.goLiveBtn} onPress={startLive}>
                <Text style={styles.goLiveText}>Canli yayina basla</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (!token) {
    return (
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Yayin hazirlanir...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <>
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      onConnected={onConnected}
      onDisconnected={() => { if (!endingRef.current) navigation.goBack(); }}
      options={{ adaptiveStream: { pauseVideoInBackground: false } }}
      audio={true}
      video={true}
      room={roomRef.current || undefined}
    >
      <View style={styles.container}>
        <BroadcasterVideo />
        <SafeAreaView style={styles.liveOverlay}>
          <View style={styles.liveHeader}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>Canli</Text>
              <Text style={styles.liveDur}>{formatDur(duration)}</Text>
            </View>
            <TouchableOpacity style={styles.viewerBadge} onPress={() => { fetchViewers(); setViewersModalVisible(true); }} activeOpacity={0.7}>
              <Ionicons name="eye" size={14} color="#FFF" />
              <Text style={styles.viewerText}>{viewerCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={endLive} style={styles.endLiveBtn}>
              <Text style={styles.endLiveText}>Bitir</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.liveControls}>
            <TouchableOpacity style={[styles.ctrlBtn, !cameraOn && styles.ctrlOff]} onPress={toggleCamera}>
              <Ionicons name={cameraOn ? 'videocam' : 'videocam-off'} size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ctrlBtn, muted && styles.ctrlOff]} onPress={toggleMute}>
              <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </LiveKitRoom>

    <Modal visible={viewersModalVisible} animationType="slide" transparent onRequestClose={() => setViewersModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Izleyiciler ({viewerCount})</Text>
            <TouchableOpacity onPress={() => setViewersModalVisible(false)}>
              <Ionicons name="close" size={24} color="#dae2fd" />
            </TouchableOpacity>
          </View>
          {viewers.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Ionicons name="eye-off" size={36} color="#94A3B8" />
              <Text style={styles.modalEmptyText}>Henuz kimse izlemiyor</Text>
            </View>
          ) : (
            <FlatList
              data={viewers}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.viewerRow}>
                  {item.profile?.avatar_url ? (
                    <Image source={{ uri: item.profile.avatar_url }} style={styles.viewerAvatar} />
                  ) : (
                    <View style={[styles.viewerAvatar, styles.viewerAvatarPlaceholder]}>
                      <Text style={styles.viewerAvatarLetter}>{(item.profile?.full_name || '?')[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.viewerName}>{item.profile?.full_name || item.profile?.username || 'Adsiz'}</Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textMuted, fontSize: fonts.sizes.lg },
  previewOverlay: { flex: 1, justifyContent: 'flex-end' },
  previewSafe: { flex: 1, justifyContent: 'space-between', padding: 20 },
  previewClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  previewBottom: { gap: 16, paddingBottom: 40 },
  titleInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: fonts.sizes.md,
  },
  goLiveBtn: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  goLiveText: { color: '#FFF', fontSize: fonts.sizes.lg, fontWeight: '700' },
  broadcastVideo: { ...StyleSheet.absoluteFill },
  video: { flex: 1 },
  liveOverlay: { flex: 1, justifyContent: 'space-between', padding: 16 },
  liveHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
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
  endLiveBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6, marginLeft: 'auto',
  },
  endLiveText: { color: '#FFF', fontWeight: '600', fontSize: fonts.sizes.sm },
  liveControls: {
    flexDirection: 'row', justifyContent: 'center', gap: 20, paddingBottom: 40,
  },
  ctrlBtn: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctrlOff: { opacity: 0.4, backgroundColor: 'rgba(255,255,255,0.05)' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 40, maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { color: '#dae2fd', fontSize: 18, fontWeight: '700' },
  modalEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  modalEmptyText: { color: '#94A3B8', fontSize: 14 },
  viewerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  viewerAvatar: {
    width: 40, height: 40, borderRadius: 20,
  },
  viewerAvatarPlaceholder: {
    backgroundColor: '#b76dff', alignItems: 'center', justifyContent: 'center',
  },
  viewerAvatarLetter: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  viewerName: { color: '#dae2fd', fontSize: 14, fontWeight: '600' },
});
