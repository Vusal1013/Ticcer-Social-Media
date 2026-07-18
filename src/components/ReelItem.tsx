import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, Pressable, Share, Image } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import ReportModal from './ReportModal';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/theme';
import type { Reel } from '../types';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const HASHTAG_RE = /#(\w+)/g;

type Props = {
  reel: Reel;
  isActive: boolean;
};

export default function ReelItem({ reel, isActive }: Props) {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes_count ?? 0);
  const [saved, setSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const player = useVideoPlayer(reel.video_url, p => {
    p.loop = true;
  });

  useEffect(() => {
    if (isActive) {
      player.play();
      supabase.from('reel_views').insert({ user_id: user?.id, reel_id: reel.id }).then();
    } else {
      player.pause();
    }
    return () => { player.pause(); };
  }, [isActive]);

  useEffect(() => {
    if (!user) return;
    supabase.from('reel_likes').select('id').eq('user_id', user.id).eq('reel_id', reel.id).single()
      .then(({ data }) => setLiked(!!data));
    supabase.from('saved_reels').select('id').eq('user_id', user.id).eq('reel_id', reel.id).single()
      .then(({ data }) => setSaved(!!data));
    if (reel.user_id !== user.id) {
      supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', reel.user_id).single()
        .then(({ data }) => setIsFollowing(!!data));
    }
  }, []);

  async function toggleLike() {
    if (!user) return;
    if (liked) {
      await supabase.from('reel_likes').delete().eq('user_id', user.id).eq('reel_id', reel.id);
      setLiked(false);
      setLikesCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase.from('reel_likes').insert({ user_id: user.id, reel_id: reel.id });
      setLiked(true);
      setLikesCount(prev => prev + 1);
    }
  }

  async function toggleSave() {
    if (!user) return;
    if (saved) {
      await supabase.from('saved_reels').delete().eq('user_id', user.id).eq('reel_id', reel.id);
      setSaved(false);
    } else {
      await supabase.from('saved_reels').insert({ user_id: user.id, reel_id: reel.id });
      setSaved(true);
    }
  }

  async function toggleFollow() {
    if (!user || reel.user_id === user.id) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', reel.user_id);
      setIsFollowing(false);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: reel.user_id });
      setIsFollowing(true);
    }
  }

  function handleShareToFriends() {
    setShowShare(false);
    navigation.navigate('ConversationsList', { shareReel: reel });
  }

  async function handleShareToApps() {
    setShowShare(false);
    try {
      const reelUrl = `https://ticcer.app/r/${reel.id}`;
      await Share.share({ message: `${reel.description || 'Reel'}\n\n🔗 ${reelUrl}`, url: reelUrl });
    } catch {}
  }

  function renderDescription(text: string) {
    const parts: { text: string; isHash: boolean }[] = [];    
    let lastIndex = 0;
    const regex = new RegExp(HASHTAG_RE, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isHash: false });
      }
      parts.push({ text: `#${match[1]}`, isHash: true });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isHash: false });
    }
    return parts;
  }

  const formatCount = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return String(n);
  };

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
        locations={[0.4, 1]}
        style={styles.scrim}
        pointerEvents="none"
      />

      <View style={styles.overlay}>
        <View style={styles.bottomSection}>
          {reel.profile && (
            <View style={styles.userRow}>
              <View style={styles.avatarContainer}>
                {reel.profile.avatar_url ? (
                  <Image source={{ uri: reel.profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarLetter}>
                      {(reel.profile.full_name || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.username}>@{reel.profile.username}</Text>
              {reel.user_id !== user?.id && (
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.followingBtn]}
                  onPress={toggleFollow}
                >
                  <Text style={[styles.followText, isFollowing && styles.followingText]}>
                    {isFollowing ? 'İzlənir' : 'İzlə'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {reel.description ? (
            <Text style={styles.desc} numberOfLines={2}>
              {renderDescription(reel.description).map((part, i) =>
                part.isHash ? (
                  <Text key={i} style={styles.hashTag}> {part.text}</Text>
                ) : (
                  <Text key={i}>{part.text}</Text>
                )
              )}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={toggleLike} style={styles.actionBtn} activeOpacity={0.7}>
            <View style={styles.actionCircle}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionText}>{formatCount(likesCount)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleSave} style={styles.actionBtn} activeOpacity={0.7}>
            <View style={styles.actionCircle}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowShare(true)} style={styles.actionBtn} activeOpacity={0.7}>
            <View style={styles.actionCircle}>
              <Ionicons name="paper-plane-outline" size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowReport(true)} style={styles.actionBtn} activeOpacity={0.7}>
            <View style={styles.actionCircle}>
              <Ionicons name="flag-outline" size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showShare} transparent animationType="slide" onRequestClose={() => setShowShare(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowShare(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Paylaş</Text>

            <TouchableOpacity style={styles.sheetOption} onPress={handleShareToFriends}>
              <View style={[styles.sheetIcon, { backgroundColor: '#6C63FF20' }]}>
                <Ionicons name="chatbubble-outline" size={22} color="#6C63FF" />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={styles.sheetOptionTitle}>Dostlara göndər</Text>
                <Text style={styles.sheetOptionDesc}>Mesaj olaraq paylaş</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            <TouchableOpacity style={styles.sheetOption} onPress={handleShareToApps}>
              <View style={[styles.sheetIcon, { backgroundColor: '#FF658420' }]}>
                <Ionicons name="share-outline" size={22} color="#FF6584" />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={styles.sheetOptionTitle}>Digər proqramlara göndər</Text>
                <Text style={styles.sheetOptionDesc}>WhatsApp, Telegram və s.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setShowShare(false)}>
              <Text style={styles.sheetCancelText}>Ləğv et</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <ReportModal visible={showReport} onClose={() => setShowReport(false)} contentType="reel" contentId={reel.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: WINDOW_HEIGHT, position: 'relative' },
  video: { ...StyleSheet.absoluteFill },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: WINDOW_HEIGHT * 0.5 },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    paddingBottom: 120,
    paddingHorizontal: 16,
  },
  bottomSection: { marginBottom: 24 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarContainer: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#6C63FF' },
  avatarLetter: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  username: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  followingBtn: { backgroundColor: 'transparent' },
  followText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  followingText: { color: '#FFFFFF' },
  desc: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  hashTag: { color: '#ddb7ff', fontWeight: '600' },
  actions: { position: 'absolute', right: 12, bottom: 160, alignItems: 'center', gap: 16 },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, backgroundColor: '#0b1326' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16, backgroundColor: '#6B6B8A' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 20 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  sheetIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetOptionText: { marginLeft: 14, flex: 1 },
  sheetOptionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  sheetOptionDesc: { fontSize: 14, marginTop: 2, color: '#6B6B8A' },
  sheetDivider: { height: 1, backgroundColor: '#6B6B8A30' },
  sheetCancelBtn: { marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: '#6B6B8A30', paddingVertical: 14, alignItems: 'center' },
  sheetCancelText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
