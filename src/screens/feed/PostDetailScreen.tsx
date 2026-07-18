import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, Image, Share, Modal, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import VerifiedBadge from '../../components/VerifiedBadge';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/theme';
import ReportModal from '../../components/ReportModal';
import AICommentSuggestions from '../../components/AICommentSuggestions';
import type { Post } from '../../types';

type Comment = {
  id: string;
  user_id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  profile?: any;
  replies?: Comment[];
  reactions?: { emoji: string; count: number; user_reacted: boolean }[];
};

const REACTION_EMOJIS = ['❤️', '🔥', '👍', '😂', '😢', '😮'];

export default function PostDetailScreen({ route, navigation }: any) {
  const { post: initialPost, source } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const [post, setPost] = useState<Post>(initialPost);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [liked, setLiked] = useState(initialPost.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(initialPost.likes_count ?? 0);
  const [saved, setSaved] = useState(initialPost.is_saved ?? false);
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reactionPickerCommentId, setReactionPickerCommentId] = useState<string | null>(null);

  async function fetchPost() {
    const { data } = await supabase
      .from('posts')
      .select(`*, profile:profiles(*), likes:post_likes(count)`)
      .eq('id', post.id)
      .single();
    if (data) {
      const raw = data as any;
      const likes_count = raw.likes?.[0]?.count ?? 0;
      setPost((prev: Post) => ({ ...prev, ...raw, likes_count }));
      setLikesCount(likes_count);

      if (user) {
        const { data: myLike } = await supabase
          .from('post_likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('post_id', post.id)
          .single();
        setLiked(!!myLike);

        const { data: mySave } = await supabase
          .from('saved_posts')
          .select('id')
          .eq('user_id', user.id)
          .eq('post_id', post.id)
          .single();
        setSaved(!!mySave);
      }
    }
  }

  async function fetchComments() {
    const { data } = await supabase
      .from('post_comments')
      .select('*, profile:profiles(*)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    if (data) {
      const commentIds = data.map((c: any) => c.id);
      const { data: reactionsData } = await supabase
        .from('comment_reactions')
        .select('*')
        .in('comment_id', commentIds);

      const reactionsByComment = new Map<string, any[]>();
      for (const r of (reactionsData || [])) {
        if (!reactionsByComment.has(r.comment_id)) reactionsByComment.set(r.comment_id, []);
        reactionsByComment.get(r.comment_id)!.push(r);
      }

      const enriched = data.map((c: any) => {
        const cReactions = reactionsByComment.get(c.id) || [];
        const emojiMap = new Map<string, { count: number; user_reacted: boolean }>();
        for (const r of cReactions) {
          const existing = emojiMap.get(r.emoji) || { count: 0, user_reacted: false };
          emojiMap.set(r.emoji, {
            count: existing.count + 1,
            user_reacted: existing.user_reacted || r.user_id === user?.id,
          });
        }
        const reactions = Array.from(emojiMap.entries()).map(([emoji, data]) => ({ emoji, ...data }));
        return { ...c, reactions };
      });

      const grouped = enriched.reduce((acc: any[], c: Comment) => {
        if (!c.parent_id) {
          acc.push({ ...c, replies: [] });
        }
        return acc;
      }, []);
      const replyMap = new Map<string, Comment[]>();
      for (const c of enriched) {
        if (c.parent_id) {
          if (!replyMap.has(c.parent_id)) replyMap.set(c.parent_id, []);
          replyMap.get(c.parent_id)!.push(c);
        }
      }
      for (const parent of grouped) {
        parent.replies = replyMap.get(parent.id) || [];
      }
      setComments(grouped);
    }
  }

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, []);

  async function toggleLike() {
    if (!user) return;
    if (liked) {
      await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', post.id);
      setLiked(false);
      setLikesCount((prev: number) => Math.max(0, prev - 1));
    } else {
      await supabase.from('post_likes').insert({ user_id: user.id, post_id: post.id });
      setLiked(true);
      setLikesCount((prev: number) => prev + 1);
    }
  }

  async function handleComment() {
    if (!newComment.trim()) return;
    const { error } = await supabase.from('post_comments').insert({
      user_id: user!.id,
      post_id: post.id,
      parent_id: replyTo?.id || null,
      content: newComment.trim(),
    });
    if (error) return Alert.alert('Xəta', error.message);
    setNewComment('');
    setReplyTo(null);
    fetchPost();
    fetchComments();
  }

  const timeAgo = new Date(post.created_at).toLocaleDateString('az-AZ', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  async function deleteComment(id: string) {
    Alert.alert('Commenti sil', 'Bu comment silinsin?', [
      { text: 'Legv et', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await supabase.from('post_comments').delete().eq('id', id);
        fetchComments();
      }},
    ]);
  }

  function canDeleteComment(commentUserId: string) {
    return commentUserId === user?.id || post.user_id === user?.id;
  }

  async function toggleReaction(commentId: string, emoji: string) {
    if (!user) return;
    const { data: existing } = await supabase
      .from('comment_reactions')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from('comment_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('comment_reactions').insert({
        comment_id: commentId,
        user_id: user.id,
        emoji,
      });
    }
    setReactionPickerCommentId(null);
    fetchComments();
  }

  function renderComment(comment: Comment, isReply: boolean = false) {
    const showDelete = canDeleteComment(comment.user_id);
    return (
      <View key={comment.id} style={[styles.comment, { backgroundColor: colors.surface }, isReply && styles.replyComment]}>
        <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder, { backgroundColor: colors.primary }]}>
          <Text style={styles.commentAvatarLetter}>{(comment.profile?.full_name || '?')[0]}</Text>
        </View>
        <View style={styles.commentBody}>
          <Text style={[styles.commentName, { color: colors.text }]}>{comment.profile?.full_name}</Text>
          <Text style={[styles.commentText, { color: colors.textSecondary }]}>{comment.content}</Text>

          {comment.reactions && comment.reactions.length > 0 && (
            <View style={styles.reactionsRow}>
              {comment.reactions.map((r, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.reactionChip, r.user_reacted && { backgroundColor: colors.primary + '25', borderColor: colors.primary + '40' }]}
                  onPress={() => toggleReaction(comment.id, r.emoji)}
                >
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  <Text style={[styles.reactionCount, { color: r.user_reacted ? colors.primary : colors.textMuted }]}>{r.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.commentActions}>
            <TouchableOpacity onPress={() => setReplyTo(comment)}>
              <Text style={[styles.replyBtn, { color: colors.primary }]}>Cavabla</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReactionPickerCommentId(reactionPickerCommentId === comment.id ? null : comment.id)}>
              <Text style={[styles.replyBtn, { color: colors.textMuted }]}>😊</Text>
            </TouchableOpacity>
            {showDelete && (
              <TouchableOpacity onPress={() => deleteComment(comment.id)} style={styles.deleteCommentBtn}>
                <Ionicons name="trash-outline" size={14} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>

          {reactionPickerCommentId === comment.id && (
            <View style={[styles.reactionPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity key={emoji} style={styles.reactionPickerBtn} onPress={() => toggleReaction(comment.id, emoji)}>
                  <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={StyleSheet.absoluteFill} />
      <TouchableOpacity
        onPress={() => {
          if (source === 'ProfileTab') navigation.navigate('ProfileTab', { screen: 'ProfileMain' });
          else if (source === 'SearchTab') navigation.navigate('SearchTab', { screen: 'SearchMain' });
          else navigation.goBack();
        }}
        style={styles.backBtn}
      >
        <Text style={[styles.backText, { color: colors.primary }]}>← Geri</Text>
      </TouchableOpacity>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View style={[styles.postCard, { backgroundColor: colors.card }]}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.headerRowInner}
                onPress={() => {
                  if (post.profile?.id) navigation.navigate('ProfileTab', { screen: 'ProfileMain', params: { userId: post.profile.id } });
                }}
                activeOpacity={0.7}
              >
                {post.profile?.avatar_url ? (
                  <Image source={{ uri: post.profile.avatar_url }} style={styles.postAvatar} />
                ) : (
                  <View style={[styles.postAvatar, styles.postAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.postAvatarLetter, { color: colors.white }]}>{(post.profile?.full_name || '?')[0]}</Text>
                  </View>
                )}
                <View style={styles.headerInfo}>
                  <Text style={[styles.postName, { color: colors.text }]}>{post.profile?.full_name || 'Adsız'}</Text>
                  <Text style={[styles.postHandle, { color: colors.primary }]}>@{post.profile?.username}</Text>
                  <Text style={[styles.postTime, { color: colors.textMuted }]}>{timeAgo}</Text>
                </View>
              </TouchableOpacity>
              {user && post.user_id === user.id ? (
                <TouchableOpacity onPress={() => {
                  Alert.alert('Postu sil', 'Bu post silinsin?', [
                    { text: 'Legv et', style: 'cancel' },
                    { text: 'Sil', style: 'destructive', onPress: async () => {
                      await supabase.from('posts').delete().eq('id', post.id);
                      navigation.goBack();
                    }},
                  ]);
                }} style={styles.postDeleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => {
                  Alert.alert('', '', [
                    { text: 'Şikayət et', style: 'destructive', onPress: () => setShowReport(true) },
                    { text: 'Ləğv et', style: 'cancel' },
                  ]);
                }} style={styles.postDeleteBtn}>
                  <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>

            {post.image_url && (
              <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
            )}

            <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity onPress={toggleLike} style={styles.actionBtn}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.error : colors.textSecondary} />
                <Text style={[styles.actionCountText, { color: liked ? colors.error : colors.textSecondary }]}>
                  {likesCount}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionBtn}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.actionCountText, { color: colors.textSecondary }]}>{comments.length}</Text>
              </View>

              <TouchableOpacity onPress={() => {
                if (!user) return;
                if (saved) {
                  supabase.from('saved_posts').delete().eq('user_id', user.id).eq('post_id', post.id).then(() => setSaved(false));
                } else {
                  supabase.from('saved_posts').insert({ user_id: user.id, post_id: post.id }).then(() => setSaved(true));
                }
              }} style={styles.actionBtn}>
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? '#FFD700' : colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowShare(true)} style={styles.actionBtn}>
                <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View>
            {renderComment(item)}
            {item.replies?.map(r => renderComment(r, true))}
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>Hələ şərh yoxdur. İlk şərh yazan ol!</Text>
        }
      />

      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.inputWrapper}>
          {replyTo && (
            <View style={styles.replyIndicator}>
              <Text style={[styles.replyIndicatorText, { color: colors.primary }]}>
                {replyTo.profile?.full_name}'ə cavab
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          {!newComment.trim() && (
            <AICommentSuggestions
              postContent={post.content}
              postId={post.id}
              onSuggestionSelect={(s) => setNewComment(s)}
            />
          )}
          <View style={[styles.inputInner, { backgroundColor: colors.background }]}>
            <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Şərh yaz..."
              placeholderTextColor={colors.textMuted}
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
          </View>
        </View>
        <TouchableOpacity
          onPress={handleComment}
          style={[styles.sendBtn, { backgroundColor: newComment.trim() ? colors.primary : colors.textMuted + '40' }]}
          disabled={!newComment.trim()}
        >
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ReportModal visible={showReport} onClose={() => setShowReport(false)} contentType="post" contentId={post.id} />
      <Modal visible={showShare} transparent animationType="slide" onRequestClose={() => setShowShare(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowShare(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Paylaş</Text>

            <TouchableOpacity style={styles.sheetOption} onPress={() => { setShowShare(false); navigation.navigate('ConversationsList', { sharePost: post }); }}>
              <View style={[styles.sheetIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={[styles.sheetOptionTitle, { color: colors.text }]}>Dostlara göndər</Text>
                <Text style={[styles.sheetOptionDesc, { color: colors.textMuted }]}>Mesaj olaraq paylaş</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.sheetOption} onPress={async () => {
              setShowShare(false);
              try {
                const postUrl = `https://ticcer.app/p/${post.id}`;
                await Share.share({ message: `${post.content}\n\n🔗 ${postUrl}`, url: postUrl });
              } catch {}
            }}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: 16, paddingTop: 60 },
  backText: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  list: { paddingBottom: 120 },
  postCard: { margin: 16, borderRadius: 16, padding: 16, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerRowInner: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  postDeleteBtn: { padding: 4, marginLeft: 8 },
  postAvatar: { width: 44, height: 44, borderRadius: 22 },
  postAvatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  postAvatarLetter: { fontSize: 18, fontWeight: fonts.weights.bold },
  headerInfo: { marginLeft: 12, flex: 1 },
  postName: { fontWeight: fonts.weights.bold, fontSize: fonts.sizes.md },
  postHandle: { fontWeight: fonts.weights.semibold, fontSize: fonts.sizes.sm, marginTop: 1 },
  postTime: { fontSize: fonts.sizes.xs, marginTop: 2 },
  postContent: { fontSize: fonts.sizes.md, lineHeight: 22, marginBottom: 12 },
  postImage: { width: '100%', height: 250, borderRadius: 12, marginBottom: 12 },
  actionsRow: {
    flexDirection: 'row', borderTopWidth: 1, paddingTop: 8,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', paddingVertical: 8 },
  actionIcon: { fontSize: 18 },
  actionCountText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  comment: { flexDirection: 'row', padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 12 },
  replyComment: { marginLeft: 48 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentAvatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  commentAvatarLetter: { color: '#FFFFFF', fontSize: 14, fontWeight: fonts.weights.bold },
  commentBody: { marginLeft: 10, flex: 1 },
  commentName: { fontWeight: fonts.weights.semibold, fontSize: fonts.sizes.sm },
  commentText: { fontSize: fonts.sizes.sm, marginTop: 2 },
  replyBtn: { fontSize: fonts.sizes.xs, marginTop: 4, fontWeight: fonts.weights.semibold },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, fontWeight: '600' },
  reactionPicker: {
    flexDirection: 'row', gap: 4, marginTop: 8, padding: 8, borderRadius: 16,
    borderWidth: 1, alignSelf: 'flex-start',
  },
  reactionPickerBtn: { padding: 6, borderRadius: 8 },
  reactionPickerEmoji: { fontSize: 20 },
  deleteCommentBtn: { padding: 4 },
  empty: { textAlign: 'center', marginTop: 30, fontSize: fonts.sizes.md },
  inputRow: {
    flexDirection: 'row', padding: 8, paddingBottom: 70, borderTopWidth: 1, alignItems: 'flex-end', gap: 8,
  },
  inputWrapper: { flex: 1 },
  inputInner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingLeft: 12, paddingRight: 4,
  },
  inputIcon: { fontSize: 14, marginRight: 6 },
  input: {
    flex: 1, fontSize: fonts.sizes.md, paddingVertical: 10, paddingRight: 8, maxHeight: 80,
  },
  replyIndicator: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4, paddingBottom: 4,
  },
  replyIndicatorText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.semibold },
  replyCancel: { fontSize: fonts.sizes.md, marginLeft: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { fontSize: 18 },
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
