import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';

const HASHTAG_RE = /#(\w+)/g;
const MENTION_RE = /@(\w+)/g;

export default function CreatePostScreen({ navigation }: any) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  }

  async function uploadImage(uri: string) {
    const compressed = await ImageManipulator.manipulateAsync(
      uri, [{ resize: { width: 800 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    const ext = 'jpg';
    const fileName = `${user!.id}_${Date.now()}.${ext}`;
    const response = await fetch(compressed.uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from('post-images').upload(fileName, blob, { contentType: 'image/jpeg' });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  async function processHashtags(postId: string) {
    const tags = [...content.matchAll(HASHTAG_RE)].map(m => m[1].toLowerCase());
    if (tags.length === 0) return;
    for (const tag of tags) {
      const { data: existing } = await supabase
        .from('hashtags')
        .select('id')
        .eq('tag', tag)
        .single();
      let hashtagId: string;
      if (existing) {
        hashtagId = existing.id;
      } else {
        const { data: inserted } = await supabase
          .from('hashtags')
          .insert({ tag })
          .select('id')
          .single();
        if (!inserted) continue;
        hashtagId = inserted.id;
      }
      await supabase.from('post_hashtags').insert({
        post_id: postId,
        hashtag_id: hashtagId,
      });
    }
  }

  async function processMentions(postId: string) {
    const usernames = [...content.matchAll(MENTION_RE)].map(m => m[1].toLowerCase());
    if (usernames.length === 0) return;
    const uniqueUsernames = [...new Set(usernames)];
    for (const username of uniqueUsernames) {
      const { data: mentionedUser } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .single();
      if (mentionedUser) {
        await supabase.from('mentions').insert({
          post_id: postId,
          user_id: mentionedUser.id,
        });
      }
    }
  }

  async function handlePost() {
    if (!content.trim() && !image) return Alert.alert('Xəta', 'Mətn və ya şəkil əlavə edin');
    setUploading(true);
    try {
      let imageUrl: string | null = null;
      if (image) imageUrl = await uploadImage(image);

      const { data: post, error } = await supabase.from('posts').insert({
        user_id: user!.id,
        content: content.trim() || '(şəkil)',
        image_url: imageUrl,
      }).select('id').single();
      if (error) throw error;

      await processHashtags(post.id);
      await processMentions(post.id);

      Alert.alert('Post atıldı!');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Xəta', err.message || 'Göndərilə bilmədi');
    } finally {
      setUploading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.cancel}>Ləğv et</Text></TouchableOpacity>
        <Text style={styles.title}>Yeni Post</Text>
        <TouchableOpacity style={[styles.postBtn, (!content.trim() && !image) && styles.postBtnDisabled]} onPress={handlePost} disabled={uploading || (!content.trim() && !image)}>
          {uploading ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.postText}>Paylaş</Text>}
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nə düşünürsən?"
        placeholderTextColor={colors.textMuted}
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={500}
      />

      {image && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: image }} style={styles.image} />
          <TouchableOpacity onPress={() => setImage(null)} style={styles.removeImage}>
            <Ionicons name="close-outline" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={pickImage} style={styles.addImageBtn}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name="camera-outline" size={16} color={colors.primary} /><Text style={styles.addImageText}> Şəkil əlavə et</Text></View>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  cancel: { color: colors.textMuted, fontSize: fonts.sizes.md },
  title: { color: colors.text, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.lg },
  postBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20 },
  postBtnDisabled: { opacity: 0.5 },
  postText: { color: colors.white, fontWeight: fonts.weights.semibold },
  input: { color: colors.text, fontSize: fonts.sizes.md, padding: 16, minHeight: 120, textAlignVertical: 'top', lineHeight: 22 },
  imagePreview: { marginHorizontal: 16, marginBottom: 12 },
  image: { width: '100%', height: 200, borderRadius: 12 },
  removeImage: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.overlay, borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  removeImageText: { color: colors.white, fontSize: 16, fontWeight: fonts.weights.bold },
  addImageBtn: { marginHorizontal: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center' },
  addImageText: { color: colors.primary, fontSize: fonts.sizes.md },
});
