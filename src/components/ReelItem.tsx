import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, Modal, Pressable, Share } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import ReportModal from './ReportModal';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../constants/theme';
import type { Reel } from '../types';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

type Props = {
  reel: Reel;
  isActive: boolean;
};

export default function ReelItem({ reel, isActive }: Props) {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes_count ?? 0);
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

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      <View style={styles.overlay}>
        <View style={styles.bottomSection}>
          <Text style={styles.username}>@{reel.profile?.username}</Text>
          {reel.description ? <Text style={styles.desc}>{reel.description}</Text> : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={toggleLike} style={styles.actionBtn}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>{likesCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowShare(true)} style={styles.actionBtn}>
            <Ionicons name="paper-plane-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowReport(true)} style={styles.actionBtn}>
            <Ionicons name="flag-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showShare} transparent animationType="slide" onRequestClose={() => setShowShare(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowShare(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.sheetTitle, { color: colors.white }]}>Paylaş</Text>

            <TouchableOpacity style={styles.sheetOption} onPress={handleShareToFriends}>
              <View style={[styles.sheetIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={[styles.sheetOptionTitle, { color: colors.white }]}>Dostlara göndər</Text>
                <Text style={[styles.sheetOptionDesc, { color: colors.textMuted }]}>Mesaj olaraq paylaş</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.sheetDivider, { backgroundColor: colors.textMuted + '30' }]} />

            <TouchableOpacity style={styles.sheetOption} onPress={handleShareToApps}>
              <View style={[styles.sheetIcon, { backgroundColor: colors.secondary + '20' }]}>
                <Ionicons name="share-outline" size={22} color={colors.secondary} />
              </View>
              <View style={styles.sheetOptionText}>
                <Text style={[styles.sheetOptionTitle, { color: colors.white }]}>Digər proqramlara göndər</Text>
                <Text style={[styles.sheetOptionDesc, { color: colors.textMuted }]}>WhatsApp, Telegram və s.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sheetCancelBtn, { borderColor: colors.textMuted + '30' }]} onPress={() => setShowShare(false)}>
              <Text style={[styles.sheetCancelText, { color: colors.white }]}>Ləğv et</Text>
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
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    paddingBottom: 100,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  bottomSection: { marginBottom: 20 },
  username: { color: colors.white, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.md },
  desc: { color: colors.white, fontSize: fonts.sizes.sm, marginTop: 4, lineHeight: 18 },
  actions: { position: 'absolute', right: 12, bottom: 140, alignItems: 'center', gap: 8 },
  actionBtn: { alignItems: 'center' },
  actionIcon: { fontSize: 28 },
  actionText: { color: colors.white, fontSize: fonts.sizes.xs, fontWeight: fonts.weights.medium },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, marginBottom: 20 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  sheetIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetOptionText: { marginLeft: 14, flex: 1 },
  sheetOptionTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  sheetOptionDesc: { fontSize: fonts.sizes.sm, marginTop: 2 },
  sheetDivider: { height: 1 },
  sheetCancelBtn: { marginTop: 16, borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  sheetCancelText: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
});
