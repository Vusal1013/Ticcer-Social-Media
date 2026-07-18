import { useState } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, Alert, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { uploadCommunityCover, uploadCommunityIcon } from '../../lib/storage';

const COMMUNITY_TYPES = [
  { id: 'gaming', label: 'Oyun', icon: 'game-controller' },
  { id: 'music', label: 'Musiqi', icon: 'musical-notes' },
  { id: 'art', label: 'İncəsənət', icon: 'color-palette' },
  { id: 'tech', label: 'Texnologiya', icon: 'code-slash' },
  { id: 'sports', label: 'İdman', icon: 'football' },
  { id: 'education', label: 'Təhsil', icon: 'school' },
  { id: 'social', label: 'Sosial', icon: 'people' },
  { id: 'other', label: 'Digər', icon: 'apps' },
];

const PRIVACY_OPTIONS = [
  { id: 'public', label: 'Açıq', desc: 'Hər kəs görə və qoşula bilər', icon: 'globe-outline' },
  { id: 'private', label: 'Gizli', desc: 'Hər kəs görər, qoşulmaq üçün təsdiq lazım', icon: 'lock-closed-outline' },
  { id: 'invite_only', label: 'Dəvət', desc: 'Yalnız dəvət olunanlar qoşula bilər', icon: 'mail-outline' },
];

export default function CreateCommunityScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState('public');
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function pickCoverImage() {
    Alert.alert('Cover şəkli', 'Şəkil mənbəyini seçin', [
      { text: 'Ləğv et', style: 'cancel' },
      {
        text: 'Kamera', onPress: async () => {
          const { granted } = await ImagePicker.requestCameraPermissionsAsync();
          if (!granted) {
            Alert.alert('İcazə tələb olunur', 'Kamera istifadəsi üçün icazə verin');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
          });
          if (!result.canceled) processCoverImage(result.assets[0].uri);
        },
      },
      {
        text: 'Galeriya', onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
          });
          if (!result.canceled) processCoverImage(result.assets[0].uri);
        },
      },
    ]);
  }

  async function processCoverImage(uri: string) {
    setUploadingCover(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200, height: 675 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCoverUri(compressed.uri);
    } catch (err: any) {
      Alert.alert('Xəta', err.message || 'Şəkil işlənə bilmədi');
    } finally {
      setUploadingCover(false);
    }
  }

  async function pickIconImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploadingIcon(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      setIconUri(compressed.uri);
    } catch (err: any) {
      Alert.alert('Xəta', err.message || 'Şəkil işlənə bilmədi');
    } finally {
      setUploadingIcon(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return Alert.alert('Xəta', 'Topluluq adı tələb olunur');

    setLoading(true);
    try {
      const { data: community, error } = await supabase.from('communities').insert({
        name: name.trim(),
        description: description.trim() || null,
        owner_id: user!.id,
        category: selectedType || 'other',
        privacy: privacy,
      }).select().single();

      if (error || !community) throw error || new Error('Yaradıla bilmədi');

      if (coverUri) {
        try {
          const uploadedUrl = await uploadCommunityCover(community.id, coverUri);
          await supabase.from('communities').update({ cover_url: uploadedUrl }).eq('id', community.id);
        } catch {
          // Cover upload failed, community still created
        }
      }

      if (iconUri) {
        try {
          const uploadedUrl = await uploadCommunityIcon(community.id, iconUri);
          await supabase.from('communities').update({ icon_url: uploadedUrl }).eq('id', community.id);
        } catch {
          // Icon upload failed, community still created
        }
      }

      await supabase.from('community_members').insert({
        community_id: community.id, user_id: user!.id, role: 'admin',
      });

      await supabase.from('community_channels').insert([
        { community_id: community.id, name: 'genel', type: 'text', created_by: user!.id },
        { community_id: community.id, name: 'duyurular', type: 'text', created_by: user!.id },
      ]);

      Alert.alert('Topluluq yaradıldı!');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Xəta', err?.message || 'Yaradıla bilmədi');
    } finally {
      setLoading(false);
    }
  }

  function getGlassStyle(field: string) {
    const isFocused = focusedField === field;
    return {
      backgroundColor: isFocused ? 'rgba(30, 41, 59, 0.6)' : 'rgba(30, 41, 59, 0.4)',
      borderColor: isFocused ? '#ddb7ff' : 'rgba(255, 255, 255, 0.08)',
    };
  }

  const selectedTypeData = COMMUNITY_TYPES.find(t => t.id === selectedType);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#0F172A', '#000000']} style={StyleSheet.absoluteFill} />

      <View style={styles.bgBlur1} />
      <View style={styles.bgBlur2} />

      <LinearGradient colors={['#0F172A', 'transparent']} style={styles.headerScrim} pointerEvents="none" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#dae2fd" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Topluluq yarat</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Cover Image */}
        <TouchableOpacity onPress={pickCoverImage} activeOpacity={0.8} style={styles.coverSection}>
          <LinearGradient colors={['#ddb7ff', '#0566d9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coverGradient}>
            {uploadingCover ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="images-outline" size={40} color="rgba(255,255,255,0.6)" />
                <Text style={styles.coverPlaceholderText}>Cover şəkli əlavə et</Text>
              </View>
            )}
            <View style={styles.coverOverlay}>
              <Ionicons name="camera" size={28} color="#FFFFFF" />
              <Text style={styles.coverOverlayText}>Dəyiş</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Community Icon Upload */}
        <TouchableOpacity onPress={pickIconImage} style={styles.iconPreviewSection} activeOpacity={0.8}>
          <LinearGradient
            colors={iconUri ? ['#ddb7ff', '#adc6ff'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
            style={styles.iconPreviewOuter}
          >
            <View style={[styles.iconPreviewInner, !iconUri && styles.iconPreviewInnerEmpty]}>
              {uploadingIcon ? (
                <ActivityIndicator color="#fff" />
              ) : iconUri ? (
                <Image source={{ uri: iconUri }} style={{ width: 76, height: 76, borderRadius: 38 }} />
              ) : selectedTypeData ? (
                <Ionicons name={selectedTypeData.icon as any} size={44} color="#ddb7ff" />
              ) : (
                <Ionicons name="camera" size={44} color="rgba(255,255,255,0.3)" />
              )}
            </View>
          </LinearGradient>
          <Text style={styles.iconPreviewLabel}>{iconUri ? 'Dəyiş' : 'İkon əlavə et'}</Text>
        </TouchableOpacity>

        {/* Community Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Topluluq növü</Text>
          <Text style={styles.sectionSubtitle}>Topluluğunuzun kateqoriyasını seçin</Text>
          <View style={styles.typeGrid}>
            {COMMUNITY_TYPES.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                  onPress={() => setSelectedType(isSelected ? null : type.id)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={isSelected ? ['#ddb7ff', '#0566d9'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.typeGradient}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={28}
                      color={isSelected ? '#fff' : 'rgba(255,255,255,0.5)'}
                    />
                    <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                      {type.label}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formFields}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Topluluq adı</Text>
            <View style={[styles.glassPanel, getGlassStyle('name')]}>
              <Ionicons name="chatbubbles-outline" size={18} color="#cfc2d6" style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Topluluğunuzun adı"
                placeholderTextColor="#6B6B8A"
                maxLength={50}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Haqqında</Text>
            <View style={[styles.glassPanel, styles.bioPanel, getGlassStyle('description')]}>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Topluluğunuz haqqında danışın..."
                placeholderTextColor="#6B6B8A"
                multiline
                textAlignVertical="top"
                maxLength={300}
                onFocus={() => setFocusedField('description')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <Text style={styles.charCount}>{description.length}/300</Text>
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gizlilik</Text>
          <Text style={styles.sectionSubtitle}>Topluluğunuz kimlər üçün əlçatandır</Text>
          <View style={styles.privacyList}>
            {PRIVACY_OPTIONS.map((option) => {
              const isSelected = privacy === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.privacyCard, isSelected && styles.privacyCardSelected]}
                  onPress={() => setPrivacy(option.id)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={isSelected ? ['#ddb7ff15', '#0566d915'] : ['transparent', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.privacyGradient}
                  >
                    <View style={[styles.privacyIcon, isSelected && styles.privacyIconSelected]}>
                      <Ionicons
                        name={option.icon as any}
                        size={22}
                        color={isSelected ? '#ddb7ff' : 'rgba(255,255,255,0.4)'}
                      />
                    </View>
                    <View style={styles.privacyInfo}>
                      <Text style={[styles.privacyLabel, isSelected && styles.privacyLabelSelected]}>
                        {option.label}
                      </Text>
                      <Text style={styles.privacyDesc}>{option.desc}</Text>
                    </View>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <LinearGradient colors={['transparent', '#0b1326']} style={styles.bottomGradient} pointerEvents="none" />
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.createBtn, (loading || !name.trim()) && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={loading || !name.trim()}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#b76dff', '#0566d9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createText}>Topluluğu yarat</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgBlur1: {
    position: 'absolute', top: -60, left: -60, width: '40%', height: '40%',
    borderRadius: 200, backgroundColor: 'rgba(221, 183, 255, 0.05)',
  },
  bgBlur2: {
    position: 'absolute', bottom: -60, right: -60, width: '40%', height: '40%',
    borderRadius: 200, backgroundColor: 'rgba(173, 198, 255, 0.05)',
  },
  headerScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 80, zIndex: 10,
  },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '600', color: '#ddb7ff' },
  scrollContent: { paddingTop: 100 },

  // Cover
  coverSection: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', marginBottom: -40 },
  coverGradient: {
    height: 180, borderRadius: 16, overflow: 'hidden',
    position: 'relative',
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  coverPlaceholderText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8, fontWeight: '500' },
  coverOverlay: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
    paddingVertical: 4, paddingHorizontal: 10,
  },
  coverOverlayText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Icon Preview
  iconPreviewSection: { alignItems: 'center', marginBottom: 24, zIndex: 1 },
  iconPreviewOuter: {
    width: 88, height: 88, borderRadius: 44, padding: 3,
  },
  iconPreviewInner: {
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: '#0b1326',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#0b1326',
  },
  iconPreviewInnerEmpty: { borderColor: 'rgba(255,255,255,0.1)' },
  iconPreviewLabel: { color: '#ddb7ff', fontSize: 13, fontWeight: '700', marginTop: 6 },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 28 },
  sectionTitle: { color: '#dae2fd', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  sectionSubtitle: { color: '#6B6B8A', fontSize: 13, marginBottom: 14 },

  // Type Grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '22%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  typeCardSelected: { borderColor: '#ddb7ff' },
  typeGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 4 },
  typeLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', marginTop: 4 },
  typeLabelSelected: { color: '#fff' },

  // Form Fields
  formFields: { paddingHorizontal: 16, gap: 20, marginBottom: 28 },
  fieldGroup: { flexDirection: 'column', gap: 4 },
  fieldLabel: { paddingHorizontal: 4, color: '#cfc2d6', fontSize: 14, fontWeight: '700' },
  glassPanel: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  fieldIcon: { marginRight: 10 },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    fontSize: 16,
    color: '#dae2fd',
  },
  bioPanel: { minHeight: 120, paddingVertical: 12 },
  bioInput: { height: 96, textAlignVertical: 'top' },
  charCount: { color: '#6B6B8A', fontSize: 11, textAlign: 'right', paddingRight: 4, marginTop: 2 },

  // Privacy
  privacyList: { gap: 10 },
  privacyCard: {
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  privacyCardSelected: { borderColor: '#ddb7ff' },
  privacyGradient: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  privacyIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  privacyIconSelected: { backgroundColor: 'rgba(221, 183, 255, 0.15)' },
  privacyInfo: { flex: 1 },
  privacyLabel: { color: '#dae2fd', fontSize: 15, fontWeight: '600' },
  privacyLabelSelected: { color: '#ddb7ff' },
  privacyDesc: { color: '#6B6B8A', fontSize: 12, marginTop: 1 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#ddb7ff' },
  radioDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#ddb7ff',
  },

  // Bottom
  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, zIndex: 10,
  },
  bottomContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 11,
    padding: 16, paddingBottom: 100,
  },
  createBtn: { borderRadius: 999, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  createBtnDisabled: { opacity: 0.5 },
  createGradient: { paddingVertical: 16, alignItems: 'center' },
  createText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
