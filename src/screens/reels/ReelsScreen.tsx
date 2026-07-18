import { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import ReelItem from '../../components/ReelItem';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/theme';
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
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']}
        style={styles.headerScrim}
        pointerEvents="none"
      />
      <View style={styles.header}>
        <Ionicons name="apps" size={24} color="#ddb7ff" />
        <Text style={styles.logo}>Reels</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateReel')} activeOpacity={0.7}>
          <Ionicons name="add-circle" size={28} color="#ddb7ff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#6C63FF" style={{ flex: 1 }} />
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
              <View style={styles.emptyIcon}>
                <Ionicons name="videocam-off-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Hələ reel yoxdur</Text>
              <Text style={styles.emptyDesc}>Yeni reellər tezliklə burada görünəcək.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 100, zIndex: 10,
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 11,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
  },
  logo: {
    fontSize: 32, fontWeight: '700', color: '#FFFFFF',
    letterSpacing: -0.02,
  },
  empty: { height: WINDOW_HEIGHT, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(45, 52, 73, 0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 22, fontWeight: '600', color: '#dae2fd', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
});
