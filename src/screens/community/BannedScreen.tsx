import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';

export default function BannedScreen({ route, navigation }: any) {
  const { communityName, reason, community } = route.params;
  const { colors } = useTheme();

  return (
    <LinearGradient colors={['#0F172A', '#000000']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.logo}>Ticcer</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.main}>
        {/* Ban Icon */}
        <View style={styles.iconWrap}>
          <View style={styles.glowOuter} />
          <View style={styles.glowInner} />
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(30,41,59,0.6)', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <Ionicons name="gavel" size={64} color={colors.error} />
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          <Text style={styles.title}>Siz bu icmadan ban edilmisiniz</Text>

          {/* Reason Card */}
          <View style={[styles.reasonCard, { backgroundColor: 'rgba(30,41,59,0.7)', borderColor: 'rgba(255,255,255,0.05)' }]}>
            <Text style={styles.reasonLabel}>
              Səbəb:{' '}
              <Text style={styles.reasonText}>
                {reason || 'Qaydaların pozulması'}
              </Text>
            </Text>
          </View>

          <Text style={styles.description}>
            <Text style={{ fontWeight: '700', color: colors.text }}>{communityName}</Text>{' '}
            icmasının qaydalarına əməl etmədiyiniz üçün girişiniz məhdudlaşdırılıb.
            Əgər bunun bir səhv olduğunu düşünürsünüzsə, dəstək komandası ilə əlaqə saxlayın.
          </Text>
        </View>
      </View>

      {/* Bottom Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.returnBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#ddb7ff', '#adc6ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.returnGradient}
          >
            <Ionicons name="arrow-back" size={18} color="#490080" />
            <Text style={styles.returnText}>Geri dön</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            // Navigate to help/settings
            navigation.navigate('Settings');
          }}
          style={styles.helpBtn}
        >
          <Text style={styles.helpText}>Yardım mərkəzi ilə əlaqə</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.02,
    color: '#ddb7ff',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  iconWrap: {
    position: 'relative',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,71,87,0.1)',
    transform: [{ scale: 1.5 }],
  },
  glowInner: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(221,183,255,0.05)',
    transform: [{ scale: 1.1 }],
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ddb7ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 50,
    elevation: 10,
  },
  textContent: {
    maxWidth: 400,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#dae2fd',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  reasonCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reasonLabel: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  reasonText: {
    fontWeight: '600',
    color: '#cfc2d6',
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 32,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  returnBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#ddb7ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  returnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: '100%',
  },
  returnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#490080',
  },
  helpBtn: {
    paddingVertical: 8,
  },
  helpText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
});
