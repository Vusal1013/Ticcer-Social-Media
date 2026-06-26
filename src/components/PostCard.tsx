import { useState, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, Share } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import VerifiedBadge from './VerifiedBadge';
import { fonts } from '../constants/theme';
import type { Post } from '../types';

type Props = {
  post: Post;
  onPress?: () => void;
  onRefresh?: () => void;
};

const HASHTAG_RE = /(#\w+)/g;
const MENTION_RE = /(@\w+)/g;

function renderContent(text: string) {
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
  const [liked, setLiked] = useState(post.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes_count ?? 0);
  const contentParts = useMemo(() => renderContent(post.content), [post.content]);

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

  async function handleRepost() {
    if (!user) return;
    const { error } = await supabase.from('reposts').insert({ user_id: user.id, post_id: post.id });
    if (error) Alert.alert('Xəta', error.message);
    else Alert.alert('Repost edildi!');
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
      </View>

      <Text style={[styles.content, { color: colors.text }]}>
        {contentParts.map((part, i) =>
          part.type === 'hashtag' ? (
            <Text key={i} style={[styles.hashtag, { color: colors.primary }]}>{part.text}</Text>
          ) : part.type === 'mention' ? (
            <Text key={i} style={[styles.mention, { color: colors.secondary }]}>{part.text}</Text>
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
          <Text style={[styles.actionIcon, liked && liked && { color: colors.error }]}>
            {liked ? '❤️' : '🤍'}
          </Text>
          <Text style={[styles.actionCount, { color: colors.textSecondary }, liked && { color: colors.error }]}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onPress} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={[styles.actionCount, { color: colors.textSecondary }]}>{post.comments_count ?? 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRepost} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>🔄</Text>
        </TouchableOpacity>
      </View>
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
  name: { fontWeight: fonts.weights.semibold, fontSize: fonts.sizes.sm },
  handle: { fontSize: fonts.sizes.xs, marginTop: 1 },
  content: { fontSize: fonts.sizes.md, lineHeight: 22, marginBottom: 12 },
  hashtag: { fontWeight: fonts.weights.semibold },
  mention: { fontWeight: fonts.weights.semibold },
  image: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 16 },
  actionCount: { fontSize: fonts.sizes.xs },
});
