import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

/** Screen scaffold with safe-area padding and themed background. */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }): ReactNode {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg };
  if (!scroll) {
    return <View style={[styles.screen, pad, { backgroundColor: theme.bg }]}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={[styles.screen, pad]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: ReactNode }): ReactNode {
  const theme = useTheme();
  return <Text style={[styles.title, { color: theme.text }]}>{children}</Text>;
}

export function Body({ children }: { children: ReactNode }): ReactNode {
  const theme = useTheme();
  return <Text style={[styles.body, { color: theme.textMuted }]}>{children}</Text>;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences';
}): ReactNode {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={label}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}): ReactNode {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const bg = isPrimary ? theme.brand : 'transparent';
  const fg = isPrimary ? '#fff' : theme.brand;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: bg, borderColor: theme.brand, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function ErrorText({ children }: { children: ReactNode }): ReactNode {
  const theme = useTheme();
  if (!children) return null;
  return <Text style={[styles.error, { color: theme.emergency }]}>{children}</Text>;
}

export function FullScreenLoader(): ReactNode {
  const theme = useTheme();
  return (
    <View style={[styles.loader, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, gap: spacing.md, minHeight: '100%' },
  title: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
  body: { fontSize: 15, lineHeight: 22 },
  field: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: 16 },
  button: {
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '800' },
  error: { fontSize: 14, fontWeight: '600' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
