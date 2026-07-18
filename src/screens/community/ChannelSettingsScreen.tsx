import { useState, useEffect } from 'react';
import { View, Text, Image, TextInput, FlatList, TouchableOpacity, Alert, StyleSheet, Switch, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';

export default function ChannelSettingsScreen({ route, navigation }: any) {
  const { channel, community } = route.params;
  const { user } = useAuth();
  const [bannedWords, setBannedWords] = useState<string[]>(channel.banned_words || []);
  const [newWord, setNewWord] = useState('');
  const [slowMode, setSlowMode] = useState(channel.slow_mode || false);
  const [slowInterval, setSlowInterval] = useState(String(channel.slow_mode_interval || 5));
  const [wordLimit, setWordLimit] = useState(String(channel.banned_word_limit || 3));
  const [bans, setBans] = useState<any[]>([]);
  const [showAllBans, setShowAllBans] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [exemptRoles, setExemptRoles] = useState<string[]>(channel.slow_mode_exempt_roles || []);
  const { user: authUser } = useAuth();

  const isOwner = community.owner_id === authUser?.id;
  const isManager = isOwner;

  useEffect(() => {
    fetchBans();
    fetchRoles();
  }, []);

  async function fetchRoles() {
    const { data } = await supabase
      .from('community_roles')
      .select('*')
      .eq('community_id', community.id);
    if (data) setRoles(data);
  }

  async function toggleExemptRole(roleId: string) {
    const updated = exemptRoles.includes(roleId)
      ? exemptRoles.filter(r => r !== roleId)
      : [...exemptRoles, roleId];
    setExemptRoles(updated);
    await supabase.from('community_channels').update({ slow_mode_exempt_roles: updated }).eq('id', channel.id);
  }

  async function fetchBans() {
    const { data } = await supabase
      .from('community_bans')
      .select('*, profile:profiles(*)')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false });
    if (data) setBans(data);
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

  async function saveSlowMode(value: boolean) {
    setSlowMode(value);
    const { error } = await supabase.from('community_channels').update({
      slow_mode: value, slow_mode_interval: value ? parseInt(slowInterval) || 5 : 0,
    }).eq('id', channel.id);
    if (error) { setSlowMode(!value); return Alert.alert('Xeta', error.message); }
  }

  async function saveSlowInterval() {
    const sec = parseInt(slowInterval) || 5;
    setSlowInterval(String(sec));
    if (slowMode) {
      await supabase.from('community_channels').update({ slow_mode_interval: sec }).eq('id', channel.id);
    }
  }

  async function saveWordLimit() {
    const limit = parseInt(wordLimit) || 3;
    setWordLimit(String(limit));
    await supabase.from('community_channels').update({ banned_word_limit: limit }).eq('id', channel.id);
  }

  async function unbanUser(banId: string) {
    await supabase.from('community_bans').delete().eq('id', banId);
    fetchBans();
  }

  const visibleBans = showAllBans ? bans : bans.slice(0, 2);

  return (
    <LinearGradient colors={['#0F172A', '#000000']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          <Text style={{ color: colors.primary }}>#</Text>{channel.name} tənzimləmələri
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Slow Mode */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="hourglass-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Yavaş rejim</Text>
            </View>
            <Switch
              value={slowMode}
              onValueChange={saveSlowMode}
              trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
              thumbColor={slowMode ? colors.white : colors.textMuted}
            />
          </View>
          <Text style={styles.cardDesc}>
            İstifadəçilərin kanala nə qədər tez-tez mesaj göndərə biləcəyini məhdudlaşdırın.
          </Text>
          {slowMode && (
            <>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.smallInput}
                  value={slowInterval}
                  onChangeText={setSlowInterval}
                  onEndEditing={saveSlowInterval}
                  keyboardType="numeric"
                />
                <Text style={styles.inputLabel}>saniyə</Text>
              </View>
              {roles.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>Bu rollar limitdən kənardır:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {roles.map(r => {
                      const selected = exemptRoles.includes(r.id);
                      return (
                        <TouchableOpacity
                          key={r.id}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                            backgroundColor: selected ? r.color + '30' : '#2d3449',
                            borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10,
                            borderWidth: 1, borderColor: selected ? r.color : 'rgba(255,255,255,0.1)',
                          }}
                          onPress={() => toggleExemptRole(r.id)}
                        >
                          <Ionicons name={r.icon || 'shield-outline'} size={14} color={r.color} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? r.color : colors.textMuted }}>{r.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Banned Words */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="ban-outline" size={20} color={colors.error} />
            <Text style={styles.cardTitle}>Qadağan sözlər</Text>
          </View>
          <Text style={styles.cardDesc}>
            Bu sözləri ehtiva edən mesajlar avtomatik silinəcək.
          </Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              value={newWord}
              onChangeText={setNewWord}
              placeholder="Yeni söz daxil edin..."
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity onPress={addBannedWord} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Əlavə et</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipRow}>
            {bannedWords.map(word => (
              <View key={word} style={styles.chip}>
                <Text style={styles.chipText}>{word}</Text>
                <TouchableOpacity onPress={() => removeBannedWord(word)} style={styles.chipClose}>
                  <Ionicons name="close" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Word limit */}
          <View style={[styles.inputRow, { marginTop: 12 }]}>
            <Text style={styles.inputLabel}>Limit:</Text>
            <TextInput
              style={[styles.smallInput, { width: 60 }]}
              value={wordLimit}
              onChangeText={setWordLimit}
              onEndEditing={saveWordLimit}
              keyboardType="numeric"
            />
            <Text style={styles.inputLabel}>pozuntu → avtoban</Text>
          </View>
        </View>

        {/* Banned Users */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="people-outline" size={20} color={colors.secondary} />
            <Text style={styles.cardTitle}>Banlanmış istifadəçilər</Text>
          </View>
          {bans.length === 0 ? (
            <Text style={styles.emptyText}>Banlanmış istifadəçi yoxdur</Text>
          ) : (
            <View style={styles.banList}>
              {visibleBans.map((ban, i) => (
                <View key={ban.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.banItem}>
                    <View style={styles.banUser}>
                      <View style={styles.banAvatar}>
                        {ban.profile?.avatar_url ? (
                          <Image source={{ uri: ban.profile.avatar_url }} style={styles.banAvatarImg} />
                        ) : (
                          <Text style={styles.banAvatarLetter}>{(ban.profile?.full_name || '?')[0]}</Text>
                        )}
                      </View>
                      <View>
                        <Text style={styles.banName}>@{ban.profile?.username || 'unknown'}</Text>
                        <Text style={styles.banReason}>{ban.reason || 'Banlanıb'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => unbanUser(ban.id)} style={styles.unbanBtn}>
                      <Text style={styles.unbanBtnText}>Banı aç</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
          {bans.length > 2 && (
            <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllBans(!showAllBans)}>
              <Ionicons name={showAllBans ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
              <Text style={styles.showMoreText}>{showAllBans ? 'Az göstər' : `Daha çox göstər (${bans.length})`}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(30,41,59,0.7)',
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '600', color: colors.text, marginLeft: 8 },
  scrollContent: { padding: 16, gap: 24, paddingBottom: 40 },

  card: {
    backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  cardDesc: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 12 },

  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, backgroundColor: '#222a3d', borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 12, color: colors.text, fontSize: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallInput: {
    width: 80, backgroundColor: '#222a3d', borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 8, color: colors.text, fontSize: 14, textAlign: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  inputLabel: { fontSize: 14, color: colors.textMuted },

  primaryBtn: {
    backgroundColor: '#b76dff', borderRadius: 8, paddingHorizontal: 16,
    paddingVertical: 12, justifyContent: 'center',
  },
  primaryBtnText: { color: '#400071', fontWeight: '700', fontSize: 14 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2d3449',
    borderRadius: 20, paddingVertical: 4, paddingLeft: 10, paddingRight: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: { color: colors.text, fontSize: 13, marginRight: 4 },
  chipClose: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  banList: { marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 8 },
  banItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  banUser: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  banAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  banAvatarImg: { width: '100%', height: '100%' },
  banAvatarLetter: { color: '#fff', fontSize: 16, fontWeight: '700' },
  banName: { fontWeight: '700', fontSize: 14, color: colors.text },
  banReason: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  unbanBtn: {
    backgroundColor: '#222a3d', borderRadius: 20, paddingVertical: 6,
    paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  unbanBtnText: { fontSize: 12, fontWeight: '700', color: colors.text },

  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, marginTop: 8,
  },
  showMoreText: { fontSize: 14, fontWeight: '700', color: colors.primary },

  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
