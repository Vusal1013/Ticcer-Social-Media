import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';

const PERMISSION_LABELS: Record<string, string> = {
  manage_channels: 'Kanallari idarə et',
  manage_roles: 'Rolları idarə et',
  manage_members: 'Üzvləri idarə et',
  manage_messages: 'Mesajları idarə et',
};

export default function RoleManagementScreen({ route, navigation }: any) {
  const { community } = route.params;
  const { user } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#6C63FF');
  const [showAssign, setShowAssign] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [editingRole, setEditingRole] = useState<any>(null);

  const COLORS = ['#6C63FF', '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#FF8C42', '#A66CFF', '#FF6B9D'];

  useEffect(() => {
    fetchRoles();
    fetchMembers();
  }, []);

  async function fetchRoles() {
    const { data } = await supabase
      .from('community_roles')
      .select('*')
      .eq('community_id', community.id)
      .order('created_at');
    if (data) setRoles(data);
  }

  async function fetchMembers() {
    const { data } = await supabase
      .from('community_members')
      .select('*, profile:profiles(*)')
      .eq('community_id', community.id);
    if (data) setMembers(data);
  }

  async function createRole() {
    if (!roleName.trim()) return;
    const { error } = await supabase.from('community_roles').insert({
      community_id: community.id,
      name: roleName.trim(),
      color: roleColor,
    });
    if (error) return Alert.alert('Xeta', error.message);
    setRoleName('');
    setShowCreate(false);
    fetchRoles();
  }

  async function deleteRole(roleId: string, name: string) {
    Alert.alert('Rolu sil', `"${name}" rolunu silmək istədiyinizə əminsiniz?`, [
      { text: 'Legv', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await supabase.from('community_roles').delete().eq('id', roleId);
        fetchRoles();
      }},
    ]);
  }

  async function assignRole(userId: string) {
    if (!selectedRole) return;
    const { error } = await supabase.from('role_assignments').insert({
      community_id: community.id,
      user_id: userId,
      role_id: selectedRole.id,
    });
    if (error) return Alert.alert('Xeta', error.message);
    fetchMembers();
  }

  async function removeRole(userId: string, roleId: string) {
    await supabase.from('role_assignments').delete()
      .eq('user_id', userId).eq('role_id', roleId);
    fetchMembers();
  }

  async function getMemberRoles(userId: string) {
    const { data } = await supabase
      .from('role_assignments')
      .select('*, role:community_roles(*)')
      .eq('user_id', userId)
      .eq('community_id', community.id);
    return data || [];
  }

  function RoleBadge({ role }: { role: any }) {
    return (
      <View style={[styles.roleBadge, { backgroundColor: role.color + '30', borderColor: role.color }]}>
        <Text style={[styles.roleBadgeText, { color: role.color }]}>{role.name}</Text>
      </View>
    );
  }

  function AssignRoleModal() {
    const [memberRoles, setMemberRoles] = useState<Record<string, any[]>>({});

    useEffect(() => { members.forEach(m => loadMemberRoles(m.user_id)); }, [members]);

    async function loadMemberRoles(userId: string) {
      const roles = await getMemberRoles(userId);
      setMemberRoles(prev => ({ ...prev, [userId]: roles }));
    }

    return (
      <Modal visible={showAssign} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rol ver</Text>
              <TouchableOpacity onPress={() => setShowAssign(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={members}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.assignItem}>
                  <View style={styles.assignInfo}>
                    <Text style={styles.assignName}>{item.profile?.full_name}</Text>
                    <Text style={styles.assignRole}>@{item.profile?.username} · {item.role}</Text>
                    <View style={styles.assignedRoles}>
                      {(memberRoles[item.user_id] || []).map((ra: any) => (
                        <TouchableIndicator key={ra.id} role={ra.role} onRemove={() => removeRole(item.user_id, ra.role_id)} />
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.assignBtn}
                    onPress={() => assignRole(item.user_id)}
                  >
                    <Text style={styles.assignBtnText}>+ Rol</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    );
  }

  function TouchableIndicator({ role, onRemove }: { role: any; onRemove: () => void }) {
    return (
      <TouchableOpacity onPress={onRemove} style={[styles.roleBadge, { backgroundColor: role.color + '30', borderColor: role.color }]}>
        <Text style={[styles.roleBadgeText, { color: role.color }]}>{role.name} ✕</Text>
      </TouchableOpacity>
    );
  }

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Rollar</Text>
        <TouchableOpacity onPress={() => setShowAssign(true)}>
          <Ionicons name="person-add-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={roles}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.roleItem}>
            <View style={[styles.roleColor, { backgroundColor: item.color }]} />
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>{item.name}</Text>
              <Text style={styles.rolePerms}>
                {Object.entries(item.permissions || {}).filter(([, v]) => v).map(([k]) => PERMISSION_LABELS[k] || k).join(', ') || 'Heç bir icazə yox'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => deleteRole(item.id, item.name)}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Hələ rol yaradılmayıb</Text>}
        ListHeaderComponent={
          showCreate ? (
            <View style={styles.createSection}>
              <TextInput
                style={styles.input}
                placeholder="Rol adi"
                placeholderTextColor={colors.textMuted}
                value={roleName}
                onChangeText={setRoleName}
              />
              <Text style={styles.colorLabel}>Reng sec</Text>
              <View style={styles.colorRow}>
                {COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorOption, { backgroundColor: c }, roleColor === c && styles.colorSelected]}
                    onPress={() => setRoleColor(c)}
                  />
                ))}
              </View>
              <View style={styles.createActions}>
                <TouchableOpacity onPress={createRole} style={styles.createBtn}>
                  <Text style={styles.createBtnText}>Yarat</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowCreate(false)}>
                  <Text style={styles.cancelText}>Legv</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={styles.addBtnText}>Rol yarat</Text>
            </TouchableOpacity>
          )
        }
      />

      <AssignRoleModal />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  title: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  list: { padding: 16 },
  roleItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
  roleColor: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  roleInfo: { flex: 1 },
  roleName: { color: colors.text, fontWeight: '600', fontSize: fonts.sizes.md },
  rolePerms: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  createSection: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 12 },
  input: { backgroundColor: colors.background, borderRadius: 8, padding: 12, color: colors.text, marginBottom: 8 },
  colorLabel: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginBottom: 6 },
  colorRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  colorOption: { width: 32, height: 32, borderRadius: 16 },
  colorSelected: { borderWidth: 3, borderColor: colors.white },
  createActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  createBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 20 },
  createBtnText: { color: colors.white, fontWeight: '600' },
  cancelText: { color: colors.textMuted },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.primary + '20', borderRadius: 12, padding: 12, marginBottom: 12 },
  addBtnText: { color: colors.primary, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  assignItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  assignInfo: { flex: 1 },
  assignName: { color: colors.text, fontWeight: '600', fontSize: fonts.sizes.md },
  assignRole: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginTop: 1 },
  assignedRoles: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  roleBadge: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1 },
  roleBadgeText: { fontSize: fonts.sizes.xs, fontWeight: '500' },
  assignBtn: { backgroundColor: colors.primary + '30', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  assignBtnText: { color: colors.primary, fontWeight: '600', fontSize: fonts.sizes.sm },
});
