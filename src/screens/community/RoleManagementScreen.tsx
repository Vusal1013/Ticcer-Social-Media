import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';

const ALL_PERMISSIONS = [
  { key: 'can_read', label: 'Oxu', icon: 'eye-outline', iconFilled: 'visibility' },
  { key: 'can_write', label: 'Yaz', icon: 'create-outline', iconFilled: 'edit' },
  { key: 'can_voice', label: 'Danış', icon: 'mic-outline', iconFilled: 'mic' },
];

const ADVANCED_PERMISSIONS = [
  { key: 'manage_roles', label: 'Rolları idarə et', icon: 'shield-outline', desc: 'Rol yaratmaq və silmək' },
  { key: 'manage_channels', label: 'Kanalları idarə et', icon: 'pricetag-outline', desc: 'Kanal yaratmaq və silmək' },
  { key: 'manage_members', label: 'Üzvləri idarə et', icon: 'people-outline', desc: 'Üzv çıxartmaq' },
  { key: 'manage_messages', label: 'Mesajları idarə et', icon: 'chatbubble-outline', desc: 'Mesaj silmək' },
  { key: 'manage_community', label: 'Topluluğu redaktə et', icon: 'settings-outline', desc: 'Cover, ikon, açıqlama' },
];

const DEFAULT_PERMS: Record<string, boolean> = {
  can_read: true, can_write: true, can_voice: false,
  manage_roles: false, manage_channels: false,
  manage_members: false, manage_messages: false, manage_community: false,
};

export default function RoleManagementScreen({ route, navigation }: any) {
  const { community } = route.params;
  const { user } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#6C63FF');
  const [roleIcon, setRoleIcon] = useState('shield-outline');
  const [showAssign, setShowAssign] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const COLORS = ['#6C63FF', '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#FF8C42', '#A66CFF', '#FF6B9D'];
  const ROLE_ICONS: { icon: string; label: string }[] = [
    { icon: 'shield-outline', label: 'Mod' },
    { icon: 'diamond-outline', label: 'Admin' },
    { icon: 'star-outline', label: 'Yeni' },
    { icon: 'heart-outline', label: 'VIP' },
    { icon: 'key-outline', label: 'K.Admin' },
  ];

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
    if (data) {
      const merged = data.map(r => ({
        ...r,
        permissions: { ...DEFAULT_PERMS, ...(r.permissions || {}) },
      }));
      setRoles(merged);
    }
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
      icon: roleIcon,
      permissions: DEFAULT_PERMS,
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

  async function togglePerm(roleId: string, permKey: string) {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    const newVal = !role.permissions[permKey];
    const updatedPerms = { ...role.permissions, [permKey]: newVal };
    const { error } = await supabase.from('community_roles')
      .update({ permissions: updatedPerms }).eq('id', roleId);
    if (error) return Alert.alert('Xeta', error.message);
    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, permissions: updatedPerms } : r));
  }

  async function assignRole(userId: string) {
    if (!selectedRole) return;
    const { error } = await supabase.from('role_assignments').insert({
      community_id: community.id, user_id: userId, role_id: selectedRole.id,
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
      .eq('user_id', userId).eq('community_id', community.id);
    return data || [];
  }

  function RoleBadge({ role: r }: { role: any }) {
    return (
      <View style={[styles.roleBadge, { backgroundColor: r.color + '30', borderColor: r.color }]}>
        <Text style={[styles.roleBadgeText, { color: r.color }]}>{r.name}</Text>
      </View>
    );
  }

  function PermToggle({ roleId, perm, isActive }: { roleId: string; perm: typeof ALL_PERMISSIONS[0]; isActive: boolean }) {
    return (
      <TouchableOpacity
        style={[styles.permToggleBtn, isActive ? styles.permToggleActive : styles.permToggleInactive]}
        onPress={() => togglePerm(roleId, perm.key)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={(isActive ? perm.iconFilled : perm.icon) as any}
          size={20}
          color={isActive ? colors.primary : colors.textMuted}
          style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" } as any}
        />
        <Text style={[styles.permToggleLabel, isActive && { color: colors.primary }]}>
          {perm.label}
        </Text>
      </TouchableOpacity>
    );
  }

  function AssignRoleModal() {
    const [memberRoles, setMemberRoles] = useState<Record<string, any[]>>({});

    useEffect(() => { members.forEach(m => loadMemberRoles(m.user_id)); }, [members]);

    async function loadMemberRoles(userId: string) {
      const r = await getMemberRoles(userId);
      setMemberRoles(prev => ({ ...prev, [userId]: r }));
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

            {roles.length > 0 && (
              <View style={styles.rolePickerRow}>
                <Text style={styles.rolePickerLabel}>Rol seçin:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {roles.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.roleChip, { backgroundColor: r.color + '30', borderColor: r.color }, selectedRole?.id === r.id && styles.roleChipSelected]}
                      onPress={() => setSelectedRole(r)}
                    >
                      <Ionicons name={r.icon || 'shield-outline'} size={14} color={r.color} />
                      <Text style={[styles.roleChipText, { color: r.color }]}>{r.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

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
                        <TouchableOpacity
                          key={ra.id}
                          onPress={() => removeRole(item.user_id, ra.role_id)}
                          style={[styles.roleBadge, { backgroundColor: ra.role.color + '30', borderColor: ra.role.color }]}
                        >
                          <Text style={[styles.roleBadgeText, { color: ra.role.color }]}>{ra.role.name} ✕</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.assignBtn, !selectedRole && { opacity: 0.4 }]}
                    onPress={() => {
                      if (!selectedRole) return Alert.alert('Rol seçin', 'Əvvəlcə yuxarıdan bir rol seçin');
                      assignRole(item.user_id);
                    }}
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

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Rol İcazələri</Text>
        <TouchableOpacity onPress={() => setShowAssign(true)}>
          <Ionicons name="person-add-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={roles}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const perms = item.permissions || DEFAULT_PERMS;
          const isExpanded = expandedRole === item.id;
          return (
            <View style={styles.roleCard}>
              <TouchableOpacity
                style={styles.roleCardHeader}
                onPress={() => setExpandedRole(isExpanded ? null : item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.roleDot, { backgroundColor: item.color }]} />
                <Ionicons name={item.icon || 'shield-outline'} size={18} color={item.color} style={{ marginRight: 4 }} />
                <Text style={styles.roleName}>{item.name}</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => deleteRole(item.id, item.name)} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} style={{ marginLeft: 4 }} />
              </TouchableOpacity>

              {/* Basic permissions row - always visible */}
              <View style={styles.permRow}>
                {ALL_PERMISSIONS.map(perm => (
                  <PermToggle key={perm.key} roleId={item.id} perm={perm} isActive={perms[perm.key]} />
                ))}
              </View>

              {/* Advanced permissions - expandable */}
              {isExpanded && (
                <View style={styles.advancedPerms}>
                  <View style={styles.advancedDivider} />
                  <Text style={styles.advancedTitle}>Qabaqcıl icazələr</Text>
                  {ADVANCED_PERMISSIONS.map(perm => {
                    const active = perms[perm.key];
                    return (
                      <TouchableOpacity
                        key={perm.key}
                        style={styles.advancedRow}
                        onPress={() => togglePerm(item.id, perm.key)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.advancedCheck, active && styles.advancedCheckActive]}>
                          {active && <Ionicons name="checkmark" size={16} color="#fff" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.advancedLabel, active && { color: colors.primary }]}>{perm.label}</Text>
                          <Text style={styles.advancedDesc}>{perm.desc}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="shield-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Hələ rol yoxdur</Text>
            <Text style={styles.emptyDesc}>Kanal üçün icazə təyin etmək üçün yeni rollar əlavə edin.</Text>
          </View>
        }
        ListHeaderComponent={
          showCreate ? (
            <View style={styles.createSection}>
              <TextInput
                style={styles.input}
                placeholder="Rol adı"
                placeholderTextColor={colors.textMuted}
                value={roleName}
                onChangeText={setRoleName}
              />
              <Text style={styles.label}>Rəng seç</Text>
              <View style={styles.colorRow}>
                {COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorOption, { backgroundColor: c }, roleColor === c && styles.colorSelected]}
                    onPress={() => setRoleColor(c)}
                  />
                ))}
              </View>
              <Text style={styles.label}>İkon seç</Text>
              <View style={styles.iconRow}>
                {ROLE_ICONS.map(({ icon, label }) => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.iconOption, roleIcon === icon && styles.iconSelected]}
                    onPress={() => setRoleIcon(icon)}
                  >
                    <Ionicons name={icon as any} size={22} color={roleIcon === icon ? '#fff' : colors.text} />
                    <Text style={{ fontSize: 8, color: roleIcon === icon ? '#fff' : colors.textMuted }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.createActions}>
                <TouchableOpacity onPress={createRole} style={styles.createBtn}>
                  <Text style={styles.createBtnText}>Yarat</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowCreate(false)}>
                  <Text style={styles.cancelText}>Ləğv</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addRoleBtn} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={styles.addRoleBtnText}>ROL ƏLAVƏ ET</Text>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '600' },
  title: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  list: { padding: 16, paddingBottom: 40 },

  // Role Card
  roleCard: {
    backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  roleCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  roleDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  roleName: { color: colors.text, fontWeight: '600', fontSize: fonts.sizes.md },

  // Basic Permissions Row
  permRow: { flexDirection: 'row', gap: 8 },
  permToggleBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  permToggleActive: {
    backgroundColor: 'rgba(221,183,255,0.15)', borderColor: 'rgba(221,183,255,0.3)',
  },
  permToggleInactive: {
    backgroundColor: 'transparent',
  },
  permToggleLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Advanced Permissions
  advancedPerms: { marginTop: 4 },
  advancedDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 10 },
  advancedTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  advancedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  advancedCheck: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  advancedCheckActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  advancedLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  advancedDesc: { color: colors.textMuted, fontSize: 11, marginTop: 1 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(30,41,59,0.7)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  emptyDesc: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4 },

  // Add button
  addRoleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(221,183,255,0.15)', borderRadius: 999,
    paddingVertical: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(221,183,255,0.2)',
  },
  addRoleBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13, letterSpacing: 1 },

  // Create section
  createSection: { backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  input: { backgroundColor: '#222a3d', borderRadius: 8, padding: 12, color: colors.text, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  colorRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  colorOption: { width: 32, height: 32, borderRadius: 16 },
  colorSelected: { borderWidth: 3, borderColor: colors.white },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  iconOption: { width: 56, height: 48, borderRadius: 10, backgroundColor: '#222a3d', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  iconSelected: { backgroundColor: colors.primary, borderColor: colors.white },
  createActions: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 4 },
  createBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 20 },
  createBtnText: { color: '#fff', fontWeight: '600' },
  cancelText: { color: colors.textMuted, fontWeight: '500' },

  // Assign role modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1A1A3E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.text, fontWeight: '700', fontSize: fonts.sizes.lg },
  assignItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  assignInfo: { flex: 1 },
  assignName: { color: colors.text, fontWeight: '600', fontSize: fonts.sizes.md },
  assignRole: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginTop: 1 },
  assignedRoles: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  roleBadge: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1 },
  roleBadgeText: { fontSize: fonts.sizes.xs, fontWeight: '500' },
  assignBtn: { backgroundColor: colors.primary + '30', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  assignBtnText: { color: colors.primary, fontWeight: '600', fontSize: fonts.sizes.sm },
  rolePickerRow: { marginBottom: 12 },
  rolePickerLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 6 },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, borderWidth: 1 },
  roleChipText: { fontSize: fonts.sizes.xs, fontWeight: '600' },
  roleChipSelected: { borderWidth: 2, borderColor: colors.white },
});
