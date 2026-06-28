import { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';
import type { Profile } from '../../types';

export default function NewConversationScreen({ navigation }: any) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);

  async function searchUsers() {
    if (!search.trim()) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${search.trim()}%`)
      .neq('id', user!.id)
      .limit(10);
    if (data) setUsers(data);
  }

  async function startChat(otherUserId: string) {
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user!.id);

    if (existing) {
      for (const p of existing) {
        const { data: other } = await supabase
          .from('conversation_participants')
          .select('*')
          .eq('conversation_id', p.conversation_id)
          .eq('user_id', otherUserId);
        if (other && other.length > 0) {
          navigation.replace('ChatScreen', { conversationId: p.conversation_id, otherUser: users.find(u => u.id === otherUserId) });
          return;
        }
      }
    }

    const convId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    const { error: cError } = await supabase.from('conversations').insert({ id: convId });
    if (cError) return Alert.alert('Xeta', 'Chat yaradila bilmedi: ' + cError.message);

    const { error: pError } = await supabase.from('conversation_participants').insert([
      { conversation_id: convId, user_id: user!.id },
      { conversation_id: convId, user_id: otherUserId },
    ]);
    if (pError) return Alert.alert('Xeta', 'Istifadeci elave edile bilmedi: ' + pError.message);

    navigation.replace('ChatScreen', { conversationId: convId, otherUser: users.find(u => u.id === otherUserId) });
  }

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Yeni mesaj</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Istifadeci adi ile axtar..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={searchUsers}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={searchUsers} style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>Axtar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.userItem} onPress={() => startChat(item.id)}>
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarLetter}>{item.full_name[0]}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.full_name}</Text>
              <Text style={styles.userHandle}>@{item.username}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Istifadeci axtar</Text>}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  title: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, color: colors.text },
  searchBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: colors.white, fontWeight: '600' },
  list: { padding: 16 },
  userItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.white, fontSize: 18, fontWeight: '700' },
  userInfo: { marginLeft: 12 },
  userName: { color: colors.text, fontWeight: '600' },
  userHandle: { color: colors.textMuted, fontSize: fonts.sizes.xs },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
