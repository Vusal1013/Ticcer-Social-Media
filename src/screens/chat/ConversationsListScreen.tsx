import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
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
    const channel = supabase.channel('conv-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  const renderItem = useCallback(({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.convItem}
      onPress={() => handleConversationPress(item)}
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
        ListEmptyComponent={
          <Text style={styles.empty}>Henuz mesajlasma yox</Text>
        }
      />
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
});
