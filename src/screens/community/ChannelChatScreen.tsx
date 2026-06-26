import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';

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
  const flatListRef = useRef<FlatList>(null);

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

    const channelSub = supabase.channel(`channel-${channel.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_messages', filter: `channel_id=eq.${channel.id}` },
        (payload: any) => {
          setMessages(prev => [...prev, payload.new]);
          if (payload.new.user_id && !profiles[payload.new.user_id]) {
            supabase.from('profiles').select('*').eq('id', payload.new.user_id).single().then(({ data }) => {
              if (data) setProfiles(prev => ({ ...prev, [data.id]: data }));
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channelSub); };
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

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const profile = profiles[item.user_id];
    return (
      <View style={styles.msgRow}>
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
          <Text style={styles.msgText}>{item.content}</Text>
        </View>
      </View>
    );
  }, [profiles]);

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
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={`#${channel.name}`}
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Text style={styles.sendText}>Gonder</Text>
          </TouchableOpacity>
        </View>
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
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, maxHeight: 80 },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center' },
  sendText: { color: colors.white, fontWeight: '600' },
});
