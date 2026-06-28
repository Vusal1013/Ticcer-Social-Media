import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Switch, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';

export default function ChannelPermissionsScreen({ route, navigation }: any) {
  const { channel, community } = route.params;
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    const { data: roleData } = await supabase
      .from('community_roles')
      .select('*')
      .eq('community_id', community.id)
      .order('created_at');

    const { data: permData } = await supabase
      .from('channel_permissions')
      .select('*')
      .eq('channel_id', channel.id);

    if (roleData) {
      setRoles(roleData);
      const permMap: Record<string, any> = {};
      (permData || []).forEach(p => { permMap[p.role_id] = p; });
      setPermissions(permMap);
    }
  }

  async function togglePermission(roleId: string, field: 'can_read' | 'can_write' | 'can_voice', value: boolean) {
    const existing = permissions[roleId];
    if (existing) {
      const { error } = await supabase.from('channel_permissions').update({ [field]: value })
        .eq('id', existing.id);
      if (error) return Alert.alert('Xeta', error.message);
      setPermissions(prev => ({ ...prev, [roleId]: { ...prev[roleId], [field]: value } }));
    } else {
      const { data, error } = await supabase.from('channel_permissions').insert({
        channel_id: channel.id, role_id: roleId,
        can_read: field === 'can_read' ? value : true,
        can_write: field === 'can_write' ? value : true,
        can_voice: field === 'can_voice' ? value : true,
      }).select().single();
      if (error) return Alert.alert('Xeta', error.message);
      if (data) setPermissions(prev => ({ ...prev, [roleId]: data }));
    }
  }

  function PermToggle({ roleId, field, label, icon }: { roleId: string; field: 'can_read' | 'can_write' | 'can_voice'; label: string; icon: string }) {
    const perm = permissions[roleId];
    const value = perm ? perm[field] : true;
    return (
      <View style={styles.permRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={icon as any} size={16} color={colors.textMuted} />
          <Text style={styles.permLabel}>{label}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={v => togglePermission(roleId, field, v)}
          trackColor={{ true: colors.primary }}
        />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}># {channel.name} - İcazələr</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={roles}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.roleSection}>
            <View style={styles.roleHeader}>
              <View style={[styles.roleDot, { backgroundColor: item.color }]} />
              <Text style={styles.roleName}>{item.name}</Text>
            </View>
            <View style={styles.permsList}>
              <PermToggle roleId={item.id} field="can_read" label="Oxu" icon="eye-outline" />
              <PermToggle roleId={item.id} field="can_write" label="Yaz" icon="create-outline" />
              {channel.type === 'voice' && (
                <PermToggle roleId={item.id} field="can_voice" label="Danış" icon="mic-outline" />
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Hələ rol yoxdur</Text>}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  title: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.md, flex: 1, textAlign: 'center' },
  list: { padding: 16 },
  roleSection: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  roleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  roleDot: { width: 10, height: 10, borderRadius: 5 },
  roleName: { color: colors.text, fontWeight: '600', fontSize: fonts.sizes.md },
  permsList: { gap: 6 },
  permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  permLabel: { color: colors.text, fontSize: fonts.sizes.sm },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
