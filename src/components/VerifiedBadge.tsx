import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

type Props = {
  size?: number;
};

export default function VerifiedBadge({ size = 16 }: Props) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.check, { fontSize: size * 0.65 }]}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: colors.white,
    fontWeight: '700',
  },
});
