import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import type { Profile } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_SPACING = 4;
const GRID_COLS = 3;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - GRID_SPACING * (GRID_COLS + 1)) / GRID_COLS;

export default function SearchScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const initialHashtag = route?.params?.hashtag || '';
  const initialSearchUser = route?.params?.searchUser || '';
  const [query, setQuery] = useState(initialHashtag || initialSearchUser || '');
  const [results, setResults] = useState<Profile[]>([]);
  const [hashtagResults, setHashtagResults] = useState<any[]>([]);
  const [communityResults, setCommunityResults] = useState<any[]>([]);
  const [explorePosts, setExplorePosts] = useState<any[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [searching, setSearching] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'users' | 'hashtags' | 'communities'>(initialHashtag ? 'hashtags' : 'users');

  const isSearching = query.trim().length > 0;

  async function fetchFollowingIds() {
    if (!user) return new Set<string>();
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    return new Set((data || []).map((f: any) => f.following_id));
  }

  async function fetchJoinedCommunityIds() {
    if (!user) return;
    const { data } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id);
    setJoinedCommunityIds(new Set((data || []).map((m: any) => m.community_id)));
  }

  async function fetchExplorePosts() {
    if (!user) return;
    setLoadingExplore(true);
    const followingSet = await fetchFollowingIds();
    setFollowingIds(followingSet);

    const { data: savedData } = await supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', user.id);
    const savedSet = new Set((savedData || []).map((s: any) => s.post_id));

    const { data } = await supabase
      .from('posts')
      .select(`*, profile:profiles(*), likes:post_likes(count), comments:post_comments(count)`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const otherPosts = data
        .filter((p: any) => !followingSet.has(p.user_id) && p.user_id !== user.id)
        .map((p: any) => ({
          ...p,
          likes_count: p.likes?.[0]?.count ?? 0,
          comments_count: p.comments?.[0]?.count ?? 0,
          is_saved: savedSet.has(p.id),
        }));
      setExplorePosts(otherPosts);
    }
    setLoadingExplore(false);
  }

  useFocusEffect(useCallback(() => {
    fetchJoinedCommunityIds();
    fetchExplorePosts();
  }, []));

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHashtagResults([]);
      setCommunityResults([]);
      fetchExplorePosts();
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);

      if (mode === 'hashtags') {
        const tag = query.replace('#', '').toLowerCase();
        const { data: posts } = await supabase
          .from('post_hashtags')
          .select('post_id, hashtags!inner(tag)')
          .eq('hashtags.tag', tag);
        if (posts) {
          const postIds = posts.map((p: any) => p.post_id);
          const { data: postsData } = await supabase
            .from('posts')
            .select('*, profile:profiles(*)')
            .in('id', postIds)
            .order('created_at', { ascending: false })
            .limit(20);
          setHashtagResults(postsData || []);
        }
        setResults([]);
        setCommunityResults([]);
      } else if (mode === 'communities') {
        const { data } = await supabase
          .from('communities')
          .select('*')
          .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(20);
        if (data) setCommunityResults(data);
        setResults([]);
        setHashtagResults([]);
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .limit(20);
        if (data) setResults(data);
        setHashtagResults([]);
        setCommunityResults([]);
      }

      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, mode]);

  async function handleFollow(targetId: string) {
    await supabase.from('follows').insert({ follower_id: user!.id, following_id: targetId });
    setFollowingIds((prev) => new Set([...prev, targetId]));
  }

  async function handleUnfollow(targetId: string) {
    await supabase.from('follows').delete().eq('follower_id', user!.id).eq('following_id', targetId);
    setFollowingIds((prev) => { const s = new Set(prev); s.delete(targetId); return s; });
  }

  function handleExplorePostPress(post: any) {
    navigation.navigate('FeedTab', { screen: 'PostDetail', params: { post, source: 'SearchTab' } });
  }

  function renderExploreItem({ item }: { item: any }) {
    const hasImage = !!item.image_url;
    return (
      <TouchableOpacity
        onPress={() => handleExplorePostPress(item)}
        activeOpacity={0.85}
        style={styles.exploreItem}
      >
        {hasImage ? (
          <Image source={{ uri: item.image_url }} style={styles.exploreImage} />
        ) : (
          <View style={[styles.exploreNoImage, { backgroundColor: 'rgba(30,41,59,0.8)' }]}>
            <View style={styles.exploreNoImageHeader}>
              {item.profile?.avatar_url ? (
                <Image source={{ uri: item.profile.avatar_url }} style={styles.exploreMiniAvatar} />
              ) : (
                <View style={[styles.exploreMiniAvatar, styles.exploreMiniAvatarPlaceholder]}>
                  <Text style={styles.exploreMiniAvatarLetter}>
                    {(item.profile?.full_name || '?')[0]}
                  </Text>
                </View>
              )}
              <Text style={styles.exploreUsername} numberOfLines={1}>
                {item.profile?.username || 'unknown'}
              </Text>
            </View>
            <Text style={styles.exploreContentText} numberOfLines={3}>
              {item.content}
            </Text>
            <View style={styles.exploreStats}>
              <Ionicons name="heart" size={10} color="#FF6B6B" />
              <Text style={styles.exploreStatText}>{item.likes_count || 0}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  function renderUserItem(item: Profile) {
    const isFollowing = followingIds.has(item.id);
    const isSelf = item.id === user?.id;
    return (
      <View style={styles.searchResultCard}>
        <TouchableOpacity
          style={styles.searchResultLeft}
          onPress={() => navigation.navigate('ProfileTab', { screen: 'ProfileMain', params: { userId: item.id } })}
          activeOpacity={0.7}
        >
          <View style={styles.userAvatarWrap}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.userAvatar} />
            ) : (
              <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                <Text style={styles.userAvatarLetter}>
                  {(item.full_name || item.username || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.userInfoCol}>
            <View style={styles.userNameRow}>
              <Text style={styles.userFullName} numberOfLines={1}>
                {item.full_name || item.username || 'Bilinmir'}
              </Text>
              {item.verified_type && item.verified_type !== 'none' && (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={item.verified_type === 'gold' ? '#FFD700' : '#ddb7ff'}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                />
              )}
            </View>
            <Text style={styles.userUsername}>@{item.username}</Text>
          </View>
        </TouchableOpacity>

        {!isSelf && (
          isFollowing ? (
            <TouchableOpacity
              style={styles.followingBtn}
              onPress={() => handleUnfollow(item.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.followingBtnText}>İzlənir</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.followBtn}
              onPress={() => handleFollow(item.id)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#b76dff', '#0566d9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.followGradient}
              >
                <Text style={styles.followBtnText}>İzlə</Text>
              </LinearGradient>
            </TouchableOpacity>
          )
        )}
      </View>
    );
  }

  function formatMemberCount(count: number): string {
    if (count >= 1000) return (count / 1000).toFixed(1).replace('.0', '') + 'k';
    return String(count);
  }

  function renderCommunityItem(item: any) {
    const isJoined = joinedCommunityIds.has(item.id);
    return (
      <TouchableOpacity
        style={styles.communityCard}
        onPress={() => navigation.navigate('CommunityTab', { screen: 'CommunityDetail', params: { community: item } })}
        activeOpacity={0.8}
      >
        <View style={styles.communityAvatarWrap}>
          {item.icon_url ? (
            <Image source={{ uri: item.icon_url }} style={styles.communityAvatar} />
          ) : (
            <View style={[styles.communityAvatar, styles.communityAvatarPlaceholder]}>
              <Text style={styles.communityAvatarLetter}>{(item.name || 'C')[0].toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.communityInfo}>
          <View style={styles.communityNameRow}>
            <Text style={styles.communityName} numberOfLines={1}>{item.name}</Text>
            {item.verified_type && item.verified_type !== 'none' && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={item.verified_type === 'gold' ? '#FFD700' : '#ddb7ff'}
                style={{ fontVariationSettings: "'FILL' 1" }}
              />
            )}
          </View>
          <Text style={styles.communityMemberCount}>
            {formatMemberCount(item.member_count || 0)} üzv
          </Text>
          {item.description ? (
            <Text style={styles.communityDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
        </View>
        {isJoined ? (
          <TouchableOpacity style={styles.communityJoinedBtn} activeOpacity={0.8}>
            <Text style={styles.communityJoinedBtnText}>İzlə</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.communityJoinBtn} activeOpacity={0.9}>
            <LinearGradient
              colors={['#ddb7ff', '#adc6ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.communityJoinGradient}
            >
              <Text style={styles.communityJoinBtnText}>Qatıl</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  function formatCount(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    return String(n);
  }

  function renderHashtagPostItem(item: any) {
    const profile = item.profile;
    const hasImage = !!item.image_url;
    if (hasImage) {
      return (
        <TouchableOpacity
          style={styles.hashtagCard}
          onPress={() => navigation.navigate('FeedTab', { screen: 'PostDetail', params: { post: item, source: 'SearchTab' } })}
          activeOpacity={0.8}
        >
          <View style={styles.hashtagCardLeft}>
            <View style={styles.hashtagImageWrap}>
              <Image source={{ uri: item.image_url }} style={styles.hashtagImage} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.hashtagImageScrim} />
            </View>
          </View>
          <View style={styles.hashtagCardRight}>
            <View style={styles.hashtagUserRow}>
              <View style={styles.hashtagUserAvatar}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.hashtagUserAvatarImg} />
                ) : (
                  <View style={[styles.hashtagUserAvatarImg, styles.hashtagUserAvatarPlaceholder]}>
                    <Text style={styles.hashtagUserAvatarLetter}>
                      {(profile?.full_name || profile?.username || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.hashtagUsername} numberOfLines={1}>
                @{profile?.username || 'unknown'}
              </Text>
            </View>
            <Text style={styles.hashtagContent} numberOfLines={2}>
              {item.content}
            </Text>
            <View style={styles.hashtagStats}>
              <View style={styles.hashtagStatItem}>
                <Ionicons name="heart-outline" size={14} color="#94A3B8" />
                <Text style={styles.hashtagStatText}>{formatCount(item.likes_count || 0)}</Text>
              </View>
              <View style={styles.hashtagStatItem}>
                <Ionicons name="chatbubble-outline" size={14} color="#94A3B8" />
                <Text style={styles.hashtagStatText}>{formatCount(item.comments_count || 0)}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={styles.hashtagCardNoImage}
        onPress={() => navigation.navigate('FeedTab', { screen: 'PostDetail', params: { post: item, source: 'SearchTab' } })}
        activeOpacity={0.8}
      >
        <View style={styles.hashtagNoImageHeader}>
          <View style={[styles.hashtagUserAvatarSmall, { backgroundColor: '#0566d9' }]}>
            <Ionicons name="person" size={16} color="#fff" />
          </View>
          <View style={styles.hashtagNoImageUserCol}>
            <Text style={styles.hashtagNoImageName}>{profile?.full_name || profile?.username || 'unknown'}</Text>
            <Text style={styles.hashtagNoImageTime}>{new Date(item.created_at).toLocaleDateString('az-AZ', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        </View>
        <Text style={styles.hashtagNoImageContent}>{item.content}</Text>
        <View style={styles.hashtagNoImageActions}>
          <View style={styles.hashtagNoImageActionsLeft}>
            <Ionicons name="heart-outline" size={20} color="#94A3B8" />
            <Ionicons name="chatbubble-outline" size={20} color="#94A3B8" />
            <Ionicons name="share-outline" size={20} color="#94A3B8" />
          </View>
          <Ionicons name="bookmark-outline" size={20} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  }

  const activeTab = mode;

  function renderExploreGrid() {
    if (loadingExplore) {
      return <ActivityIndicator color="#ddb7ff" style={{ marginTop: 40 }} />;
    }
    if (explorePosts.length === 0) {
      return (
        <View style={styles.emptyExplore}>
          <Ionicons name="compass-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyExploreText}>Hələ kəşf ediləcək post yoxdur</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={explorePosts}
        renderItem={renderExploreItem}
        keyExtractor={(item) => item.id}
        numColumns={GRID_COLS}
        contentContainerStyle={styles.exploreGrid}
        columnWrapperStyle={styles.exploreRow}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  function renderSearchResults() {
    if (searching) {
      return <ActivityIndicator color="#ddb7ff" style={{ marginTop: 24 }} />;
    }

    const hasResults =
      (mode === 'users' && results.length > 0) ||
      (mode === 'hashtags' && hashtagResults.length > 0) ||
      (mode === 'communities' && communityResults.length > 0);

    if (!hasResults) {
      return <Text style={styles.noResultsText}>Nəticə tapılmadı</Text>;
    }

    if (mode === 'hashtags') {
      return (
        <FlatList
          data={hashtagResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderHashtagPostItem(item)}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      );
    }
    if (mode === 'communities') {
      return (
        <FlatList
          data={communityResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderCommunityItem(item)}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      );
    }
    return (
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderUserItem(item)}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    );
  }

  return (
    <LinearGradient colors={['#0F172A', '#000000']} style={styles.container}>
      {/* Search Bar */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#dae2fd" />
          </TouchableOpacity>
          <View style={styles.searchInputWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Axtar..."
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={(t) => { setQuery(t); if (t.startsWith('#')) setMode('hashtags'); }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {/* Content Area: Explore grid always behind, search overlay on top when searching */}
      <View style={styles.contentArea}>
        {/* Layer 1: Explore posts (always visible) */}
        <View style={styles.exploreLayer}>
          {renderExploreGrid()}
        </View>

        {/* Layer 2: Search results overlay (visible when typing) */}
        {isSearching && (
          <View style={styles.searchOverlay}>
            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity style={[styles.tab, activeTab === 'users' && styles.tabActive]} onPress={() => setMode('users')}>
                <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>İstifadəçilər</Text>
                {activeTab === 'users' && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === 'hashtags' && styles.tabActive]} onPress={() => setMode('hashtags')}>
                <Text style={[styles.tabText, activeTab === 'hashtags' && styles.tabTextActive]}>Hashtag</Text>
                {activeTab === 'hashtags' && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === 'communities' && styles.tabActive]} onPress={() => setMode('communities')}>
                <Text style={[styles.tabText, activeTab === 'communities' && styles.tabTextActive]}>Topluluqlar</Text>
                {activeTab === 'communities' && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            </View>

            {/* Results */}
            <View style={styles.searchResultsContainer}>
              {renderSearchResults()}
            </View>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 42, 61, 0.8)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingLeft: 16,
    paddingRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#dae2fd',
  },
  clearBtn: {
    padding: 6,
  },
  contentArea: {
    flex: 1,
    position: 'relative',
  },
  exploreLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  exploreGrid: {
    paddingHorizontal: GRID_SPACING,
    paddingBottom: 24,
  },
  exploreRow: {
    gap: GRID_SPACING,
    marginBottom: GRID_SPACING,
  },
  exploreItem: {
    width: GRID_ITEM_WIDTH,
    borderRadius: 8,
    overflow: 'hidden',
  },
  exploreImage: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH,
    borderRadius: 8,
  },
  exploreNoImage: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  exploreNoImageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exploreMiniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  exploreMiniAvatarPlaceholder: {
    backgroundColor: '#b76dff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreMiniAvatarLetter: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  exploreUsername: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ddb7ff',
    flex: 1,
  },
  exploreContentText: {
    fontSize: 11,
    color: '#cfc2d6',
    lineHeight: 15,
  },
  exploreStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  exploreStatText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  emptyExplore: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyExploreText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  tabRow: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    flex: 1,
    paddingBottom: 12,
    paddingTop: 4,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#ddb7ff',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#ddb7ff',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  userAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  userAvatar: {
    width: '100%',
    height: '100%',
  },
  userAvatarPlaceholder: {
    backgroundColor: '#b76dff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarLetter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userFullName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dae2fd',
  },
  userUsername: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 1,
  },
  followBtn: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  followGradient: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  followingBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  followingBtnText: {
    color: '#dae2fd',
    fontSize: 14,
    fontWeight: '700',
  },
  noResultsText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    color: '#94A3B8',
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 16,
  },
  communityAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  communityAvatar: {
    width: '100%',
    height: '100%',
  },
  communityAvatarPlaceholder: {
    backgroundColor: '#171f33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityAvatarLetter: {
    color: '#ddb7ff',
    fontSize: 22,
    fontWeight: '700',
  },
  communityInfo: {
    flex: 1,
    minWidth: 0,
  },
  communityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  communityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dae2fd',
  },
  communityMemberCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 2,
  },
  communityDesc: {
    fontSize: 14,
    color: '#cfc2d6',
    lineHeight: 18,
  },
  communityJoinBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  communityJoinGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityJoinBtnText: {
    color: '#490080',
    fontSize: 14,
    fontWeight: '700',
  },
  communityJoinedBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(34,42,61,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  communityJoinedBtnText: {
    color: '#dae2fd',
    fontSize: 14,
    fontWeight: '700',
  },
  hashtagCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(23, 31, 51, 0.7)',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hashtagCardLeft: {
    flexShrink: 0,
  },
  hashtagImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  hashtagImage: {
    width: '100%',
    height: '100%',
  },
  hashtagImageScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  hashtagCardRight: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  hashtagUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  hashtagUserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(221,183,255,0.3)',
  },
  hashtagUserAvatarImg: {
    width: '100%',
    height: '100%',
  },
  hashtagUserAvatarPlaceholder: {
    backgroundColor: '#b76dff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashtagUserAvatarLetter: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  hashtagUsername: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ddb7ff',
  },
  hashtagContent: {
    fontSize: 14,
    color: '#cfc2d6',
    lineHeight: 20,
  },
  hashtagStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  hashtagStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hashtagStatText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  hashtagCardNoImage: {
    backgroundColor: 'rgba(23, 31, 51, 0.7)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hashtagNoImageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  hashtagUserAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashtagNoImageUserCol: {
    flex: 1,
  },
  hashtagNoImageName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dae2fd',
  },
  hashtagNoImageTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  hashtagNoImageContent: {
    fontSize: 16,
    color: '#dae2fd',
    lineHeight: 24,
    marginBottom: 12,
  },
  hashtagNoImageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  hashtagNoImageActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
});
