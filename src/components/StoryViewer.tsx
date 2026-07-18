import { useRef, useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../constants/theme';
import { getRelativeTime } from '../lib/time';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  stories: any[];
  initialIndex?: number;
  onClose: () => void;
};

export default function StoryViewer({ stories, initialIndex = 0, onClose }: Props) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState<any[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStory = stories[currentIndex];
  const isOwner = user?.id === currentStory?.user_id;

  useEffect(() => {
    if (user && currentStory?.id) {
      supabase.from('story_views').insert({
        user_id: user.id,
        story_id: currentStory.id,
      }).then();
    }
  }, [currentIndex]);

  useEffect(() => {
    if (currentStory?.id && isOwner) {
      supabase
        .from('story_views')
        .select('user_id, profile:profiles!inner(username)')
        .eq('story_id', currentStory.id)
        .neq('user_id', user!.id)
        .then(({ data }) => {
          if (data) setViewers(data);
        });
    } else {
      setViewers([]);
    }
  }, [currentIndex]);

  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / 5000, 1);
      setProgress(pct);
      if (pct >= 1) {
        clearInterval(timerRef.current!);
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          onClose();
        }
      }
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex]);

  const handleTap = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < SCREEN_WIDTH / 3) {
      if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
      else onClose();
    } else if (x > (SCREEN_WIDTH / 3) * 2) {
      if (currentIndex < stories.length - 1) setCurrentIndex(prev => prev + 1);
      else onClose();
    }
  };

  const showViewers = () => {
    if (viewers.length === 0) return;
    const names = viewers.map((v: any) => `@${v.profile?.username || '?'}`).join('\n');
    Alert.alert('Baxanlar', names);
  };

  function handleDeleteStory() {
    Alert.alert('Story silinsin?', 'Bu story silinəcək. Davam edək?', [
      { text: 'Ləğv et', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            const { error } = await supabase.from('stories').delete().eq('id', currentStory.id);
            if (error) throw error;
            if (stories.length <= 1) {
              onClose();
            } else if (currentIndex >= stories.length - 1) {
              setCurrentIndex(prev => prev - 1);
            }
          } catch (err: any) {
            Alert.alert('Xəta', err.message || 'Silinə bilmədi');
          }
        }
      },
    ]);
  }

  if (!currentStory) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={1} onPress={handleTap} style={styles.touchArea}>
        <Image source={{ uri: currentStory.media_url }} style={styles.media} />

        <View style={styles.topBar}>
          {stories.map((_, i) => (
            <View key={i} style={[styles.progressTrack, i > 0 && { marginLeft: 4 }]}>
              <View
                style={[
                  styles.progressFill,
                  i < currentIndex && { flex: 1 },
                  i === currentIndex && { flex: progress },
                  i > currentIndex && { flex: 0 },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.bottomInfo}>
          <Text style={styles.username}>{currentStory.profile?.username || ''}</Text>
          <Text style={styles.time}>{getRelativeTime(currentStory.created_at)}</Text>
        </View>
      </TouchableOpacity>

      {isOwner && viewers.length > 0 && (
        <TouchableOpacity onPress={showViewers} style={styles.viewerBadge}>
          <Ionicons name="eye-outline" size={14} color={colors.white} />
          <Text style={styles.viewerText}>{viewers.length}</Text>
        </TouchableOpacity>
      )}

      {isOwner && (
        <TouchableOpacity onPress={handleDeleteStory} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color="#ffb4ab" />
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Ionicons name="close-outline" size={18} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  touchArea: { flex: 1, justifyContent: 'center' },
  media: { position: 'absolute', top: 0, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  topBar: {
    position: 'absolute', top: 50, left: 12, right: 12,
    flexDirection: 'row',
  },
  progressTrack: {
    flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { backgroundColor: colors.white, borderRadius: 2 },
  bottomInfo: {
    position: 'absolute', bottom: 60, left: 16,
  },
  username: { color: colors.white, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.md },
  time: { color: 'rgba(255,255,255,0.5)', fontSize: fonts.sizes.xs, marginTop: 2 },
  closeBtn: {
    position: 'absolute', top: 50, right: 16, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  viewerBadge: {
    position: 'absolute', bottom: 100, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  viewerText: { color: colors.white, fontSize: fonts.sizes.sm, fontWeight: '600' },
  deleteBtn: {
    position: 'absolute', bottom: 100, right: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
});