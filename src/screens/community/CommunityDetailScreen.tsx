import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, Alert, TextInput, ScrollView, Modal, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import VerifiedBadge from '../../components/VerifiedBadge';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';
import { uploadCommunityCover, uploadCommunityIcon } from '../../lib/storage';

const CATEGORY_ICONS: Record<string, string> = {
  gaming: 'game-controller', music: 'musical-notes', art: 'color-palette',
  tech: 'code-slash', sports: 'football', education: 'school', social: 'people', other: 'apps',
};
const PRIVACY_LABELS: Record<string, { label: string; icon: string }> = {
  public: { label: 'Açıq', icon: 'globe-outline' },
  private: { label: 'Gizli', icon: 'lock-closed-outline' },
  invite_only: { label: 'Dəvət', icon: 'mail-outline' },
};

export default function CommunityDetailScreen({ route, navigation }: any) {
  const { community: initialCommunity } = route.params;
  const { user } = useAuth();
  const [community, setCommunity] = useState(initialCommunity);
  const [channels, setChannels] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [voiceParticipants, setVoiceParticipants] = useState<Record<string, any[]>>({});
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [newInviteCode, setNewInviteCode] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [showChannelType, setShowChannelType] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [myRole, setMyRole] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState<'cover' | 'icon' | 'description' | null>(null);
  const [editDescription, setEditDescription] = useState(community.description || '');
  const [saving, setSaving] = useState(false);
  const isOwner = community.owner_id === user!.id;
  const isManager = !!myRole && (myRole === 'admin' || myRole === 'mod');
  const [userPerms, setUserPerms] = useState<Record<string, boolean>>({
    can_read: true, can_write: true, can_voice: false,
    manage_roles: false, manage_channels: false,
    manage_members: false, manage_messages: false, manage_community: false,
  });

  useEffect(() => {
    checkMembership(); fetchChannels(); fetchUnreadCounts();
    supabase.rpc('upgrade_expired_roles', { p_community_id: community.id });
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchUnreadCounts, 10000);
    return () => clearInterval(interval);
  }, []);

  async function checkMembership() {
    const { data } = await supabase.from('community_members').select('id, role')
      .eq('community_id', community.id).eq('user_id', user!.id).single();
    setIsMember(!!data);
    const role = data?.role || null;
    setMyRole(role);
    const perms = await fetchUserPerms();
    if (isOwner || role === 'admin' || role === 'mod' || perms.manage_members) {
      if (community.privacy === 'private') fetchRequests();
      if (community.privacy === 'invite_only') fetchInvites();
    }
  }

  async function fetchUserPerms(): Promise<Record<string, boolean>> {
    const perms: Record<string, boolean> = {
      can_read: false, can_write: false, can_voice: false,
      manage_roles: false, manage_channels: false,
      manage_members: false, manage_messages: false, manage_community: false,
    };
    if (isOwner) {
      Object.keys(perms).forEach(k => perms[k] = true);
      setUserPerms(perms);
      return perms;
    }
    const { data } = await supabase
      .from('role_assignments')
      .select('role:community_roles!inner(permissions)')
      .eq('user_id', user!.id)
      .eq('community_id', community.id);
    if (data) {
      data.forEach((ra: any) => {
        const p = ra.role?.permissions || {};
        Object.keys(p).forEach(k => {
          if (p[k]) perms[k] = true;
        });
      });
    }
    setUserPerms(perms);
    return perms;
  }

  async function fetchChannels() {
    const { data } = await supabase.from('community_channels').select('*')
      .eq('community_id', community.id).order('created_at', { ascending: true });
    if (data) { setChannels(data); fetchVoiceParticipants(data.filter(c => c.type === 'voice')); }
  }

  async function fetchVoiceParticipants(voiceChannels: any[]) {
    if (voiceChannels.length === 0) return;
    const channelIds = voiceChannels.map(c => c.id);
    const { data } = await supabase.from('voice_participants')
      .select('*, profile:profiles(*)').in('channel_id', channelIds);
    if (data) {
      const grouped: Record<string, any[]> = {};
      data.forEach(p => { if (!grouped[p.channel_id]) grouped[p.channel_id] = []; grouped[p.channel_id].push(p); });
      setVoiceParticipants(grouped);
    }
  }

  async function fetchRequests() {
    const { data } = await supabase.from('community_join_requests')
      .select('*, profile:profiles(*)').eq('community_id', community.id).eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setPendingRequests(data);
  }

  async function fetchInvites() {
    const { data } = await supabase.from('community_invites').select('*')
      .eq('community_id', community.id).order('created_at', { ascending: false });
    if (data) setInvites(data);
  }

  async function handleRequest(requestId: string, userId: string, action: 'approved' | 'rejected') {
    if (action === 'approved') {
      await supabase.from('community_members').insert({ community_id: community.id, user_id: userId, role: 'member' });
    }
    await supabase.from('community_join_requests').update({ status: action }).eq('id', requestId);
    fetchRequests();
  }

  async function generateInviteCode() {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { error } = await supabase.from('community_invites').insert({ community_id: community.id, code, created_by: user!.id });
    if (error) return Alert.alert('Xeta', error.message);
    setNewInviteCode(code); fetchInvites();
  }

  async function deleteInvite(inviteId: string) {
    await supabase.from('community_invites').delete().eq('id', inviteId);
    fetchInvites();
  }

  async function fetchUnreadCounts() {
    if (!user) return;
    const textIds = channels.filter(c => c.type === 'text').map(c => c.id);
    if (textIds.length === 0) return;
    const { data: readStatus } = await supabase
      .from('channel_read_status')
      .select('channel_id, last_read_at')
      .in('channel_id', textIds)
      .eq('user_id', user.id);
    const readMap: Record<string, string> = {};
    readStatus?.forEach(r => { readMap[r.channel_id] = r.last_read_at; });
    const counts: Record<string, number> = {};
    for (const chId of textIds) {
      let query = supabase
        .from('channel_messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', chId);
      if (readMap[chId]) {
        query = query.gt('created_at', readMap[chId]);
      }
      const { count } = await query;
      if (count && count > 0) counts[chId] = count;
    }
    setUnreadCounts(counts);
  }

  function createChannel() {
    if (!channelName.trim()) return;
    setShowChannelType(true);
  }

  async function createChannelWithType(type: 'text' | 'voice') {
    setShowChannelType(false);
    const { error } = await supabase.from('community_channels').insert({ community_id: community.id, name: channelName.trim(), type, created_by: user!.id });
    if (error) return Alert.alert('Xeta', error.message);
    setChannelName(''); setShowCreate(false); fetchChannels();
  }

  async function deleteChannel(channel: any) {
    Alert.alert('Kanalı sil', `"${channel.name}" kanalını silmək istədiyinizə əminsiniz?`, [
      { text: 'Ləğv et', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('community_channels').delete().eq('id', channel.id);
        if (error) return Alert.alert('Xeta', error.message);
        fetchChannels();
      }},
    ]);
  }

  async function pickCoverImage() {
    Alert.alert('Cover şəkli', 'Şəkil mənbəyini seçin', [
      { text: 'Ləğv et', style: 'cancel' },
      {
        text: 'Kamera', onPress: async () => {
          const { granted } = await ImagePicker.requestCameraPermissionsAsync();
          if (!granted) return Alert.alert('İcazə tələb olunur', 'Kamera istifadəsi üçün icazə verin');
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [16, 9], quality: 0.8 });
          if (!result.canceled) processEditCover(result.assets[0].uri);
        },
      },
      {
        text: 'Galeriya', onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [16, 9], quality: 0.8 });
          if (!result.canceled) processEditCover(result.assets[0].uri);
        },
      },
    ]);
  }

  async function processEditCover(uri: string) {
    setSaving(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200, height: 675 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
      const uploadedUrl = await uploadCommunityCover(community.id, compressed.uri);
      await supabase.from('communities').update({ cover_url: uploadedUrl }).eq('id', community.id);
      setCommunity({ ...community, cover_url: uploadedUrl });
      Alert.alert('Cover yeniləndi');
    } catch (err: any) {
      Alert.alert('Xəta', err.message || 'Cover yenilənə bilmədi');
    } finally {
      setSaving(false);
      setEditMode(null);
    }
  }

  async function pickIconImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;
    setSaving(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 400, height: 400 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
      const uploadedUrl = await uploadCommunityIcon(community.id, compressed.uri);
      await supabase.from('communities').update({ icon_url: uploadedUrl }).eq('id', community.id);
      setCommunity({ ...community, icon_url: uploadedUrl });
      Alert.alert('İkon yeniləndi');
    } catch (err: any) {
      Alert.alert('Xəta', err.message || 'İkon yenilənə bilmədi');
    } finally {
      setSaving(false);
      setEditMode(null);
    }
  }

  async function saveDescription() {
    setSaving(true);
    const { error } = await supabase.from('communities').update({ description: editDescription.trim() || null }).eq('id', community.id);
    if (error) { Alert.alert('Xəta', error.message); } else {
      setCommunity({ ...community, description: editDescription.trim() || null });
      Alert.alert('Açıqlama yeniləndi');
    }
    setSaving(false);
    setEditMode(null);
  }

  async function deleteCommunity() {
    Alert.alert(
      'Topluluğu sil',
      'Bu topluluğu silmək istədiyinizə əminsiniz? Bütün kanallar, mesajlar və üzvlər silinəcək.',
      [
        { text: 'Ləğv et', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('communities').delete().eq('id', community.id).eq('owner_id', user!.id);
          if (error) return Alert.alert('Xeta', error.message);
          navigation.goBack();
        }},
      ]
    );
  }

  const textChannels = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  function TextChannelItem({ item }: { item: any }) {
    const isActive = item.name === 'genel';
    const unread = unreadCounts[item.id] || 0;
    return (
      <TouchableOpacity
        style={styles.channelItem}
        onPress={() => navigation.navigate('ChannelChat', { channel: item, community })}
        activeOpacity={0.7}
      >
        <Ionicons name="pricetag-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
        <Text style={[styles.channelName, !isActive && { color: colors.textMuted }]}>{item.name}</Text>
        {unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
        {isActive && <View style={styles.channelActive} />}
        <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
          {(isOwner || userPerms.manage_channels) && (
            <TouchableOpacity onPress={() => navigation.navigate('ChannelPermissions', { channel: item, community })} style={{ padding: 4 }}>
              <Ionicons name="shield-outline" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          {(isOwner || userPerms.manage_channels) && (
            <TouchableOpacity onPress={() => deleteChannel(item)} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={14} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function VoiceChannelItem({ item }: { item: any }) {
    const participants = voiceParticipants[item.id] || [];
    const maxUsers = 10;
    const hasActive = participants.length > 0;
    return (
      <TouchableOpacity
        style={styles.channelItem}
        onPress={() => navigation.navigate('VoiceChannel', { channel: item, community })}
        activeOpacity={0.7}
      >
        <Ionicons name="mic" size={18} color={hasActive ? colors.success : colors.textMuted} style={{ marginRight: 10 }} />
        <Text style={[styles.channelName, !hasActive && { color: colors.textMuted }]}>{item.name}</Text>
        <View style={styles.capacityBadge}>
          <Text style={styles.capacityText}>{participants.length}/{maxUsers}</Text>
        </View>
        {participants.length > 0 && (
          <View style={styles.voiceInlineAvatars}>
            {participants.slice(0, 3).map((p: any) => (
              <View key={p.id} style={[styles.miniAvatar, { borderColor: p.is_muted ? colors.textMuted : colors.success }]}>
                {p.profile?.avatar_url ? (
                  <Image source={{ uri: p.profile.avatar_url }} style={styles.miniAvatarImg} />
                ) : (
                  <Text style={styles.miniAvatarText}>
                    {(p.profile?.full_name || p.profile?.username || '?')[0].toUpperCase()}
                  </Text>
                )}
              </View>
            ))}
            {participants.length > 3 && (
              <View style={[styles.miniAvatar, { backgroundColor: colors.surface, borderColor: colors.surface }]}>
                <Text style={[styles.miniAvatarText, { color: colors.textMuted }]}>+{participants.length - 3}</Text>
              </View>
            )}
          </View>
        )}
        <View style={{ flexDirection: 'row', marginLeft: 4 }}>
          {(isOwner || userPerms.manage_channels) && (
            <TouchableOpacity onPress={() => navigation.navigate('ChannelPermissions', { channel: item, community })} style={{ padding: 4 }}>
              <Ionicons name="shield-outline" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          {(isOwner || userPerms.manage_channels) && (
            <TouchableOpacity onPress={() => deleteChannel(item)} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={14} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function renderAdminSection() {
    if (!isOwner && !userPerms.manage_members) return null;
    return (
      <View style={styles.adminSection}>
        {community.privacy === 'private' && (
          <TouchableOpacity style={styles.adminBtn} onPress={() => setShowRequests(!showRequests)}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={styles.adminBtnText}>Sorğular {pendingRequests.length > 0 && `(${pendingRequests.length})`}</Text>
            <Ionicons name={showRequests ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        {community.privacy === 'invite_only' && (
          <TouchableOpacity style={styles.adminBtn} onPress={() => setShowInvites(!showInvites)}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text style={styles.adminBtnText}>Dəvət kodları</Text>
            <Ionicons name={showInvites ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderPendingRequests() {
    if (!showRequests || pendingRequests.length === 0) return null;
    return (
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionBlockTitle}>Təsdiq gözləyən sorğular</Text>
        {pendingRequests.map((req) => (
          <View key={req.id} style={styles.requestItem}>
            <View style={styles.requestUser}>
              <View style={styles.requestAvatar}>
                <Text style={styles.requestAvatarText}>{(req.profile?.full_name || req.profile?.username || '?')[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.requestName}>{req.profile?.full_name || req.profile?.username}</Text>
                <Text style={styles.requestDate}>@{req.profile?.username}</Text>
              </View>
            </View>
            <View style={styles.requestActions}>
              <TouchableOpacity style={styles.approveBtn} onPress={() => handleRequest(req.id, req.user_id, 'approved')}>
                <Ionicons name="checkmark" size={18} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRequest(req.id, req.user_id, 'rejected')}>
                <Ionicons name="close" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  }

  function renderInvites() {
    if (!showInvites) return null;
    return (
      <View style={styles.sectionBlock}>
        <TouchableOpacity style={styles.generateBtn} onPress={generateInviteCode}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.generateBtnText}>Yeni dəvət kodu yarat</Text>
        </TouchableOpacity>
        {newInviteCode ? (
          <View style={styles.newCodeBox}>
            <Text style={styles.newCodeLabel}>Yeni kod:</Text>
            <Text style={styles.newCode}>{newInviteCode}</Text>
            <TouchableOpacity onPress={() => Alert.alert('Kod', newInviteCode)}>
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null}
        {invites.map((inv) => (
          <View key={inv.id} style={styles.inviteItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inviteCode}>{inv.code}</Text>
              <Text style={styles.inviteStats}>
                Istifadə: {inv.use_count}{inv.max_uses ? ` / ${inv.max_uses}` : ''}
                {inv.expires_at ? ` · Bitir: ${new Date(inv.expires_at).toLocaleDateString()}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => deleteInvite(inv.id)}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      {/* Cover */}
      <View style={[styles.coverContainer, !community.cover_url && { height: 0 }]}>
        {community.cover_url && (
          <>
            <Image source={{ uri: community.cover_url }} style={styles.coverImage} />
            <LinearGradient colors={['transparent', '#0F0F23']} style={styles.coverScrim} pointerEvents="none" />
          </>
        )}
      </View>

      {/* Header */}
      <View style={[styles.header, community.cover_url ? styles.headerOverCover : {}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{community.name}</Text>
          {community.verified_type && <VerifiedBadge size={16} type={community.verified_type as 'bronze' | 'platinum'} />}
        </View>
        <TouchableOpacity onPress={() => { if (isOwner || userPerms.manage_community) setShowSettings(true); }} style={styles.headerBtn}>
          <Ionicons name="settings-outline" size={24} color={isOwner || userPerms.manage_community ? colors.primary : 'transparent'} />
        </TouchableOpacity>
      </View>

      {/* Avatar (always shown) */}
      <View style={[styles.avatarOverlay, !community.cover_url && { top: 80 }]}>
        <View style={styles.avatarWrap}>
          {community.icon_url ? (
            <Image source={{ uri: community.icon_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>{community.name[0]}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: community.cover_url ? 190 : 150 }]} keyboardShouldPersistTaps="handled">
        {/* Description */}
        <Text style={styles.description}>
          {community.description || 'Açıqlama yox'}
        </Text>

        {/* Badges */}
        {(community.category || community.privacy) && (
          <View style={styles.badgeRow}>
            {community.category && (
              <View style={styles.badge}>
                <Ionicons name={(CATEGORY_ICONS[community.category] || 'apps') as any} size={12} color={colors.textMuted} />
                <Text style={styles.badgeText}>{community.category}</Text>
              </View>
            )}
            {community.privacy && PRIVACY_LABELS[community.privacy] && (
              <View style={styles.badge}>
                <Ionicons name={PRIVACY_LABELS[community.privacy].icon as any} size={12} color={colors.textMuted} />
                <Text style={styles.badgeText}>{PRIVACY_LABELS[community.privacy].label}</Text>
              </View>
            )}
          </View>
        )}

        {renderAdminSection()}
        {renderPendingRequests()}
        {renderInvites()}

        {!isMember && community.privacy !== 'public' ? (
          <View style={styles.noAccess}>
            <Ionicons name="lock-closed" size={32} color={colors.textMuted} />
            <Text style={styles.noAccessText}>
              {community.privacy === 'private'
                ? 'Bu topluluq gizlidir. Qoşulmaq üçün sorğu göndərin.'
                : 'Bu topluluq dəvət ilədir. Qoşulmaq üçün dəvət kodu lazımdır.'}
            </Text>
          </View>
        ) : (
          <>
            {userPerms.can_read ? (
              <>
                {textChannels.length > 0 && (
                  <View style={styles.channelSection}>
                    <Text style={styles.sectionTitle}>Mətn kanalları</Text>
                    <View style={styles.channelCardGroup}>
                      {textChannels.map((ch) => <TextChannelItem key={ch.id} item={ch} />)}
                    </View>
                  </View>
                )}
                {voiceChannels.length > 0 && (
                  <View style={styles.channelSection}>
                    <Text style={styles.sectionTitle}>Səsli kanallar</Text>
                    <View style={styles.channelCardGroup}>
                      {voiceChannels.map((ch) => <VoiceChannelItem key={ch.id} item={ch} />)}
                    </View>
                  </View>
                )}
              </>
            ) : isMember && (
              <View style={styles.noAccess}>
                <Ionicons name="lock-closed" size={28} color={colors.textMuted} />
                <Text style={styles.noAccessText}>Bu topluluqda kanalları görmək icazəniz yoxdur</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom create button */}
      <LinearGradient colors={['transparent', '#0F0F23']} style={styles.bottomGradient} pointerEvents="none" />
      <View style={styles.bottomBar}>
        {(isOwner || userPerms.manage_channels) && isMember && showCreate ? (
          <View style={styles.createRow}>
            <TextInput
              style={styles.createInput}
              placeholder="Kanal adı"
              placeholderTextColor={colors.textMuted}
              value={channelName}
              onChangeText={setChannelName}
            />
            <View style={styles.createActions}>
              <TouchableOpacity onPress={createChannel} style={styles.createBtn}>
                <Text style={styles.createBtnText}>Yarat</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>Ləğv</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.floatingBtn}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#b76dff', '#0566d9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.floatingGradient}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.floatingText}>Kanal əlavə et</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Settings modal */}
      <Modal visible={showSettings} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Topluluq ayarları</Text>
            <TouchableOpacity style={styles.typeOption} onPress={() => { setShowSettings(false); setEditMode('cover'); pickCoverImage(); }}>
              <Ionicons name="image-outline" size={24} color={colors.primary} />
              <View style={styles.typeOptionInfo}>
                <Text style={styles.typeOptionLabel}>Cover şəkli</Text>
                <Text style={styles.typeOptionDesc}>Cover şəklini dəyiş</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.typeOption} onPress={() => { setShowSettings(false); setEditMode('icon'); pickIconImage(); }}>
              <Ionicons name="camera-outline" size={24} color={colors.primary} />
              <View style={styles.typeOptionInfo}>
                <Text style={styles.typeOptionLabel}>İkon</Text>
                <Text style={styles.typeOptionDesc}>Topluluq ikonunu dəyiş</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.typeOption} onPress={() => { setShowSettings(false); setEditMode('description'); setEditDescription(community.description || ''); }}>
              <Ionicons name="document-text-outline" size={24} color={colors.primary} />
              <View style={styles.typeOptionInfo}>
                <Text style={styles.typeOptionLabel}>Haqqında</Text>
                <Text style={styles.typeOptionDesc}>Açıqlama mətnini redaktə et</Text>
              </View>
            </TouchableOpacity>
            {(isOwner || userPerms.manage_roles) && (
              <TouchableOpacity style={styles.typeOption} onPress={() => { setShowSettings(false); navigation.navigate('RoleManagement', { community }); }}>
                <Ionicons name="shield-outline" size={24} color={colors.primary} />
                <View style={styles.typeOptionInfo}>
                  <Text style={styles.typeOptionLabel}>Rol idarə et</Text>
                  <Text style={styles.typeOptionDesc}>Rolları və icazələri idarə edin</Text>
                </View>
              </TouchableOpacity>
            )}
            {isOwner && (
              <TouchableOpacity style={styles.typeOption} onPress={() => { setShowSettings(false); deleteCommunity(); }}>
                <Ionicons name="trash-outline" size={24} color={colors.error} />
                <View style={styles.typeOptionInfo}>
                  <Text style={[styles.typeOptionLabel, { color: colors.error }]}>Topluluğu sil</Text>
                  <Text style={styles.typeOptionDesc}>Bütün məlumatları sil</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelOption} onPress={() => setShowSettings(false)}>
              <Text style={styles.cancelOptionText}>Bağla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Description edit modal */}
      <Modal visible={editMode === 'description'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Açıqlamanı redaktə et</Text>
            <TextInput
              style={styles.editDescInput}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Topluluq haqqında..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={300}
            />
            <Text style={styles.editDescChar}>{editDescription.length}/300</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={[styles.editDescBtn, { flex: 1, backgroundColor: colors.surface }]} onPress={() => setEditMode(null)}>
                <Text style={{ color: colors.text, fontWeight: '600', textAlign: 'center' }}>Ləğv et</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.editDescBtn, { flex: 1, backgroundColor: colors.primary }]} onPress={saveDescription} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>Yadda saxla</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Channel type selector modal */}
      <Modal visible={showChannelType} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kanal növü seçin</Text>
            <Text style={styles.modalDesc}>"{channelName}" üçün kanal tipini seçin</Text>
            <TouchableOpacity style={styles.typeOption} onPress={() => createChannelWithType('text')}>
              <Ionicons name="pricetag-outline" size={24} color={colors.primary} />
              <View style={styles.typeOptionInfo}>
                <Text style={styles.typeOptionLabel}>Mətn kanalı</Text>
                <Text style={styles.typeOptionDesc}>Mesaj yazmaq və fayl paylaşmaq üçün</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.typeOption} onPress={() => createChannelWithType('voice')}>
              <Ionicons name="mic-outline" size={24} color={colors.success} />
              <View style={styles.typeOptionInfo}>
                <Text style={styles.typeOptionLabel}>Səsli kanal</Text>
                <Text style={styles.typeOptionDesc}>Səsli danışmaq və ekran paylaşmaq üçün</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelOption} onPress={() => setShowChannelType(false)}>
              <Text style={styles.cancelOptionText}>Ləğv et</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  coverContainer: { height: 160, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    paddingTop: 56, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
  },
  headerOverCover: {},
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  avatarOverlay: { position: 'absolute', top: 130, left: 20, zIndex: 11 },
  avatarWrap: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#0F0F23', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },

  scrollContent: { paddingTop: 200, paddingHorizontal: 16, paddingBottom: 100 },

  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  badgeText: { color: colors.textMuted, fontSize: 11, textTransform: 'capitalize' },

  channelSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  channelCardGroup: { backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 12, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  channelItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },
  channelName: { fontSize: 16, color: colors.text, marginLeft: 0 },
  channelActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: 8 },

  capacityBadge: { backgroundColor: 'rgba(45,52,73,0.5)', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8, marginLeft: 8 },
  capacityText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  voiceInlineAvatars: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  miniAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, overflow: 'hidden', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  miniAvatarImg: { width: '100%', height: '100%' },
  miniAvatarText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  adminSection: { gap: 8, marginBottom: 16 },
  adminBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  adminBtnText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },

  sectionBlock: { backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  sectionBlockTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  requestItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  requestUser: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  requestAvatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  requestName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  requestDate: { color: colors.textMuted, fontSize: 12 },
  requestActions: { flexDirection: 'row', gap: 8 },
  approveBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(46,213,115,0.15)', alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,71,87,0.15)', alignItems: 'center', justifyContent: 'center' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  generateBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  newCodeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 8, padding: 10, gap: 8, marginBottom: 10 },
  newCodeLabel: { color: colors.textMuted, fontSize: 12 },
  newCode: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  inviteItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  inviteCode: { color: colors.text, fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  inviteStats: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  noAccess: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  noAccessText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },

  bottomGradient: { position: 'absolute', bottom: 90, left: 0, right: 0, height: 100, zIndex: 10 },
  bottomBar: { position: 'absolute', bottom: 90, left: 0, right: 0, zIndex: 11, padding: 16 },
  floatingBtn: { borderRadius: 999, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 25 },
  floatingGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  floatingText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createInput: { flex: 1, backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 12, padding: 12, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  createActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  createBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancelText: { color: colors.textMuted, fontWeight: '500', fontSize: 14, padding: 4 },

  unreadBadge: { backgroundColor: colors.error, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: 8 },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Channel type modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1A1A3E', borderRadius: 16, padding: 20 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalDesc: { color: colors.textSecondary, fontSize: 13, marginBottom: 16 },
  typeOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 12, padding: 14, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  typeOptionInfo: { flex: 1 },
  typeOptionLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  typeOptionDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cancelOption: { alignItems: 'center', paddingVertical: 12 },
  cancelOptionText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  editDescInput: {
    backgroundColor: '#222a3d', borderRadius: 12, padding: 14, color: colors.text,
    fontSize: 14, marginTop: 12, minHeight: 120, textAlignVertical: 'top',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  editDescChar: { color: colors.textMuted, fontSize: 11, textAlign: 'right', marginTop: 4 },
  editDescBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
});
