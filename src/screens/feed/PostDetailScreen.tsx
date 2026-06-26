import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Alert, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import PostCard from '../../components/PostCard';
import { colors, fonts } from '../../constants/theme';
import type { Post } from '../../types';

export default function PostDetailScreen({ route, navigation }: any) {
  const { post: initialPost } = route.params;
  const { user } = useAuth();
  const [post, setPost] = useState<Post>(initialPost);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  async function fetchComments() {
    const { data } = await supabase
      .from('post_comments')
      .select('*, profile:profiles(*)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
  }

  useEffect(() => { fetchComments(); }, []);

  async function handleComment() {
    if (!newComment.trim()) return;
    const { error } = await supabase.from('post_comments').insert({
      user_id: user!.id,
      post_id: post.id,
      content: newComment.trim(),
    });
    if (error) return Alert.alert('Xəta', error.message);
    setNewComment('');
    fetchComments();
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={StyleSheet.absoluteFill} />
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>← Geri</Text>
      </TouchableOpacity>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        ListHeaderComponent={<PostCard post={post} onPress={() => {}} />}
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarLetter}>{(item.profile?.full_name || '?')[0]}</Text>
            </View>
            <View style={styles.commentBody}>
              <Text style={styles.commentName}>{item.profile?.full_name}</Text>
              <Text style={styles.commentText}>{item.content}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Hələ şərh yoxdur</Text>}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Şərh yaz..."
          placeholderTextColor={colors.textMuted}
          value={newComment}
          onChangeText={setNewComment}
        />
        <TouchableOpacity onPress={handleComment} style={styles.sendBtn}>
          <Text style={styles.sendText}>Göndər</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: 16, paddingTop: 60 },
  backText: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  list: { paddingBottom: 80 },
  comment: { flexDirection: 'row', padding: 12, marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.white, fontSize: 14, fontWeight: fonts.weights.bold },
  commentBody: { marginLeft: 10, flex: 1 },
  commentName: { color: colors.text, fontWeight: fonts.weights.semibold, fontSize: fonts.sizes.sm },
  commentText: { color: colors.textSecondary, fontSize: fonts.sizes.sm, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 30 },
  inputRow: {
    flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  input: {
    flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    color: colors.text, marginRight: 8,
  },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: colors.white, fontWeight: fonts.weights.semibold },
});
