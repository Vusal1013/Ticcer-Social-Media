import { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';

export default function ChannelSettingsScreen({ route, navigation }: any) {
  const { channel, community } = route.params;
  const { user } = useAuth();
  const [bannedWords, setBannedWords] = useState<string[]>(channel.banned_words || []);
  const [newWord, setNewWord] = useState('');
  const [slowMode, setSlowMode] = useState(channel.slow_mode || false);
  const [slowInterval, setSlowInterval] = useState(String(channel.slow_mode_interval || 5));
  const [bans, setBans] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    fetchBans();
    fetchMembers();
  }, []);

  async function fetchBans() {
    const { data } = await supabase
      .from('channel_bans')
      .select('*, profile:profiles(*)')
      .eq('channel_id', channel.id);
    if (data) setBans(data);
  }

  async function fetchMembers() {
    const { data } = await supabase
      .from('community_members')
      .select('*, profile:profiles(*)')
      .eq('community_id', community.id)
      .neq('user_id', user!.id);
    if (data) setMembers(data);
  }

  async function addBannedWord() {
    if (!newWord.trim()) return;
    const updated = [...bannedWords, newWord.trim().toLowerCase()];
    const { error } = await supabase.from('community_channels').update({ banned_words: updated }).eq('id', channel.id);
    if (error) return Alert.alert('Xeta', error.message);
    setBannedWords(updated);
    setNewWord('');
  }

  async function removeBannedWord(word: string) {
    const updated = bannedWords.filter(w => w !== word);
    await supabase.from('community_channels').update({ banned_words: updated }).eq('id', channel.id);
    setBannedWords(updated);
  }

  async function toggleSlowMode(value: boolean) {
    const { error } = await supabase.from('community_channels').update({
      slow_mode: value, slow_mode_interval: value ? parseInt(slowInterval) || 5 : 0,
    }).eq('id', channel.id);
    if (error) return Alert.alert('Xeta', error.message);
    setSlowMode(value);
  }

  async function banUser(targetId: string, name: string) {
    Alert.alert('Ban et', `${name} ban edilsin?`, [
      { text: 'Legv', style: 'cancel' },
      { text: 'Ban et', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('channel_bans').insert({
          channel_id: channel.id, user_id: targetId, banned_by: user!.id, reason: 'Moderator qerari',
        });
        if (error) return Alert.alert('Xeta', error.message);
        fetchBans();
      }},
    ]);
  }

  async function unbanUser(banId: string) {
    await supabase.from('channel_bans').delete().eq('id', banId);
    fetchBans();
  }

  async function kickUser(targetId: string, name: string) {
    Alert.alert('Kick et', `${name} kanaldan cixarilsin?`, [
      { text: 'Legv', style: 'cancel' },
      { text: 'Kick et', style: 'destructive', onPress: async () => {
        await supabase.from('channel_bans').insert({
          channel_id: channel.id, user_id: targetId, banned_by: user!.id, reason: 'Kick',
        });
        fetchBans();
      }},
    ]);
  }

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}># {channel.name} ayarlari</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={() => (
          <View style={styles.content}>
            {/* SLOW MODE */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Yavas rejim</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Aktiv</Text>
                <Switch value={slowMode} onValueChange={toggleSlowMode} trackColor={{ true: colors.primary }} />
              </View>
              {slowMode && (
                <TextInput
                  style={styles.input}
                  value={slowInterval}
                  onChangeText={setSlowInterval}
                  keyboardType="numeric"
                  placeholder="Saniye (5)"
                  placeholderTextColor={colors.textMuted}
                  onEndEditing={() => toggleSlowMode(true)}
                />
              )}
            </View>

            {/* BANNED WORDS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Qadagan sozler</Text>
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newWord}
                  onChangeText={setNewWord}
                  placeholder="Soz elave et"
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity onPress={addBannedWord} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>Elave et</Text>
                </TouchableOpacity>
              </View>
              {bannedWords.map(word => (
                <View key={word} style={styles.tag}>
                  <Text style={styles.tagText}>{word}</Text>
                  <TouchableOpacity onPress={() => removeBannedWord(word)}>
                    <Text style={styles.removeText}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* BANNED USERS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Banli istifadeciler</Text>
              {bans.length === 0 ? (
                <Text style={styles.empty}>Banli yox</Text>
              ) : bans.map(ban => (
                <View key={ban.id} style={styles.banItem}>
                  <Text style={styles.banName}>{ban.profile?.full_name || 'Bilinmir'}</Text>
                  <TouchableOpacity onPress={() => unbanUser(ban.id)}>
                    <Text style={styles.unbanText}>Ban geri al</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* KICK / BAN USERS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Uyeleri idare et</Text>
              {members.map(m => (
                <View key={m.id} style={styles.memberItem}>
                  <Text style={styles.memberName}>{m.profile?.full_name} (@{m.profile?.username})</Text>
                  <View style={styles.memberActions}>
                    <TouchableOpacity onPress={() => kickUser(m.user_id, m.profile?.full_name)} style={styles.kickBtn}>
                      <Text style={styles.kickBtnText}>Kick</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => banUser(m.user_id, m.profile?.full_name)} style={styles.banBtn}>
                      <Text style={styles.banBtnText}>Ban</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  title: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  content: { padding: 16, gap: 20 },
  section: { gap: 8 },
  sectionTitle: { color: colors.textMuted, fontSize: fonts.sizes.xs, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { color: colors.text, fontSize: fonts.sizes.md },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, color: colors.text, marginVertical: 4 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  addBtnText: { color: colors.white, fontWeight: '600' },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.error + '20', borderRadius: 8, padding: 10, justifyContent: 'space-between', marginBottom: 4 },
  tagText: { color: colors.text, fontSize: fonts.sizes.sm },
  removeText: { color: colors.error, fontWeight: '700', marginLeft: 8, fontSize: 16 },
  empty: { color: colors.textMuted, fontSize: fonts.sizes.sm },
  banItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 10, marginBottom: 4 },
  banName: { color: colors.text, fontSize: fonts.sizes.sm },
  unbanText: { color: colors.success, fontWeight: '600', fontSize: fonts.sizes.sm },
  memberItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 10, marginBottom: 4 },
  memberName: { color: colors.text, fontSize: fonts.sizes.sm, flex: 1 },
  memberActions: { flexDirection: 'row', gap: 4 },
  kickBtn: { backgroundColor: colors.warning + '30', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  kickBtnText: { color: colors.warning, fontSize: fonts.sizes.xs, fontWeight: '600' },
  banBtn: { backgroundColor: colors.error + '30', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  banBtnText: { color: colors.error, fontSize: fonts.sizes.xs, fontWeight: '600' },
});
