import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { colors, fonts } from '../../constants/theme';

export default function CreateCommunityScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return Alert.alert('Xeta', 'Ad teleb olunur');
    setLoading(true);
    const { data, error } = await supabase.from('communities').insert({
      name: name.trim(),
      description: description.trim() || null,
      owner_id: user!.id,
    }).select().single();

    if (error || !data) {
      setLoading(false);
      return Alert.alert('Xeta', error?.message || 'Yaradila bilmedi');
    }

    await supabase.from('community_members').insert({
      community_id: data.id, user_id: user!.id, role: 'admin',
    });

    await supabase.from('community_channels').insert([
      { community_id: data.id, name: 'genel', type: 'text' },
      { community_id: data.id, name: 'duyurular', type: 'text' },
    ]);

    setLoading(false);
    Alert.alert('Topluluq yaradildi!');
    navigation.goBack();
  }

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Topluluq yarat</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Topluluq adi"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, styles.descInput]}
          placeholder="Aciklama (istegene bagli)"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity style={[styles.createBtn, loading && styles.createBtnDisabled]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.createBtnText}>Yarat</Text>}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  title: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  form: { padding: 16, gap: 12 },
  input: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, color: colors.text, fontSize: fonts.sizes.md },
  descInput: { minHeight: 80, textAlignVertical: 'top' },
  createBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: colors.white, fontSize: fonts.sizes.md, fontWeight: '600' },
});
