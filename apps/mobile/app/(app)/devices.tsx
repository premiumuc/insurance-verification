import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { DeviceVendor } from '@healthy-companion/types';
import { Body, Button, FullScreenLoader, Screen, Title } from '@/components/ui';
import { getHealthAdapter } from '@/lib/health';
import { api } from '@/lib/api';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

const CONNECTABLE: { vendor: DeviceVendor; label: string }[] = [
  { vendor: 'apple_health', label: 'Apple Health' },
  { vendor: 'health_connect', label: 'Health Connect' },
  { vendor: 'oura', label: 'Oura' },
  { vendor: 'fitbit', label: 'Fitbit' },
  { vendor: 'dexcom', label: 'Dexcom (CGM)' },
];

/** Connect wearables/CGMs and see linked sources (docs/07 §7.3). */
export default function Devices() {
  const theme = useTheme();
  const qc = useQueryClient();
  const devices = useQuery({ queryKey: ['devices'], queryFn: () => api.listDevices() });

  const connect = useMutation({
    mutationFn: async (vendor: DeviceVendor) => {
      const res = await api.connectDevice({ vendor });
      // On-device sources: pull recent samples immediately via the native adapter.
      if (vendor === 'apple_health' || vendor === 'health_connect') {
        const adapter = getHealthAdapter();
        if (await adapter.requestPermissions()) {
          const since = new Date(Date.now() - 7 * 864e5).toISOString();
          const samples = await adapter.readRecentSamples(since);
          if (samples.length) await api.syncSamples({ vendor, samples });
        }
      } else if (res.authUrl) {
        void Linking.openURL(res.authUrl);
      }
      return res;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['devices'] }),
  });

  if (devices.isLoading) return <FullScreenLoader />;

  const connected = new Set(devices.data?.map((d) => d.vendor));

  return (
    <Screen>
      <Title>Connect your data</Title>
      <Body>
        Link the devices you already use. Healthy Companion becomes the layer that makes
        your data actually mean something.
      </Body>

      {CONNECTABLE.map((c) => (
        <View key={c.vendor} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.text }]}>{c.label}</Text>
          {connected.has(c.vendor) ? (
            <Text style={[styles.connected, { color: theme.success }]}>Connected ✓</Text>
          ) : (
            <Button title="Connect" onPress={() => connect.mutate(c.vendor)} loading={connect.isPending} />
          )}
        </View>
      ))}

      <Body>
        Note: Apple Health and Health Connect require the installed app (not a preview);
        wearable/CGM sources open a secure sign-in.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  label: { fontSize: 16, fontWeight: '700' },
  connected: { fontSize: 14, fontWeight: '700' },
});
