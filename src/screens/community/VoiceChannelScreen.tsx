import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet, Image, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { setAudioModeAsync } from 'expo-audio';
import { LiveKitRoom } from '@livekit/react-native';
import { Room, RemoteParticipant } from 'livekit-client';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/theme';
import { getLiveKitToken, LIVEKIT_URL } from '../../lib/livekit';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GIRIS_SES_URL = supabase.storage.from('community-audio').getPublicUrl('giris_ses.mp3').data.publicUrl;
const CIKIS_SES_URL = supabase.storage.from('community-audio').getPublicUrl('cixis_ses.mp3').data.publicUrl;

export default function VoiceChannelScreen({ route, navigation }: any) {
  const { channel, community } = route.params;
  const { user } = useAuth();
  const [participants, setParticipants] = useState<any[]>([]);
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitConnected, setLiveKitConnected] = useState(false);
  const [voicePerms, setVoicePerms] = useState({ can_voice: true });
  const [deafened, setDeafened] = useState(false);
  const [wasMutedBeforeDeafen, setWasMutedBeforeDeafen] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const roomRef = useRef<Room | null>(null);

  const roomName = `voice_${channel.id}`;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
    roomRef.current = new Room();
    fetchParticipants();
    fetchVoicePerms();

    roomRef.current.on('activeSpeakersChanged', (speakers) => {
      if (speakers.length > 0) {
        const speaker = speakers[0];
        const pid = typeof speaker === 'string' ? speaker : speaker.identity;
        setActiveSpeakerId(pid);
      } else {
        setActiveSpeakerId(null);
      }
    });

    const interval = setInterval(fetchParticipants, 10000);
    return () => { clearInterval(interval); cleanup(); };
  }, []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim2, { toValue: 0.3, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim2, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim2.start();
    return () => { anim.stop(); anim2.stop(); };
  }, []);

  async function fetchParticipants() {
    const { data } = await supabase
      .from('voice_participants')
      .select('*, profile:profiles(*)')
      .eq('channel_id', channel.id);
    if (data) {
      setParticipants(data);
      setJoined(data.some(p => p.user_id === user!.id));
      const myEntry = data.find(p => p.user_id === user!.id);
      if (myEntry) {
        setMuted(myEntry.is_muted);
        setScreenSharing(myEntry.screen_sharing);
      }
    }
  }

  async function fetchVoicePerms() {
    if (user!.id === community.owner_id) {
      setVoicePerms({ can_voice: true });
      return;
    }
    const { data } = await supabase
      .from('role_assignments')
      .select('role:community_roles!inner(permissions)')
      .eq('user_id', user!.id)
      .eq('community_id', community.id);
    let canVoice = false;
    if (data) {
      data.forEach((ra: any) => {
        const p = ra.role?.permissions || {};
        if (p.can_voice) canVoice = true;
      });
    }
    setVoicePerms({ can_voice: canVoice });
  }

  async function joinVoice() {
    const { error } = await supabase.from('voice_participants').insert({
      channel_id: channel.id, user_id: user!.id, is_muted: false, screen_sharing: false,
    });
    if (error) return Alert.alert('Xeta', error.message);
    setJoined(true);
    try {
      const token = await getLiveKitToken(roomName, user!.id);
      setLiveKitToken(token);
    } catch (e: any) {
      Alert.alert('Xeta', 'Səs sisteminə qoşulmaq mümkün olmadı: ' + (e.message || ''));
    }
  }

  function onLiveKitConnected() {
    setLiveKitConnected(true);
    if (roomRef.current) {
      roomRef.current.localParticipant.setMicrophoneEnabled(true);
    }
  }

  function onLiveKitDisconnected() {
    setLiveKitConnected(false);
  }

  async function leaveVoice() {
    await supabase.from('voice_participants').delete()
      .eq('channel_id', channel.id).eq('user_id', user!.id);
    if (roomRef.current) {
      roomRef.current.disconnect();
    }
    setJoined(false);
    setLiveKitToken(null);
    setLiveKitConnected(false);
    setScreenSharing(false);
    setDeafened(false);
  }

  async function cleanup() {
    await supabase.from('voice_participants').delete()
      .eq('channel_id', channel.id).eq('user_id', user!.id);
    if (roomRef.current) { roomRef.current.disconnect(); roomRef.current = null; }
  }

  async function toggleMute() {
    const newMute = !muted;
    setMuted(newMute);
    if (roomRef.current && liveKitConnected) {
      try {
        await roomRef.current.localParticipant.setMicrophoneEnabled(!newMute);
      } catch {}
    }
    await supabase.from('voice_participants').update({ is_muted: newMute })
      .eq('channel_id', channel.id).eq('user_id', user!.id);
  }

  async function toggleScreenShare() {
    const newScreenShare = !screenSharing;
    setScreenSharing(newScreenShare);
    if (roomRef.current && liveKitConnected) {
      try {
        await roomRef.current.localParticipant.setScreenShareEnabled(newScreenShare);
      } catch {}
    }
    await supabase.from('voice_participants').update({ screen_sharing: newScreenShare })
      .eq('channel_id', channel.id).eq('user_id', user!.id);
  }

  async function toggleDeafen() {
    if (deafened) {
      setDeafened(false);
      if (roomRef.current) {
        roomRef.current.remoteParticipants.forEach(p => p.setVolume(1));
      }
      if (!wasMutedBeforeDeafen) {
        setMuted(false);
        if (roomRef.current && liveKitConnected) {
          try { await roomRef.current.localParticipant.setMicrophoneEnabled(true); } catch {}
        }
        await supabase.from('voice_participants').update({ is_muted: false })
          .eq('channel_id', channel.id).eq('user_id', user!.id);
      }
    } else {
      setWasMutedBeforeDeafen(muted);
      if (!muted) {
        setMuted(true);
        if (roomRef.current && liveKitConnected) {
          try { await roomRef.current.localParticipant.setMicrophoneEnabled(false); } catch {}
        }
        await supabase.from('voice_participants').update({ is_muted: true })
          .eq('channel_id', channel.id).eq('user_id', user!.id);
      }
      setDeafened(true);
      if (roomRef.current) {
        roomRef.current.remoteParticipants.forEach(p => p.setVolume(0));
      }
    }
  }

  const activeSpeaker = activeSpeakerId
    ? participants.find(p => p.user_id === activeSpeakerId)
    : null;

  const content = (
    <View style={styles.container}>
      {/* Top AppBar */}
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.appBarBtn}>
            <Ionicons name="arrow-back" size={24} color="#dae2fd" />
          </TouchableOpacity>
          <View style={styles.appBarTitleRow}>
            <Ionicons name="mic" size={20} color="#ddb7ff" style={{ fontVariationSettings: "'FILL' 1" }} />
            <Text style={styles.appBarTitle} numberOfLines={1}>{channel.name}</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.appBarSettings}>Ayarlar</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {joined ? (
        <View style={styles.mainContent}>
          {/* Active Speaker Section */}
          <View style={styles.activeSpeakerSection}>
            <View style={styles.activeSpeakerCenter}>
              <Animated.View style={[styles.pulseRingOuter, { opacity: pulseAnim2, transform: [{ scale: pulseAnim }] }]} />
              <Animated.View style={[styles.pulseRingInner, { opacity: pulseAnim, transform: [{ scale: pulseAnim2 }] }]} />
              <View style={styles.activeAvatarWrap}>
                {(activeSpeaker?.profile?.avatar_url || participants[0]?.profile?.avatar_url) ? (
                  <Image
                    source={{ uri: activeSpeaker?.profile?.avatar_url || participants[0]?.profile?.avatar_url }}
                    style={styles.activeAvatar}
                  />
                ) : (
                  <View style={[styles.activeAvatar, styles.activeAvatarPlaceholder]}>
                    <Text style={styles.activeAvatarLetter}>
                      {((activeSpeaker?.profile?.full_name || participants[0]?.profile?.full_name || '?')[0]).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              {activeSpeaker && (
                <View style={styles.speakingBadge}>
                  <Ionicons name="equalizer" size={12} color="#490080" style={{ fontVariationSettings: "'FILL' 1" }} />
                  <Text style={styles.speakingBadgeText}>Danışır</Text>
                </View>
              )}
            </View>
            <Text style={styles.roomTitle}>Səsli otaq</Text>
            <View style={styles.roomInfoRow}>
              <View style={[styles.statusDot, { backgroundColor: '#4ae176' }]} />
              <Text style={styles.roomInfoText}>{participants.length} istifadəçi bağlı</Text>
            </View>
          </View>

          {/* Participants List */}
          <View style={styles.participantsSection}>
            <Text style={styles.participantsHeader}>İŞTİRAKÇILAR</Text>
            <FlatList
              data={participants}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelf = item.user_id === user!.id;
                const isActiveSpeaker = item.user_id === activeSpeakerId;
                return (
                  <View style={styles.participantCard}>
                    <View style={styles.participantLeft}>
                      <View style={[styles.participantAvatarWrap, isActiveSpeaker && styles.participantAvatarActive]}>
                        {item.profile?.avatar_url ? (
                          <Image source={{ uri: item.profile.avatar_url }} style={styles.participantAvatar} />
                        ) : (
                          <View style={[styles.participantAvatar, styles.participantAvatarPlaceholder]}>
                            <Text style={styles.participantAvatarLetter}>
                              {(item.profile?.full_name || '?')[0].toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View>
                        <Text style={styles.participantName}>
                          {isSelf ? 'Sən' : item.profile?.full_name || 'Adsız'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.participantRight}>
                      <Ionicons
                        name={item.is_muted ? 'mic-off' : 'mic'}
                        size={20}
                        color={item.is_muted ? '#ffb4ab' : '#4ae176'}
                        style={item.is_muted ? {} : { fontVariationSettings: "'FILL' 1" }}
                      />
                    </View>
                  </View>
                );
              }}
              contentContainerStyle={styles.participantList}
            />
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <View style={styles.bottomControlsLeft}>
              <TouchableOpacity
                onPress={toggleMute}
                style={[styles.controlCircle, muted && styles.controlCircleActive]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={muted ? 'mic-off' : 'mic'}
                  size={24}
                  color={muted ? '#fff' : '#e6ecff'}
                  style={muted ? {} : { fontVariationSettings: "'FILL' 1" }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleDeafen}
                style={[styles.controlCircle, deafened && styles.controlCircleDeafen]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="headset"
                  size={24}
                  color={deafened ? '#fff' : '#dae2fd'}
                  style={deafened ? {} : { fontVariationSettings: "'FILL' 1" }}
                />
                {deafened && <View style={styles.deafenLine} />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleScreenShare}
                style={styles.controlCircle}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="screen-share"
                  size={24}
                  color={screenSharing ? '#ddb7ff' : '#dae2fd'}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={leaveVoice}
              style={styles.leaveBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={24} color="#fff" style={{ fontVariationSettings: "'FILL' 1", transform: [{ rotate: '135deg' }] }} />
              <Text style={styles.leaveBtnText}>Ayrıl</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : voicePerms.can_voice ? (
        <View style={styles.joinContainer}>
          <View style={styles.joinContent}>
            <View style={styles.joinIconWrap}>
              <Ionicons name="mic" size={40} color="#ddb7ff" />
            </View>
            <Text style={styles.joinTitle}>Səsli otaq</Text>
            <Text style={styles.joinDesc}>{participants.length} istifadəçi bağlı</Text>
            <TouchableOpacity onPress={joinVoice} style={styles.joinBtn} activeOpacity={0.9}>
              <LinearGradient
                colors={['#b76dff', '#0566d9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.joinBtnGradient}
              >
                <Text style={styles.joinBtnText}>Otağa qatıl</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.noVoiceContainer}>
          <Ionicons name="lock-closed-outline" size={48} color="#94A3B8" />
          <Text style={styles.noVoiceText}>Bu kanalda danışma icazəniz yoxdur</Text>
        </View>
      )}
    </View>
  );

  if (joined && liveKitToken) {
    return (
      <LiveKitRoom
        serverUrl={LIVEKIT_URL}
        token={liveKitToken}
        connect={true}
        audio={true}
        video={false}
        onConnected={onLiveKitConnected}
        onDisconnected={onLiveKitDisconnected}
        room={roomRef.current || undefined}
      >
        {content}
      </LiveKitRoom>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
  },
  appBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
    backgroundColor: 'transparent',
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  appBarBtn: {
    padding: 4,
  },
  appBarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appBarTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ddb7ff',
    fontFamily: 'Geist',
    letterSpacing: -0.5,
    maxWidth: SCREEN_WIDTH * 0.5,
  },
  appBarSettings: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ddb7ff',
    fontFamily: 'Geist',
  },
  mainContent: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 164,
  },
  activeSpeakerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  activeSpeakerCenter: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: 160,
    height: 160,
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 192,
    height: 192,
    borderRadius: 96,
    borderWidth: 1,
    borderColor: 'rgba(221,183,255,0.1)',
  },
  pulseRingInner: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(221,183,255,0.2)',
  },
  activeAvatarWrap: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: '#ddb7ff',
    padding: 4,
    backgroundColor: '#171f33',
    overflow: 'hidden',
    zIndex: 10,
  },
  activeAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  activeAvatarPlaceholder: {
    backgroundColor: '#b76dff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAvatarLetter: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
  },
  speakingBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#ddb7ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 20,
  },
  speakingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#490080',
    fontFamily: 'Geist',
  },
  roomTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Geist',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  roomInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roomInfoText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#94A3B8',
    fontFamily: 'Inter',
  },
  participantsSection: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  participantsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    fontFamily: 'Geist',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  participantList: {
    paddingBottom: 16,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  participantAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  participantAvatarActive: {
    borderColor: '#ddb7ff',
  },
  participantAvatar: {
    width: '100%',
    height: '100%',
  },
  participantAvatarPlaceholder: {
    backgroundColor: '#171f33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarLetter: {
    color: '#ddb7ff',
    fontSize: 18,
    fontWeight: '700',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dae2fd',
    fontFamily: 'Geist',
  },
  participantRole: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ddb7ff',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  participantRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    height: 96,
    backgroundColor: 'rgba(23,31,51,0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  bottomControlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2d3449',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlCircleActive: {
    backgroundColor: '#93000a',
  },
  controlCircleDeafen: {
    backgroundColor: '#93000a',
    position: 'relative',
  },
  deafenLine: {
    position: 'absolute',
    width: 32,
    height: 3,
    backgroundColor: '#ffb4ab',
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#93000a',
    borderRadius: 16,
    paddingHorizontal: 24,
    height: 56,
    maxWidth: 140,
    flex: 1,
  },
  leaveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Geist',
  },
  joinContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  joinContent: {
    alignItems: 'center',
  },
  joinIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(221,183,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  joinTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#dae2fd',
    fontFamily: 'Geist',
    marginBottom: 4,
  },
  joinDesc: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: 'Inter',
    marginBottom: 32,
  },
  joinBtn: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  joinBtnGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Geist',
  },
  noVoiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  noVoiceText: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 20,
  },
});
