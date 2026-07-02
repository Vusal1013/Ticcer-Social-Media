import { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import ReelItem from '../../components/ReelItem';
import { colors, fonts } from '../../constants/theme';
import type { Reel } from '../../types';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

export default function ReelsScreen({ navigation, route }: any) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [focused, setFocused] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  async function fetchReels() {
    const { data } = await supabase
      .from('reels')
      .select(`*, profile:profiles(*), likes:reel_likes(count)`)
      .order('created_at', { ascending: false });

    if (data) {
      setReels(data.map((r: any) => ({
        ...r,
        likes_count: r.likes?.[0]?.count ?? 0,
      })));
    }
    setLoading(false);
  }

  useEffect(() => { fetchReels(); }, []);

  useEffect(() => {
    const reelId = route?.params?.reelId;
    if (reelId && reels.length > 0) {
      const idx = reels.findIndex(r => r.id === reelId);
      if (idx >= 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: idx, animated: true });
        }, 300);
      }
    }
  }, [reels, route?.params?.reelId]);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  const renderReel = useCallback(({ item, index }: { item: Reel; index: number }) => (
    <ReelItem reel={item} isActive={index === activeIndex && focused} />
  ), [activeIndex, focused]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Reels</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateReel')} style={styles.createBtn}>
          <Text style={styles.createText}>+</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={reels}
          renderItem={renderReel}
          keyExtractor={item => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Hələ reel yoxdur</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
  },
  logo: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold, color: colors.white },
  createBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  createText: { color: colors.white, fontSize: 24, fontWeight: fonts.weights.bold, marginTop: -2 },
  empty: { height: WINDOW_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: fonts.sizes.md },
});
