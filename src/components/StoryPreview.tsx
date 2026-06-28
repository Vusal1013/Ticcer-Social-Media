import { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { fonts } from '../constants/theme';
import { getRelativeTime } from '../lib/time';

type StoryUser = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  stories: any[];
  allViewed: boolean;
};

type Props = {
  onPress: (stories: any[], index: number) => void;
};

export default function StoryPreview({ onPress }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);

  async function fetchStories() {
    let followingIds: string[] = [];
    if (user) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      followingIds = (follows || []).map(f => f.following_id);
    }

    const { data } = await supabase
      .from('stories')
      .select('*, profile:profiles(*)')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (!data) return;

    const filtered = user
      ? data.filter((s: any) => s.user_id === user.id || followingIds.includes(s.user_id))
      : data;

    const storyIds = data.map((s: any) => s.id);
    let viewedIds = new Set<string>();
    if (user && storyIds.length > 0) {
      const { data: views } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('user_id', user.id)
        .in('story_id', storyIds);
      if (views) views.forEach(v => viewedIds.add(v.story_id));
    }

    const grouped = filtered.reduce<Record<string, StoryUser>>((acc, s: any) => {
      if (!acc[s.user_id]) {
        acc[s.user_id] = {
          user_id: s.user_id,
          username: s.profile?.username || '',
          avatar_url: s.profile?.avatar_url || null,
          stories: [],
          allViewed: true,
        };
      }
      acc[s.user_id].stories.push(s);
      return acc;
    }, {});

    Object.values(grouped).forEach(u => {
      u.allViewed = u.stories.every(s => viewedIds.has(s.id));
    });

    const sorted = Object.values(grouped).sort((a, b) => {
      if (a.user_id === user?.id) return -1;
      if (b.user_id === user?.id) return 1;
      return 0;
    });

    setStoryUsers(sorted);
  }

  useEffect(() => {
    fetchStories();
    const interval = setInterval(fetchStories, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {storyUsers.map((storyUser, index) => {
          const latestStory = storyUser.stories[0];
          return (
            <TouchableOpacity
              key={storyUser.user_id}
              onPress={() => onPress(storyUser.stories, 0)}
              style={styles.item}
            >
              <View style={[styles.avatarRing, { borderColor: storyUser.allViewed ? colors.textMuted : colors.primary }, storyUser.user_id === user?.id && { borderColor: colors.success }]}>
                {storyUser.avatar_url ? (
                  <Image source={{ uri: storyUser.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarLetter}>{storyUser.username[0]?.toUpperCase() || '?'}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                {storyUser.user_id === user?.id ? 'Sənin' : storyUser.username}
              </Text>
              {latestStory && (
                <Text style={[styles.time, { color: colors.textMuted }]}>
                  {getRelativeTime(latestStory.created_at)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  scroll: { paddingHorizontal: 16, gap: 16, paddingVertical: 8 },
  item: { alignItems: 'center', width: 68 },
  avatarRing: { width: 64, height: 64, borderRadius: 32, padding: 3, borderWidth: 3 },
  avatar: { width: '100%', height: '100%', borderRadius: 29 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 20, fontWeight: fonts.weights.bold },
  username: { fontSize: fonts.sizes.xs, marginTop: 4, maxWidth: 68 },
  time: { fontSize: 9, marginTop: 1 },
});