import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, Pressable, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../constants/theme';

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam', icon: 'megaphone-outline' },
  { key: 'harassment', label: 'Təhqir', icon: 'hand-left-outline' },
  { key: 'hate_speech', label: 'Nifrət nitqi', icon: 'alert-circle-outline' },
  { key: 'nudity', label: 'Yetkin məzmun', icon: 'eye-off-outline' },
  { key: 'violence', label: 'Zorakılıq', icon: 'flash-outline' },
  { key: 'copyright', label: 'Müəllif hüququ', icon: 'document-text-outline' },
  { key: 'other', label: 'Digər', icon: 'ellipsis-horizontal-outline' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  contentType: 'post' | 'reel' | 'message';
  contentId: string;
};

export default function ReportModal({ visible, onClose, contentType, contentId }: Props) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!selectedReason) return Alert.alert('Xəta', 'Zəhmət olmasa səbəb seçin');
    if (!user) return;

    setSending(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      content_type: contentType,
      content_id: contentId,
      reason: selectedReason,
      description: description.trim() || null,
    });
    setSending(false);

    if (error) return Alert.alert('Xəta', error.message);

    Alert.alert('Göndərildi', 'Şikayətiniz qeydə alındı. Admin tərəfindən dəyərləndiriləcək.');
    setSelectedReason(null);
    setDescription('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.title, { color: colors.text }]}>Şikayət et</Text>

          {REPORT_REASONS.map(r => (
            <TouchableOpacity
              key={r.key}
              style={[styles.reason, selectedReason === r.key && { backgroundColor: colors.primary + '20' }]}
              onPress={() => setSelectedReason(r.key)}
            >
              <Ionicons name={r.icon as any} size={20} color={selectedReason === r.key ? colors.primary : colors.textMuted} />
              <Text style={[styles.reasonText, { color: selectedReason === r.key ? colors.primary : colors.text }]}>{r.label}</Text>
              {selectedReason === r.key && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Ətraflı məlumat (istəyə bağlı)"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: sending || !selectedReason ? 0.5 : 1 }]}
            onPress={handleSubmit}
            disabled={sending || !selectedReason}
          >
            <Text style={styles.submitText}>{sending ? 'Göndərilir...' : 'Göndər'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, marginBottom: 16 },
  reason: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4,
  },
  reasonText: { flex: 1, fontSize: fonts.sizes.md, fontWeight: fonts.weights.medium },
  input: {
    borderRadius: 12, borderWidth: 1, padding: 12, fontSize: fonts.sizes.md,
    minHeight: 80, marginTop: 8,
  },
  submitBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  submitText: { color: '#FFFFFF', fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
});
