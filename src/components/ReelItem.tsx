import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../constants/theme';
import type { Reel } from '../types';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

type Props = {
  reel: Reel;
  isActive: boolean;
  onLike?: () => void;
};

export default function ReelItem({ reel, isActive }: Props) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes_count ?? 0);

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
        </View>
      </View>
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
});
