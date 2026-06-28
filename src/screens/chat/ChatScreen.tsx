import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, otherUser } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  }

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  async function sendMessage() {
    if (!text.trim()) return;
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user!.id,
      content: text.trim(),
    });
    if (error) {
      Alert.alert('Xeta', error.message);
    } else {
      setText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function deleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    Alert.alert('Mesajları sil', `${ids.length} mesaj silinsin?`, [
      { text: 'Ləğv et', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await supabase.from('messages').delete().in('id', ids);
        setSelectedIds(new Set());
        setSelectMode(false);
        fetchMessages();
      }},
    ]);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isMine = item.sender_id === user!.id;
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.msgRow, isMine ? styles.myMsgRow : styles.theirMsgRow]}
        onPress={() => selectMode && toggleSelect(item.id)}
        onLongPress={() => { if (!selectMode) { setSelectMode(true); toggleSelect(item.id); } }}
        activeOpacity={selectMode ? 0.6 : 1}
      >
        {selectMode && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkMark}>✓</Text>}
          </View>
        )}
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble, isSelected && styles.selectedBubble]}>
          <Text style={[styles.msgText, isMine ? styles.myMsgText : styles.theirMsgText]}>
            {item.content}
          </Text>
          <Text style={[styles.msgTime, isMine ? styles.myMsgTime : styles.theirMsgTime]}>
            {new Date(item.created_at).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [selectedIds, selectMode]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (selectMode) { setSelectMode(false); setSelectedIds(new Set()); }
          else navigation.goBack();
        }}>
          <Text style={styles.backBtn}>{selectMode ? 'Imtina' : 'Geri'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerName}>
          {selectMode ? `${selectedIds.size} secildi` : (otherUser?.full_name || 'Mesaj')}
        </Text>
        {!selectMode ? (
          <TouchableOpacity onPress={() => setSelectMode(true)}>
            <Text style={styles.selectBtn}>Sec</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => !selectMode && flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {selectMode ? (
        <View style={styles.bulkBar}>
          <TouchableOpacity style={styles.deleteAllBtn} onPress={deleteSelected}>
            <Text style={styles.deleteAllText}>Secilmisleri sil ({selectedIds.size})</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Mesaj yaz..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Text style={styles.sendText}>Gonder</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  headerName: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  msgList: { padding: 16, paddingBottom: 8 },
  msgRow: { marginBottom: 8 },
  myMsgRow: { alignItems: 'flex-end' },
  theirMsgRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  myBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  msgText: { fontSize: fonts.sizes.md },
  myMsgText: { color: colors.white },
  theirMsgText: { color: colors.text },
  msgTime: { fontSize: fonts.sizes.xs, marginTop: 4 },
  myMsgTime: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  theirMsgTime: { color: colors.textMuted },
  inputRow: { flexDirection: 'row', padding: 12, paddingBottom: 90, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: 8 },
  input: { flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, maxHeight: 80 },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center' },
  sendText: { color: colors.white, fontWeight: '600' },
  selectBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  bulkBar: { padding: 12, paddingBottom: 90, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  deleteAllBtn: { backgroundColor: '#FF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  deleteAllText: { color: colors.white, fontWeight: '700', fontSize: fonts.sizes.md },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  checkboxSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkMark: { color: colors.white, fontSize: 14, fontWeight: '700' },
  selectedBubble: { opacity: 0.6 },
});
