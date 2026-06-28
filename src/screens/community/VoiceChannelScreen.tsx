import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';

const GIRIS_SES_URL = supabase.storage.from('community-audio').getPublicUrl('giris_ses.mp3').data.publicUrl;
const CIKIS_SES_URL = supabase.storage.from('community-audio').getPublicUrl('cixis_ses.mp3').data.publicUrl;

export default function VoiceChannelScreen({ route, navigation }: any) {
  const { channel, community } = route.params;
  const { user } = useAuth();
  const [participants, setParticipants] = useState<any[]>([]);
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const previousCountRef = useRef(0);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
    fetchParticipants();

    const interval = setInterval(fetchParticipants, 10000);
    return () => { clearInterval(interval); cleanup(); };
  }, []);

  async function playSound(uri: string) {
    try {
      if (playerRef.current) { playerRef.current.remove(); }
      const player = createAudioPlayer(uri);
      player.volume = 0.5;
      playerRef.current = player;
      player.play();
    } catch {}
  }

  async function fetchParticipants() {
    const { data } = await supabase
      .from('voice_participants')
      .select('*, profile:profiles(*)')
      .eq('channel_id', channel.id);
    if (data) {
      setParticipants(data);
      previousCountRef.current = data.length;
      setJoined(data.some(p => p.user_id === user!.id));
    }
  }

  async function joinVoice() {
    const { error } = await supabase.from('voice_participants').insert({
      channel_id: channel.id, user_id: user!.id, is_muted: false, screen_sharing: false,
    });
    if (error) return Alert.alert('Xeta', error.message);
    setJoined(true);
    playSound(GIRIS_SES_URL);
  }

  async function leaveVoice() {
    await supabase.from('voice_participants').delete()
      .eq('channel_id', channel.id).eq('user_id', user!.id);
    setJoined(false);
    setScreenSharing(false);
    playSound(CIKIS_SES_URL);
  }

  async function cleanup() {
    await supabase.from('voice_participants').delete()
      .eq('channel_id', channel.id).eq('user_id', user!.id);
    if (playerRef.current) { playerRef.current.remove(); playerRef.current = null; }
  }

  async function toggleMute() {
    const newMute = !muted;
    await supabase.from('voice_participants').update({ is_muted: newMute })
      .eq('channel_id', channel.id).eq('user_id', user!.id);
    setMuted(newMute);
  }

  async function toggleScreenShare() {
    const newScreenShare = !screenSharing;
    await supabase.from('voice_participants').update({ screen_sharing: newScreenShare })
      .eq('channel_id', channel.id).eq('user_id', user!.id);
    setScreenSharing(newScreenShare);
  }

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Geri</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name="mic-outline" size={20} color={colors.text} /><Text style={styles.title}> {channel.name}</Text></View>
        <TouchableOpacity onPress={() => navigation.navigate('ChannelSettings', { channel, community })}>
          <Text style={styles.settingsBtn}>Ayarlar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.voiceArea}>
        <View style={styles.voiceIcon}>
          <Ionicons name="mic-outline" size={36} color={colors.text} />
        </View>
        <Text style={styles.voiceTitle}>Sesli otaq</Text>
        <Text style={styles.voiceDesc}>
          {participants.length} istifadeci bagli
          {screenSharing ? ' - Ekran paylasilir' : ''}
        </Text>

        <FlatList
          data={participants}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.participantItem}>
              <View style={[styles.participantAvatar]}>
                <Text style={styles.avatarLetter}>{(item.profile?.full_name || '?')[0]}</Text>
              </View>
              <Text style={styles.participantName}>{item.profile?.full_name}</Text>
              <Ionicons name={item.is_muted ? 'volume-mute-outline' : 'mic'} size={20} color={colors.textMuted} />
            </View>
          )}
          contentContainerStyle={styles.participantList}
          ListEmptyComponent={<Text style={styles.empty}>Hela kimse yox</Text>}
        />
      </View>

      {joined ? (
        <View style={styles.controls}>
          <TouchableOpacity onPress={toggleMute} style={[styles.controlBtn, muted && styles.controlActive]}>
            <Ionicons name={muted ? 'volume-mute-outline' : 'mic'} size={28} color={colors.text} />
            <Text style={styles.controlLabel}>{muted ? 'Sesi ac' : 'Sesi bagla'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleScreenShare} style={[styles.controlBtn, screenSharing && styles.controlActive]}>
            <Ionicons name="tv-outline" size={28} color={colors.text} />
            <Text style={styles.controlLabel}>{screenSharing ? 'Paylasimi dayandir' : 'Ekran paylas'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={leaveVoice} style={[styles.controlBtn, styles.leaveBtn]}>
            <Ionicons name="call-outline" size={28} color={colors.text} />
            <Text style={styles.controlLabel}>Ayril</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={joinVoice} style={styles.joinBtn}>
          <Text style={styles.joinBtnText}>Otaga qatil</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  title: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  settingsBtn: { color: colors.textMuted, fontSize: fonts.sizes.sm, fontWeight: '500' },
  voiceArea: { flex: 1, alignItems: 'center', paddingTop: 40 },
  voiceIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  voiceTitle: { color: colors.text, fontSize: fonts.sizes.xl, fontWeight: '700' },
  voiceDesc: { color: colors.textMuted, fontSize: fonts.sizes.sm, marginTop: 4 },
  participantList: { padding: 24, width: '100%' },
  participantItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 6 },
  participantAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.white, fontWeight: '700', fontSize: 16 },
  participantName: { color: colors.text, marginLeft: 12, flex: 1, fontWeight: '500' },
  empty: { color: colors.textMuted, textAlign: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 16, padding: 24, paddingBottom: 40 },
  controlBtn: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', minWidth: 80 },
  controlActive: { backgroundColor: colors.error + '30' },
  controlLabel: { color: colors.text, fontSize: fonts.sizes.xs },
  leaveBtn: { backgroundColor: colors.error + '30' },
  joinBtn: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, margin: 24, alignItems: 'center', marginBottom: 40 },
  joinBtnText: { color: colors.white, fontSize: fonts.sizes.md, fontWeight: '700' },
});
