import { useState, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, StyleSheet, Alert, Share, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import VerifiedBadge from './VerifiedBadge';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/theme';
import type { Post } from '../types';

type Props = {
  post: Post;
  onPress?: () => void;
  onRefresh?: () => void;
};

const HASHTAG_RE = /(#\w+)/g;
const MENTION_RE = /(@\w+)/g;

function renderContent(text: string, onHashtagPress: (tag: string) => void, onMentionPress: (mention: string) => void) {
  const parts: { text: string; type: 'text' | 'hashtag' | 'mention' }[] = [];
  const tokens = text.split(/((?:#|@)\w+)/g);
  for (const token of tokens) {
    if (!token) continue;
    if (token.startsWith('#') && token.length > 1) {
      parts.push({ text: token, type: 'hashtag' });
    } else if (token.startsWith('@') && token.length > 1) {
      parts.push({ text: token, type: 'mention' });
    } else {
      parts.push({ text: token, type: 'text' });
    }
  }
  return parts;
}

export default function PostCard({ post, onPress, onRefresh }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [liked, setLiked] = useState(post.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes_count ?? 0);
  const [saved, setSaved] = useState(post.is_saved ?? false);
  const [showShare, setShowShare] = useState(false);

  function handleHashtagPress(tag: string) {
    navigation.navigate('SearchTab', { screen: 'SearchMain', params: { hashtag: tag } });
  }

  function handleMentionPress(mention: string) {
    const username = mention.replace('@', '');
    navigation.navigate('SearchTab', { screen: 'SearchMain', params: { searchUser: username } });
  }

  const contentParts = useMemo(
    () => renderContent(post.content, handleHashtagPress, handleMentionPress),
    [post.content]
  );

  async function toggleLike() {
    if (!user) return;
    if (liked) {
      await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', post.id);
      setLiked(false);
      setLikesCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase.from('post_likes').insert({ user_id: user.id, post_id: post.id });
      setLiked(true);
      setLikesCount(prev => prev + 1);
    }
  }

  async function toggleSave() {
    if (!user) return;
    if (saved) {
      await supabase.from('saved_posts').delete().eq('user_id', user.id).eq('post_id', post.id);
      setSaved(false);
    } else {
      await supabase.from('saved_posts').insert({ user_id: user.id, post_id: post.id });
      setSaved(true);
    }
  }

  async function handleRepost() {
    if (!user) return;
    const { error } = await supabase.from('reposts').insert({ user_id: user.id, post_id: post.id });
    if (error) Alert.alert('Xəta', error.message);
    else Alert.alert('Repost edildi!');
  }

  function handleShareToFriends() {
    setShowShare(false);
    navigation.navigate('ConversationsList', { sharePost: post });
  }

  async function handleShareToApps() {
    setShowShare(false);
    try {
      const postUrl = `https://ticcer.app/p/${post.id}`;
      await Share.share({
        message: `${post.content}\n\n🔗 ${postUrl}`,
        url: postUrl,
      });
    } catch {}
  }

  const timeAgo = new Date(post.created_at).toLocaleDateString('az-AZ', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <TouchableOpacity onPress={onPress} style={[styles.card, { backgroundColor: colors.card }]} activeOpacity={0.8}>
      <View style={styles.header}>
        {post.profile?.avatar_url ? (
          <Image source={{ uri: post.profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarLetter, { color: colors.white }]}>{(post.profile?.full_name || '?')[0]}</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>{post.profile?.full_name || 'Adsız'}</Text>
            {post.profile?.verified && <VerifiedBadge size={12} />}
          </View>
          <Text style={[styles.handle, { color: colors.textMuted }]}>@{post.profile?.username} · {timeAgo}</Text>
        </View>
        {user && post.user_id === user.id && (
          <TouchableOpacity onPress={() => {
            Alert.alert('Postu sil', 'Bu post silinsin?', [
              { text: 'Legv et', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: async () => {
                await supabase.from('posts').delete().eq('id', post.id);
                onRefresh?.();
              }},
            ]);
          }} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.content, { color: colors.text }]}>
        {contentParts.map((part, i) =>
          part.type === 'hashtag' ? (
            <Text key={i} style={[styles.hashtag, { color: colors.primary }]} onPress={() => handleHashtagPress(part.text)}>{part.text}</Text>
          ) : part.type === 'mention' ? (
            <Text key={i} style={[styles.mention, { color: colors.secondary }]} onPress={() => handleMentionPress(part.text)}>{part.text}</Text>
          ) : (
            <Text key={i}>{part.text}</Text>
          )
        )}
      </Text>

      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="cover" />
      )}

      <View style={styles.actions}>
        <TouchableOpacity onPress={toggleLike} style={styles.actionBtn}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? colors.error : colors.textSecondary} />
          <Text style={[styles.actionCount, { color: colors.textSecondary }, liked && { color: colors.error }]}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onPress} style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.actionCount, { color: colors.textSecondary }]}>{post.comments_count ?? 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRepost} style={styles.actionBtn}>
          <Ionicons name="repeat-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleSave} style={styles.actionBtn}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={16} color={saved ? '#FFD700' : colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowShare(true)} style={styles.actionBtn}>
          <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={showShare} transparent animationType="slide" onRequestClose={() => setShowShare(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowShare(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.textMuted }]} />

            <Text style={[styles.sheetTitle, { color: colors.text }]}>Paylaş</Text>

            <TouchableOpacity style={styles.sheetOption} onPress={handleShareToFriends}>
              <View style={[styles.sheetIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Dostlara göndər</Text>
                <Text style={[styles.sheetOptionDesc, { color: colors.textMuted }]}>Mesaj olaraq paylaş</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.sheetOption} onPress={handleShareToApps}>
              <View style={[styles.sheetIcon, { backgroundColor: colors.secondary + '20' }]}>
                <Ionicons name="share-outline" size={22} color={colors.secondary} />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Digər proqramlara göndər</Text>
                <Text style={[styles.sheetOptionDesc, { color: colors.textMuted }]}>WhatsApp, Telegram və s.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowShare(false)}>
              <Text style={[styles.cancelText, { color: colors.text }]}>Ləğv et</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 16, fontWeight: fonts.weights.bold },
  headerInfo: { marginLeft: 10, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteBtn: { padding: 4, marginLeft: 8 },
  name: { fontWeight: fonts.weights.semibold, fontSize: fonts.sizes.sm },
  handle: { fontSize: fonts.sizes.xs, marginTop: 1 },
  content: { fontSize: fonts.sizes.md, lineHeight: 22, marginBottom: 12 },
  hashtag: { fontWeight: fonts.weights.semibold },
  mention: { fontWeight: fonts.weights.semibold },
  image: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 16 },
  actionCount: { fontSize: fonts.sizes.xs },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, marginBottom: 20 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  sheetIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetEmoji: { fontSize: 22 },
  sheetOptionText: { marginLeft: 14, flex: 1 },
  sheetOptionTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  sheetOptionDesc: { fontSize: fonts.sizes.sm, marginTop: 2 },
  divider: { height: 1 },
  cancelBtn: {
    marginTop: 16, borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
});
