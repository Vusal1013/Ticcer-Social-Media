import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import VerifiedBadge from '../../components/VerifiedBadge';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';

export default function CommunityDetailScreen({ route, navigation }: any) {
  const { community } = route.params;
  const { user } = useAuth();
  const [channels, setChannels] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text');
  const [voiceParticipants, setVoiceParticipants] = useState<Record<string, any[]>>({});
  const isOwner = community.owner_id === user!.id;

  async function fetchChannels() {
    const { data } = await supabase
      .from('community_channels')
      .select('*')
      .eq('community_id', community.id)
      .order('created_at', { ascending: true });
    if (data) {
      setChannels(data);
      fetchVoiceParticipants(data.filter(c => c.type === 'voice'));
    }
  }

  async function fetchVoiceParticipants(voiceChannels: any[]) {
    if (voiceChannels.length === 0) return;
    const channelIds = voiceChannels.map(c => c.id);
    const { data } = await supabase
      .from('voice_participants')
      .select('*, profile:profiles(*)')
      .in('channel_id', channelIds);
    if (data) {
      const grouped: Record<string, any[]> = {};
      data.forEach(p => {
        if (!grouped[p.channel_id]) grouped[p.channel_id] = [];
        grouped[p.channel_id].push(p);
      });
      setVoiceParticipants(grouped);
    }
  }

  useEffect(() => { fetchChannels(); }, []);

  async function createChannel() {
    if (!channelName.trim()) return;
    const { error } = await supabase.from('community_channels').insert({
      community_id: community.id, name: channelName.trim(), type: channelType,
    });
    if (error) return Alert.alert('Xeta', error.message);
    setChannelName('');
    setShowCreate(false);
    fetchChannels();
  }

  const textChannels = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  function ChannelItem({ item }: { item: any }) {
    const participants = voiceParticipants[item.id] || [];
    return (
      <TouchableOpacity
        style={styles.channelItem}
        onPress={() => {
          if (item.type === 'voice') {
            navigation.navigate('VoiceChannel', { channel: item, community });
          } else {
            navigation.navigate('ChannelChat', { channel: item, community });
          }
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {item.type === 'voice'
            ? <Ionicons name="mic-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
            : <Text style={styles.channelIcon}>#</Text>}
          <View style={{ flex: 1 }}>
            <Text style={styles.channelName}>{item.name}</Text>
            {item.type === 'voice' && participants.length > 0 && (
              <Text style={styles.voiceUsers}>
                <Ionicons name="volume-high-outline" size={12} color={colors.success} /> {participants.map((p: any) => p.profile?.full_name?.split(' ')[0] || p.profile?.username).join(', ')}
              </Text>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {item.type === 'voice' && participants.length > 0 && (
            <Text style={styles.participantCount}>{participants.length}</Text>
          )}
          {isOwner && (
            <TouchableOpacity
              onPress={() => navigation.navigate('ChannelPermissions', { channel: item, community })}
              style={styles.permBtn}
            >
              <Ionicons name="shield-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Geri</Text>
        </TouchableOpacity>
        <View style={styles.nameRow}>
          <Text style={styles.title}>{community.name}</Text>
          {community.verified && <VerifiedBadge size={16} />}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isOwner && (
            <TouchableOpacity onPress={() => navigation.navigate('RoleManagement', { community })}>
              <Ionicons name="shield-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={channels}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ChannelItem item={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.infoSection}>
            <Text style={styles.desc}>{community.description || 'Aciklama yox'}</Text>
            {textChannels.length > 0 && <Text style={styles.sectionLabel}>Metn kanallari</Text>}
            {voiceChannels.length > 0 && <Text style={styles.sectionLabel}>Sesli kanallar</Text>}
          </View>
        }
      />

      {isOwner && (
        <View style={styles.bottomActions}>
          {showCreate ? (
            <View style={styles.createRow}>
              <TextInput
                style={styles.channelInput}
                placeholder="Kanal adi"
                placeholderTextColor={colors.textMuted}
                value={channelName}
                onChangeText={setChannelName}
              />
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, channelType === 'text' && styles.typeBtnActive]}
                  onPress={() => setChannelType('text')}
                >
                  <Text style={[styles.typeBtnText, channelType === 'text' && styles.typeBtnTextActive]}># Metn</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, channelType === 'voice' && styles.typeBtnActive]}
                  onPress={() => setChannelType('voice')}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="mic-outline" size={16} color={channelType === 'voice' ? colors.white : colors.textMuted} /><Text style={[styles.typeBtnText, channelType === 'voice' && styles.typeBtnTextActive, { marginLeft: 4 }]}> Ses</Text></View>
                </TouchableOpacity>
              </View>
              <View style={styles.createActions}>
                <TouchableOpacity onPress={createChannel} style={styles.createChannelBtn}>
                  <Text style={styles.createChannelBtnText}>Yarat</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowCreate(false)}>
                  <Text style={styles.cancelText}>Legv</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.addChannelBtn}>
              <Text style={styles.addChannelBtnText}>+ Kanal elave et</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  list: { padding: 16 },
  infoSection: { marginBottom: 16 },
  desc: { color: colors.textSecondary, fontSize: fonts.sizes.sm, marginBottom: 12 },
  sectionLabel: { color: colors.textMuted, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 8 },
  channelItem: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 4, backgroundColor: colors.surface, borderRadius: 8 },
  channelIcon: { color: colors.textMuted, fontSize: 18, marginRight: 10 },
  channelName: { color: colors.text, fontSize: fonts.sizes.md, fontWeight: '500' },
  voiceUsers: { color: colors.success, fontSize: fonts.sizes.xs, marginTop: 2 },
  participantCount: { color: colors.success, fontSize: fonts.sizes.xs, fontWeight: '600', backgroundColor: colors.success + '20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  permBtn: { padding: 4 },
  bottomActions: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  addChannelBtn: { backgroundColor: colors.primary + '30', borderRadius: 12, padding: 14, alignItems: 'center' },
  addChannelBtnText: { color: colors.primary, fontWeight: '600' },
  createRow: { gap: 8 },
  channelInput: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, color: colors.text },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center' },
  typeBtnActive: { backgroundColor: colors.primary },
  typeBtnText: { color: colors.textMuted, fontWeight: '500' },
  typeBtnTextActive: { color: colors.white },
  createActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  createChannelBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
  createChannelBtnText: { color: colors.white, fontWeight: '600' },
  cancelText: { color: colors.textMuted, fontWeight: '500' },
});
