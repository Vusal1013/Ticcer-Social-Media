import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../lib/supabase';
import { uriToArrayBuffer } from '../../lib/storage';
import { useAuth } from '../../lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';

export default function GoldRequestScreen({ navigation }: any) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [passportImage, setPassportImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setPassportImage(result.assets[0].uri);
  }

  async function handleSubmit() {
    if (!fullName.trim()) return Alert.alert('Xəta', 'Adınızı daxil edin');
    if (!dob.trim()) return Alert.alert('Xəta', 'Doğum tarixini daxil edin');
    if (!passportImage) return Alert.alert('Xəta', 'Pasport şəklini əlavə edin');

    setUploading(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        passportImage, [{ resize: { width: 800 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      const fileName = `${user!.id}_gold_${Date.now()}.jpg`;
      const arrayBuffer = await uriToArrayBuffer(compressed.uri);
      const { error: uploadError } = await supabase.storage
        .from('gold-requests')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('gold-requests').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('gold_requests').insert({
        user_id: user!.id,
        full_name: fullName.trim(),
        dob: dob.trim(),
        passport_image_url: urlData.publicUrl,
      });
      if (dbError) throw dbError;

      Alert.alert('Göndərildi', 'Gold istəyiniz adminə göndərildi. Cavab gözləyin.', [
        { text: 'Oldu', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Xəta', err.message || 'Bir xəta baş verdi');
    } finally {
      setUploading(false);
    }
  }

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>Geri</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Gold İstəyi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.form}>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {passportImage ? (
            <Image source={{ uri: passportImage }} style={styles.passportImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.imagePlaceholderText, { color: colors.textMuted }]}>Pasport şəklini əlavə et</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Pasportda yazılan ad soyad</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Ad Soyad"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Doğum tarixi</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={dob}
          onChangeText={setDob}
          placeholder="GG.AA.YYYY"
          placeholderTextColor={colors.textMuted}
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: uploading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>Göndər</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  title: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
  content: { flex: 1 },
  form: { padding: 16, gap: 16 },
  imagePicker: { alignItems: 'center', marginBottom: 8 },
  passportImage: { width: '100%', height: 200, borderRadius: 12 },
  imagePlaceholder: {
    width: '100%', height: 200, borderRadius: 12, borderWidth: 2, borderColor: colors.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  imagePlaceholderText: { fontSize: fonts.sizes.sm },
  label: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium },
  input: {
    borderRadius: 12, borderWidth: 1, padding: 14, fontSize: fonts.sizes.md,
  },
  submitBtn: {
    borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8,
  },
  submitText: { color: '#FFFFFF', fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
});
