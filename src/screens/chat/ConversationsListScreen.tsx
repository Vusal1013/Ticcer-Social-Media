import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';
import type { Profile } from '../../types';

type Conversation = {
  id: string;
  other_user: Profile;
  last_message: string | null;
  last_message_time: string | null;
};

export default function ConversationsListScreen({ navigation, route }: any) {
  const sharePost = route?.params?.sharePost;
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchConversations() {
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user!.id);

    if (!participations || participations.length === 0) {
      setLoading(false);
      return;
    }

    const convIds = participations.map(p => p.conversation_id);

    const { data: otherParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, profile:profiles(*)')
      .in('conversation_id', convIds)
      .neq('user_id', user!.id);

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    if (otherParticipants && messages) {
      const lastMessages = new Map<string, any>();
      messages.forEach(msg => {
        if (!lastMessages.has(msg.conversation_id)) {
          lastMessages.set(msg.conversation_id, msg);
        }
      });

      const list: Conversation[] = otherParticipants.map((p: any) => {
        const last = lastMessages.get(p.conversation_id);
        return {
          id: p.conversation_id,
          other_user: p.profile,
          last_message: last?.content ?? null,
          last_message_time: last?.created_at ?? null,
        };
      });

      list.sort((a, b) => {
        if (!a.last_message_time) return 1;
        if (!b.last_message_time) return -1;
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });

      setConversations(list);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [sharePost]);

  async function handleConversationPress(item: Conversation) {
    if (sharePost) {
      const shareLink = `https://ticcer.app/post/${sharePost.id}`;
      await supabase.from('messages').insert({
        conversation_id: item.id,
        sender_id: user!.id,
        content: `📨 Post: ${sharePost.content}\n🔗 ${shareLink}`,
      });
      navigation.navigate('ChatScreen', { conversationId: item.id, otherUser: item.other_user });
    } else {
      navigation.navigate('ChatScreen', { conversationId: item.id, otherUser: item.other_user });
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  async function deleteForMe(id: string) {
    await supabase.from('conversation_participants').delete().eq('conversation_id', id).eq('user_id', user!.id);
    setDeleteTarget(null);
    fetchConversations();
  }

  async function deleteForEveryone(id: string) {
    await supabase.from('messages').delete().eq('conversation_id', id);
    await supabase.from('conversation_participants').delete().eq('conversation_id', id);
    await supabase.from('conversations').delete().eq('id', id);
    setDeleteTarget(null);
    fetchConversations();
  }

  const renderItem = useCallback(({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.convItem}
      onPress={() => handleConversationPress(item)}
      onLongPress={() => setDeleteTarget(item.id)}
    >
      {item.other_user?.avatar_url ? (
        <Image source={{ uri: item.other_user.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarLetter}>{(item.other_user?.full_name || '?')[0]}</Text>
        </View>
      )}
      <View style={styles.convInfo}>
        <Text style={styles.name}>{item.other_user?.full_name || 'Adsiz'}</Text>
        <Text style={styles.lastMsg} numberOfLines={1}>
          {item.last_message || 'Henuz mesaj yox'}
        </Text>
      </View>
      {item.last_message_time && (
        <Text style={styles.time}>
          {new Date(item.last_message_time).toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' })}
        </Text>
      )}
    </TouchableOpacity>
  ), [navigation]);

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{sharePost ? 'Postu göndər' : 'Mesajlar'}</Text>
        {!sharePost && (
          <TouchableOpacity onPress={() => navigation.navigate('NewConversation')} style={styles.newBtn}>
            <Text style={styles.newBtnText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListFooterComponent={<View style={{ height: 80 }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Henuz mesajlasma yox</Text>
        }
      />

      {deleteTarget && (
        <View style={styles.deleteOverlay}>
          <TouchableOpacity style={styles.deleteBackdrop} onPress={() => setDeleteTarget(null)} />
          <View style={styles.deleteSheet}>
            <Text style={styles.deleteTitle}>Söhbəti sil</Text>
            <TouchableOpacity style={styles.deleteOption} onPress={() => deleteForMe(deleteTarget)}>
              <Text style={styles.deleteOptionText}>Mənim üçün sil</Text>
              <Text style={styles.deleteOptionDesc}>Yalnız sizin siyahınızdan silinər</Text>
            </TouchableOpacity>
            <View style={styles.deleteDivider} />
            <TouchableOpacity style={styles.deleteOption} onPress={() => deleteForEveryone(deleteTarget)}>
              <Text style={[styles.deleteOptionText, { color: '#FF4444' }]}>Hamı üçün sil</Text>
              <Text style={styles.deleteOptionDesc}>Hər kəs üçün silinər, geri qaytarıla bilməz</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteCancel} onPress={() => setDeleteTarget(null)}>
              <Text style={styles.deleteCancelText}>Ləğv et</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
  },
  title: { fontSize: fonts.sizes.xl, fontWeight: '700', color: colors.text },
  newBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  newBtnText: { color: colors.white, fontSize: 22, fontWeight: '700', marginTop: -2 },
  list: { padding: 16 },
  convItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.white, fontSize: 20, fontWeight: '700' },
  convInfo: { flex: 1, marginLeft: 12 },
  name: { color: colors.text, fontWeight: '600', fontSize: fonts.sizes.md },
  lastMsg: { color: colors.textMuted, fontSize: fonts.sizes.sm, marginTop: 2 },
  time: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginLeft: 8 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 60 },

  deleteOverlay: { position: 'absolute', inset: 0, justifyContent: 'flex-end' },
  deleteBackdrop: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  deleteSheet: {
    backgroundColor: '#1E1E3A', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20,
  },
  deleteTitle: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  deleteOption: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#2A2A4A', marginBottom: 8 },
  deleteOptionText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  deleteOptionDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  deleteDivider: { height: 1, backgroundColor: '#3A3A5A', marginVertical: 4 },
  deleteCancel: { paddingVertical: 14, borderRadius: 12, backgroundColor: '#2A2A4A', alignItems: 'center', marginTop: 8 },
  deleteCancelText: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
});
