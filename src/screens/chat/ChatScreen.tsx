import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Pressable, KeyboardAvoidingView, Platform, StyleSheet, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';
import { useAudioRecorder, useAudioPlayer, useAudioPlayerStatus, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import { uploadVoice } from '../../lib/voice';
import { formatLastSeen } from '../../lib/presence';

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

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, otherUser } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDur, setRecordingDur] = useState(0);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [recordedVoice, setRecordedVoice] = useState<{ uri: string; duration: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [otherProfile, setOtherProfile] = useState<any>(otherUser);
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
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  }

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchOtherProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', otherUser.id).single();
    if (data) setOtherProfile(data);
  }

  useEffect(() => {
    fetchOtherProfile();
    const interval = setInterval(fetchOtherProfile, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user || messages.length === 0) return;
    const myId = user.id;
    const unreadIds = messages.filter(m => m.sender_id !== myId && !m.read_at).map(m => m.id);
    if (unreadIds.length > 0) {
      const now = new Date().toISOString();
      supabase.from('messages').update({ delivered_at: now, read_at: now }).in('id', unreadIds);
    }
  }, [messages, user]);

  async function sendMessage() {
    if (!text.trim()) return;
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user!.id,
      content: text.trim(),
    });
    if (error) {
      Alert.alert('Xeta', error.message);
    } else {
      setText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function startVoiceRecording() {
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
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
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

  async function deleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    Alert.alert('Mesajları sil', `${ids.length} mesaj silinsin?`, [
      { text: 'Ləğv et', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await supabase.from('messages').delete().in('id', ids);
        setSelectedIds(new Set());
        setSelectMode(false);
        fetchMessages();
      }},
    ]);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function formatDur(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isMine = item.sender_id === user!.id;
    const isSelected = selectedIds.has(item.id);
    const isVoice = !!item.audio_url;
    const isThisPlaying = playingMsgId === item.id && status.playing;
    return (
      <TouchableOpacity
        style={[styles.msgRow, isMine ? styles.myMsgRow : styles.theirMsgRow]}
        onPress={() => {
          if (selectMode) toggleSelect(item.id);
          else if (isVoice) togglePlayVoice(item.id, item.audio_url);
        }}
        onLongPress={() => { if (!selectMode) { setSelectMode(true); toggleSelect(item.id); } }}
        activeOpacity={selectMode ? 0.6 : 1}
      >
        {selectMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkMark}>✓</Text>}
          </View>
        )}
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble, isSelected && styles.selectedBubble, isVoice && styles.voiceBubble]}>
          {isVoice ? (
            <View style={styles.voiceRow}>
              <Ionicons
                name={isThisPlaying ? 'pause-circle' : 'play-circle'}
                size={24}
                color={isMine ? colors.white : colors.primary}
              />
              <VoiceWave isPlaying={isThisPlaying} color={isMine ? colors.white : colors.primary} />
              <Text style={[styles.voiceTime, { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
                {isThisPlaying ? formatDur(status.currentTime) : formatDur(item.voice_duration)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.msgText, isMine ? styles.myMsgText : styles.theirMsgText]}>
              {item.content}
            </Text>
          )}
          <View style={[styles.msgFooter, isMine ? styles.myMsgFooter : styles.theirMsgFooter]}>
            <Text style={[styles.msgTime, isMine ? styles.myMsgTime : styles.theirMsgTime]}>
              {new Date(item.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMine && (
              <Ionicons
                name={item.read_at ? 'checkmark-done' : item.delivered_at ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.read_at ? '#53BDEB' : 'rgba(255,255,255,0.5)'}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [selectedIds, selectMode, playingMsgId, status]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (selectMode) { setSelectMode(false); setSelectedIds(new Set()); }
          else navigation.goBack();
        }}>
          <Text style={styles.backBtn}>{selectMode ? 'Imtina' : 'Geri'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName}>
            {selectMode ? `${selectedIds.size} secildi` : (otherUser?.full_name || 'Mesaj')}
          </Text>
          {!selectMode && otherProfile && (
            <Text style={[styles.headerStatus, { color: otherProfile.is_online ? colors.success : colors.textMuted }]}>
              {otherProfile.is_online ? '● Online' : formatLastSeen(otherProfile.last_seen)}
            </Text>
          )}
        </View>
        {!selectMode ? (
          <TouchableOpacity onPress={() => setSelectMode(true)}>
            <Text style={styles.selectBtn}>Sec</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => !selectMode && flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {selectMode ? (
        <View style={styles.bulkBar}>
          <TouchableOpacity style={styles.deleteAllBtn} onPress={deleteSelected}>
            <Text style={styles.deleteAllText}>Secilmisleri sil ({selectedIds.size})</Text>
          </TouchableOpacity>
        </View>
      ) : isRecording ? (
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
            placeholder="Mesaj yaz..."
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
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerName: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  headerStatus: { fontSize: fonts.sizes.xs, marginTop: 1 },
  msgList: { padding: 16, paddingBottom: 8 },
  msgRow: { marginBottom: 8 },
  myMsgRow: { alignItems: 'flex-end' },
  theirMsgRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  myBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  msgText: { fontSize: fonts.sizes.md },
  myMsgText: { color: colors.white },
  theirMsgText: { color: colors.text },
  msgFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  myMsgFooter: { justifyContent: 'flex-end' },
  theirMsgFooter: { justifyContent: 'flex-start' },
  msgTime: { fontSize: fonts.sizes.xs },
  myMsgTime: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  theirMsgTime: { color: colors.textMuted },
  inputRow: { flexDirection: 'row', padding: 12, paddingBottom: 90, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, maxHeight: 80 },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center' },
  sendText: { color: colors.white, fontWeight: '600' },
  micBtn: { backgroundColor: colors.primary, borderRadius: 24, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  selectBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  bulkBar: { padding: 12, paddingBottom: 90, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  deleteAllBtn: { backgroundColor: '#FF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  deleteAllText: { color: colors.white, fontWeight: '700', fontSize: fonts.sizes.md },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  checkboxSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkMark: { color: colors.white, fontSize: 14, fontWeight: '700' },
  selectedBubble: { opacity: 0.6 },
  voiceBubble: { minWidth: 160 },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voiceTime: { fontSize: fonts.sizes.xs, fontWeight: '600', minWidth: 32, textAlign: 'right' },
  recordingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, paddingBottom: 90, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  recordingIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF4444' },
  recordingText: { color: colors.text, fontSize: fonts.sizes.md, fontWeight: '600' },
  voicePreviewBar: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 90, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  previewPlayBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  voicePreviewInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  voicePreviewText: { color: colors.text, fontSize: fonts.sizes.sm, fontWeight: '600' },
  sendVoiceBtn: { backgroundColor: colors.primary, borderRadius: 24, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
