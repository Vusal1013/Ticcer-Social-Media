import { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, StyleSheet, Animated } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEventListener } from 'expo';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  stories: any[];
  initialIndex?: number;
  onClose: () => void;
};

const STORY_DURATION = 5000;

export default function StoryViewer({ stories, initialIndex = 0, onClose }: Props) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStory = stories[currentIndex];
  const isVideo = currentStory?.type === 'video';

  const player = useVideoPlayer(isVideo ? currentStory.media_url : null, p => {
    p.loop = false;
  });

  useEffect(() => {
    if (user) {
      supabase.from('story_views').insert({
        user_id: user.id,
        story_id: currentStory?.id,
      }).then();
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!isVideo) startTimer();
    return () => clearTimer();
  }, [currentIndex]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    progressAnim.setValue(0);
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start();

    timerRef.current = setTimeout(() => {
      goNext();
    }, STORY_DURATION);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      onClose();
    }
  }, [currentIndex]);

  useEventListener(player, 'playToEnd', goNext);

  const handleTap = (evt: any) => {
    const x = evt.nativeEvent.locationX;
    if (x < SCREEN_WIDTH / 3) goPrev();
    else if (x > (SCREEN_WIDTH / 3) * 2) goNext();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={1} onPress={handleTap} style={styles.touchArea}>
        {currentStory?.type === 'video' ? (
          <VideoView
            player={player}
            style={styles.media}
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <Image source={{ uri: currentStory?.media_url }} style={styles.media} />
        )}

        <View style={styles.topBar}>
          {stories.map((_, i) => (
            <View key={i} style={[styles.progressTrack, i > 0 && { marginLeft: 4 }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  i < currentIndex && { flex: 1 },
                  i === currentIndex && { flex: progressAnim.interpolate({
                    inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp',
                  })},
                  i > currentIndex && { flex: 0 },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.bottomInfo}>
          <Text style={styles.username}>{currentStory?.profile?.username || ''}</Text>
        </View>
      </TouchableOpacity>

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
  closeBtn: {
    position: 'absolute', top: 50, right: 16, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: colors.white, fontSize: 18, fontWeight: fonts.weights.bold },
});
