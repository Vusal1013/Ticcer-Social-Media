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
  full_name: string;
  avatar_url: string | null;
  stories: any[];
  allViewed: boolean;
  live?: {
    id: string;
    room_name: string;
    title: string | null;
    viewer_count: number;
  } | null;
};

type Props = {
  onPress: (stories: any[], index: number) => void;
  onLivePress?: (live: any, broadcaster: any) => void;
};

export default function StoryPreview({ onPress, onLivePress }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [liveUsers, setLiveUsers] = useState<StoryUser[]>([]);

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
          full_name: s.profile?.full_name || '',
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

  async function fetchLives() {
    const { data } = await supabase
      .from('lives')
      .select('*, profile:profiles(*)')
      .eq('status', 'live')
      .order('started_at', { ascending: false });

    if (!data) { setLiveUsers([]); return; }

    const grouped = data.reduce<Record<string, StoryUser>>((acc, l: any) => {
      if (!acc[l.user_id]) {
        acc[l.user_id] = {
          user_id: l.user_id,
          username: l.profile?.username || '',
          full_name: l.profile?.full_name || '',
          avatar_url: l.profile?.avatar_url || null,
          stories: [],
          allViewed: true,
          live: {
            id: l.id,
            room_name: l.room_name,
            title: l.title,
            viewer_count: l.viewer_count || 0,
          },
        };
      }
      return acc;
    }, {});

    setLiveUsers(Object.values(grouped));
  }

  useEffect(() => {
    fetchStories();
    fetchLives();

    const channel = supabase.channel('lives_realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'lives',
      }, () => {
        fetchLives();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchStories();
      fetchLives();
    }, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const allUsers = [...liveUsers, ...storyUsers.filter(
    su => !liveUsers.find(lu => lu.user_id === su.user_id)
  )];

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {allUsers.map((storyUser, index) => {
          const isLive = !!storyUser.live;
          const latestStory = storyUser.stories[0];
          return (
            <TouchableOpacity
              key={storyUser.user_id}
              onPress={() => {
                if (isLive && onLivePress) {
                  onLivePress(storyUser.live, {
                    id: storyUser.user_id,
                    username: storyUser.username,
                    full_name: storyUser.full_name,
                    avatar_url: storyUser.avatar_url,
                  });
                } else if (storyUser.stories.length > 0) {
                  onPress(storyUser.stories, 0);
                }
              }}
              style={styles.item}
            >
              <View style={[styles.avatarRing, {
                borderColor: isLive ? '#FF4444' : storyUser.allViewed ? colors.textMuted : colors.primary,
              }, storyUser.user_id === user?.id && !isLive && { borderColor: colors.success }]}>
                {storyUser.avatar_url ? (
                  <Image source={{ uri: storyUser.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarLetter}>{storyUser.username[0]?.toUpperCase() || '?'}</Text>
                  </View>
                )}
                {isLive && (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>Canli</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                {storyUser.user_id === user?.id ? 'Sənin' : storyUser.username}
              </Text>
              {isLive && storyUser.live?.title ? (
                <Text style={[styles.time, { color: '#FF4444' }]} numberOfLines={1}>
                  {storyUser.live.title}
                </Text>
              ) : latestStory ? (
                <Text style={[styles.time, { color: colors.textMuted }]}>
                  {getRelativeTime(latestStory.created_at)}
                </Text>
              ) : null}
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
  item: { alignItems: 'center', width: 72 },
  avatarRing: { width: 64, height: 64, borderRadius: 32, padding: 3, borderWidth: 3, position: 'relative' },
  avatar: { width: '100%', height: '100%', borderRadius: 29 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 20, fontWeight: fonts.weights.bold },
  liveBadge: {
    position: 'absolute', bottom: -4, alignSelf: 'center',
    backgroundColor: '#FF4444', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  liveBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '700' },
  username: { fontSize: fonts.sizes.xs, marginTop: 4, maxWidth: 72 },
  time: { fontSize: 9, marginTop: 1, maxWidth: 72 },
});
