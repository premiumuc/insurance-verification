import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTheme } from '@/providers/theme';

/**
 * Authenticated tab shell (docs/05 §5.3). Emoji icons keep the M2 shell dependency-free;
 * a proper icon set lands in the M7 design polish. Gen-2 will render a provider shell
 * here by role.
 */
function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{icon}</Text>;
}

export default function AppTabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Today', tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat', tabBarIcon: ({ color }) => <TabIcon icon="💬" color={color} /> }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <TabIcon icon="📊" color={color} /> }}
      />
      <Tabs.Screen
        name="care"
        options={{ title: 'Care', tabBarIcon: ({ color }) => <TabIcon icon="💊" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} /> }}
      />
      {/* Reachable from other screens, not top-level tabs. */}
      <Tabs.Screen name="log" options={{ href: null }} />
      <Tabs.Screen name="devices" options={{ href: null }} />
      <Tabs.Screen name="assessment" options={{ href: null }} />
      <Tabs.Screen name="providers" options={{ href: null }} />
    </Tabs>
  );
}
