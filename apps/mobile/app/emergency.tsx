import { Link } from 'expo-router';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, radius } from '@/theme/tokens';

/**
 * Emergency guidance screen. High-contrast, one-tap actions. In M3 this is populated
 * from the server's emergency block; for M0 it shows the universal actions.
 * Intentionally NOT theme-dimmed — emergency UI is always maximum-contrast.
 */
export default function Emergency() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Text style={styles.title}>If this is an emergency</Text>
      <Text style={styles.body}>
        If you or someone else may be in danger, call emergency services now. This app does not
        replace professional medical care.
      </Text>

      <TouchableOpacity
        style={styles.primary}
        accessibilityRole="button"
        onPress={() => void Linking.openURL('tel:911')}
      >
        <Text style={styles.primaryText}>Call 911</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondary}
        accessibilityRole="button"
        onPress={() => void Linking.openURL('tel:988')}
      >
        <Text style={styles.secondaryText}>Call or text 988 (Crisis Lifeline)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondary}
        accessibilityRole="button"
        onPress={() => void Linking.openURL('tel:18002221222')}
      >
        <Text style={styles.secondaryText}>Poison Control: 1-800-222-1222</Text>
      </TouchableOpacity>

      <Link href="/" asChild>
        <TouchableOpacity style={styles.dismiss} accessibilityRole="button">
          <Text style={styles.dismissText}>I'm safe — go back</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#7A0A10', padding: spacing.lg, gap: spacing.md },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  body: { color: '#FFE5E7', fontSize: 16, lineHeight: 23 },
  primary: { backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.md },
  primaryText: { color: '#7A0A10', fontSize: 20, fontWeight: '900' },
  secondary: { borderColor: '#fff', borderWidth: 2, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  secondaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dismiss: { paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  dismissText: { color: '#FFE5E7', fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
});
