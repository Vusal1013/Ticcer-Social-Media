import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Pressable, Alert, KeyboardAvoidingView, Platform, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';
import { useAudioRecorder, useAudioPlayer, useAudioPlayerStatus, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import { uploadVoice } from '../../lib/voice';

function VoiceWave({ isPlaying, color }: { isPlaying: boolean; color: string }) {
  const bars = useRef(Array.from({ length: 5 }, () => new Animated.Value(0.3))).current;
  const anim = useRef<Animated.CompositeAnimation>();

  useEffect(() => {
    if (isPlaying) {
      const seqs = bars.map((b, i) =>
        Animated.sequence([
          Animated.timing(b, { toValue: 1, duration: 400 + i * 80, useNativeDriver: true }),
          Animated.timing(b, { toValue: 0.3, duration: 400 + i * 80, useNativeDriver: true }),
        ])
      );
      anim.current = Animated.loop(Animated.stagger(120, seqs));
      anim.current.start();
    } else {
      anim.current?.stop();
      bars.forEach(b => b.setValue(0.3));
    }
    return () => anim.current?.stop();
  }, [isPlaying]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 18 }}>
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            height: 8 + i * 3,
            borderRadius: 2,
            backgroundColor: color,
            opacity: b,
          }}
        />
      ))}
    </View>
  );
}

export default function ChannelChatScreen({ route, navigation }: any) {
  const { channel, community } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [isBanned, setIsBanned] = useState(false);
  const [bannedWords, setBannedWords] = useState<string[]>(channel.banned_words || []);
  const [slowMode, setSlowMode] = useState(channel.slow_mode || false);
  const [slowInterval, setSlowInterval] = useState(channel.slow_mode_interval || 0);
  const [lastMsgTime, setLastMsgTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDur, setRecordingDur] = useState(0);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [recordedVoice, setRecordedVoice] = useState<{ uri: string; duration: number } | null>(null);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const durInterval = useRef<any>(null);
  const recordingStartedAt = useRef(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, useCallback((recStatus) => {
    if (recStatus.isFinished && recStatus.url) {
      const st = recorder.getStatus();
      const elapsed = recordingStartedAt.current > 0 ? (Date.now() - recordingStartedAt.current) / 1000 : 0;
      const dur = (st.durationMillis || 0) / 1000 || elapsed;
      setRecordedVoice({ uri: recStatus.url, duration: dur });
    }
  }, []));
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const previewPlayer = useAudioPlayer(null);
  const previewPlayerStatus = useAudioPlayerStatus(previewPlayer);

  useEffect(() => {
    if (status.didJustFinish) {
      setPlayingMsgId(null);
    }
  }, [status.didJustFinish]);

  async function fetchMessages() {
    const { data } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data);
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profileData } = await supabase.from('profiles').select('*').in('id', userIds);
      if (profileData) {
        const map: Record<string, any> = {};
        profileData.forEach(p => { map[p.id] = p; });
        setProfiles(map);
      }
    }
  }

  useEffect(() => {
    fetchMessages();
    checkBan();
    fetchChannelSettings();

    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  async function checkBan() {
    const { data } = await supabase
      .from('channel_bans')
      .select('id')
      .eq('channel_id', channel.id)
      .eq('user_id', user!.id)
      .single();
    setIsBanned(!!data);
  }

  async function fetchChannelSettings() {
    const { data } = await supabase
      .from('community_channels')
      .select('banned_words, slow_mode, slow_mode_interval')
      .eq('id', channel.id)
      .single();
    if (data) {
      setBannedWords(data.banned_words || []);
      setSlowMode(data.slow_mode || false);
      setSlowInterval(data.slow_mode_interval || 0);
    }
  }

  function containsBannedWord(content: string): string | null {
    const lower = content.toLowerCase();
    const found = bannedWords.find(w => lower.includes(w.toLowerCase()));
    return found || null;
  }

  async function sendMessage() {
    if (!text.trim()) return;

    if (isBanned) {
      return Alert.alert('Banlandiniz', 'Bu kanalda mesaj gondere bilmezsiniz');
    }

    const banned = containsBannedWord(text);
    if (banned) {
      return Alert.alert('Qadagan soz', `"${banned}" sozu qadagandir`);
    }

    if (slowMode && slowInterval > 0) {
      const now = Date.now();
      if (now - lastMsgTime < slowInterval * 1000) {
        const remaining = Math.ceil((slowInterval * 1000 - (now - lastMsgTime)) / 1000);
        return Alert.alert('Yavas rejim', `${remaining} saniye gozleyin`);
      }
      setLastMsgTime(now);
    }

    const { error } = await supabase.from('channel_messages').insert({
      channel_id: channel.id, user_id: user!.id, content: text.trim(),
    });
    if (!error) {
      setText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function startVoiceRecording() {
    if (isBanned) {
      return Alert.alert('Banlandiniz', 'Bu kanalda sesli mesaj gondere bilmezsiniz');
    }
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      return Alert.alert('Icaze yoxdur', 'Ses yazmaq ucun mikrofona icaze verin');
    }
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingStartedAt.current = Date.now();
      setIsRecording(true);
      setRecordingDur(0);
      durInterval.current = setInterval(() => {
        setRecordingDur(prev => prev + 1);
      }, 1000);
    } catch (e: any) {
      Alert.alert('Xeta', e.message || 'Ses yazila bilmedi');
    }
  }

  async function stopVoiceRecording() {
    try {
      await recorder.stop();
      setIsRecording(false);
      clearInterval(durInterval.current);
    } catch (e: any) {
      Alert.alert('Xeta', e.message || 'Ses yazila bilmedi');
      setIsRecording(false);
      clearInterval(durInterval.current);
    }
  }

  async function sendVoiceMessage() {
    if (!recordedVoice || !user) return;
    setSending(true);
    try {
      const audioUrl = await uploadVoice(recordedVoice.uri, user.id);
      const { error } = await supabase.from('channel_messages').insert({
        channel_id: channel.id,
        user_id: user.id,
        content: null,
        audio_url: audioUrl,
        voice_duration: Math.round(recordedVoice.duration),
      });
      if (error) Alert.alert('Xeta', error.message);
      else {
        setRecordedVoice(null);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e: any) {
      Alert.alert('Xeta', e.message || 'Ses gonderile bilmedi');
    } finally {
      setSending(false);
    }
  }

  function togglePlayVoice(msgId: string, audioUrl: string) {
    if (playingMsgId === msgId) {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } else {
      player.replace(audioUrl);
      player.play();
      setPlayingMsgId(msgId);
    }
  }

  function togglePreviewPlayback() {
    if (!recordedVoice) return;
    if (previewPlayerStatus.playing) {
      previewPlayer.pause();
    } else {
      previewPlayer.replace(recordedVoice.uri);
      previewPlayer.play();
    }
  }

  function closePreview() {
    if (previewPlayerStatus.playing) {
      previewPlayer.stop();
    }
    setRecordedVoice(null);
  }

  function formatDur(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const profile = profiles[item.user_id];
    const isVoice = !!item.audio_url;
    const isThisPlaying = playingMsgId === item.id && status.playing;
    return (
      <TouchableOpacity style={styles.msgRow} activeOpacity={0.7} onPress={() => isVoice && togglePlayVoice(item.id, item.audio_url)}>
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarLetter}>{(profile?.full_name || '?')[0]}</Text>
        </View>
        <View style={styles.msgContent}>
          <View style={styles.msgHeader}>
            <Text style={styles.msgSender}>{profile?.full_name || 'Bilinmir'}</Text>
            <Text style={styles.msgTime}>
              {new Date(item.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          {isVoice ? (
            <View style={styles.voiceRow}>
              <Ionicons
                name={isThisPlaying ? 'pause-circle' : 'play-circle'}
                size={22}
                color={colors.primary}
              />
              <VoiceWave isPlaying={isThisPlaying} color={colors.primary} />
              <Text style={styles.voiceTime}>
                {isThisPlaying ? formatDur(status.currentTime) : formatDur(item.voice_duration)}
              </Text>
            </View>
          ) : (
            <Text style={styles.msgText}>{item.content}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [profiles, playingMsgId, status]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Geri</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>#{channel.name}</Text>
          <Text style={styles.communityName}>{community.name}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ChannelSettings', { channel, community })}>
          <Text style={styles.settingsBtn}>Ayarlar</Text>
        </TouchableOpacity>
      </View>

      {isBanned && (
        <View style={styles.banBanner}>
          <Text style={styles.banText}>Bu kanalda banlandiniz</Text>
        </View>
      )}

      {slowMode && (
        <View style={styles.slowBanner}>
          <Text style={styles.slowText}>Yavas rejim: {slowInterval} saniye</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {!isBanned && (
        isRecording ? (
          <TouchableOpacity style={styles.recordingBar} onPress={stopVoiceRecording}>
            <View style={styles.recordingIndicator} />
            <Text style={styles.recordingText}>Ses yazilir {formatDur(recordingDur)}</Text>
            <Ionicons name="stop-circle" size={32} color="#FF4444" />
          </TouchableOpacity>
        ) : recordedVoice ? (
          <View style={styles.voicePreviewBar}>
            <TouchableOpacity onPress={closePreview}>
              <Ionicons name="close-circle" size={24} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePreviewPlayback} style={styles.previewPlayBtn}>
              <Ionicons
                name={previewPlayerStatus.playing ? 'pause' : 'play'}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
            <View style={styles.voicePreviewInfo}>
              <Ionicons name="musical-note" size={18} color={colors.primary} />
              <Text style={styles.voicePreviewText}>
                {previewPlayerStatus.playing
                  ? formatDur(previewPlayerStatus.currentTime)
                  : formatDur(recordedVoice.duration)}
                {' / '}
                {formatDur(recordedVoice.duration)}
              </Text>
            </View>
            <TouchableOpacity style={styles.sendVoiceBtn} onPress={sendVoiceMessage} disabled={sending}>
              <Ionicons name={sending ? 'hourglass' : 'send'} size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={`#${channel.name}`}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            {text.trim() ? (
              <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                <Text style={styles.sendText}>Gonder</Text>
              </TouchableOpacity>
            ) : (
              <Pressable
                onPressIn={startVoiceRecording}
                onPressOut={stopVoiceRecording}
                style={styles.micBtn}
              >
                <Ionicons name="mic" size={22} color={colors.white} />
              </Pressable>
            )}
          </View>
        )
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  communityName: { color: colors.textMuted, fontSize: fonts.sizes.xs },
  settingsBtn: { color: colors.textMuted, fontSize: fonts.sizes.sm },
  banBanner: { backgroundColor: colors.error + '30', padding: 10, alignItems: 'center' },
  banText: { color: colors.error, fontWeight: '600' },
  slowBanner: { backgroundColor: colors.warning + '30', padding: 6, alignItems: 'center' },
  slowText: { color: colors.warning, fontSize: fonts.sizes.xs },
  msgList: { padding: 16 },
  msgRow: { flexDirection: 'row', marginBottom: 16 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.white, fontSize: 14, fontWeight: '700' },
  msgContent: { flex: 1, marginLeft: 10 },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msgSender: { color: colors.primary, fontWeight: '600', fontSize: fonts.sizes.sm },
  msgTime: { color: colors.textMuted, fontSize: fonts.sizes.xs },
  msgText: { color: colors.text, fontSize: fonts.sizes.md, marginTop: 2, lineHeight: 20 },
  inputRow: { flexDirection: 'row', padding: 12, paddingBottom: 90, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, maxHeight: 80 },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center' },
  sendText: { color: colors.white, fontWeight: '600' },
  micBtn: { backgroundColor: colors.primary, borderRadius: 24, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  voiceTime: { color: colors.textMuted, fontSize: fonts.sizes.xs, fontWeight: '600', minWidth: 32, textAlign: 'right' },
  recordingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, paddingBottom: 90, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: 10 },
  recordingIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF4444' },
  recordingText: { color: colors.text, fontSize: fonts.sizes.md, fontWeight: '600' },
  voicePreviewBar: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 90, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  previewPlayBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  voicePreviewInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  voicePreviewText: { color: colors.text, fontSize: fonts.sizes.sm, fontWeight: '600' },
  sendVoiceBtn: { backgroundColor: colors.primary, borderRadius: 24, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
