import { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { fonts } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type StoryUser = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  stories: any[];
};

type Props = {
  onPress: (stories: any[], index: number) => void;
};

export default function StoryPreview({ onPress }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);

  async function fetchStories() {
    const { data } = await supabase
      .from('stories')
      .select('*, profile:profiles(*)')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      const grouped = data.reduce<Record<string, StoryUser>>((acc, s: any) => {
        if (!acc[s.user_id]) {
          acc[s.user_id] = {
            user_id: s.user_id,
            username: s.profile?.username || '',
            avatar_url: s.profile?.avatar_url || null,
            stories: [],
          };
        }
        acc[s.user_id].stories.push(s);
        return acc;
      }, {});

      const sorted = Object.values(grouped).sort((a, b) => {
        if (a.user_id === user?.id) return -1;
        if (b.user_id === user?.id) return 1;
        return 0;
      });

      setStoryUsers(sorted);
    }
  }

  useEffect(() => {
    fetchStories();
    const interval = setInterval(fetchStories, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {storyUsers.map((storyUser, index) => (
          <TouchableOpacity
            key={storyUser.user_id}
            onPress={() => onPress(storyUser.stories, index)}
            style={styles.item}
          >
            <View style={[styles.avatarRing, { borderColor: colors.primary }, storyUser.user_id === user?.id && { borderColor: colors.success }]}>
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
          </TouchableOpacity>
        ))}
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
});
