import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

type Props = {
  size?: number;
  type?: 'gray' | 'gold' | 'red' | 'bronze' | 'platinum';
};

const badgeColors = {
  gray: '#8E8E93',
  gold: '#FFD700',
  red: '#FF3B30',
  bronze: '#CD7F32',
  platinum: '#00BFA5',
};

export default function VerifiedBadge({ size = 16, type = 'gray' }: Props) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: badgeColors[type] }]}>
      <Ionicons name="checkmark-outline" size={size * 0.65} color={colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: colors.white,
    fontWeight: '700',
  },
});
