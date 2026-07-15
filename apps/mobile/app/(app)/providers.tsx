import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ProviderType } from '@healthy-companion/types';
import { Body, FullScreenLoader, Screen, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

const FILTERS: { type?: ProviderType; label: string }[] = [
  { type: undefined, label: 'All' },
  { type: 'physician', label: 'Doctors' },
  { type: 'urgent_care', label: 'Urgent care' },
  { type: 'mental_health', label: 'Mental health' },
  { type: 'community_clinic', label: 'Affordable' },
];

/** Provider discovery (docs/07 §7.4), including affordable/community options. */
export default function Providers() {
  const theme = useTheme();
  const [type, setType] = useState<ProviderType | undefined>(undefined);
  const providers = useQuery({
    queryKey: ['providers', type ?? 'all'],
    queryFn: () => api.searchProviders({ type }),
  });

  return (
    <Screen>
      <Title>Find care</Title>
      <Body>In-network and out-of-network options near you, including affordable clinics.</Body>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.type === type;
          return (
            <TouchableOpacity
              key={f.label}
              accessibilityRole="button"
              onPress={() => setType(f.type)}
              style={[styles.filter, { borderColor: active ? theme.brand : theme.border, backgroundColor: active ? theme.brand : 'transparent' }]}
            >
              <Text style={{ color: active ? '#fff' : theme.text, fontWeight: '600' }}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {providers.isLoading ? (
        <FullScreenLoader />
      ) : (
        providers.data?.items.map((p) => (
          <View key={p.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.name, { color: theme.text }]}>{p.name}</Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {[p.specialty, p.distanceKm != null ? `${p.distanceKm} km` : null].filter(Boolean).join(' · ')}
            </Text>
            <View style={styles.badges}>
              {p.inNetwork === true && <Badge label="In-network" color={theme.success} />}
              {p.inNetwork === false && <Badge label="Out-of-network" color={theme.warning} />}
              {p.affordableOption && <Badge label="Sliding scale" color={theme.brand} />}
            </View>
            {p.phone && (
              <TouchableOpacity accessibilityRole="button" onPress={() => void Linking.openURL(`tel:${p.phone}`)}>
                <Text style={[styles.call, { color: theme.brand }]}>Call {p.phone}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </Screen>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filter: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  name: { fontSize: 16, fontWeight: '800' },
  meta: { fontSize: 13 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  badge: { borderWidth: 1, borderRadius: radius.sm, paddingVertical: 2, paddingHorizontal: spacing.sm },
  call: { fontSize: 14, fontWeight: '700', marginTop: spacing.xs },
});
