import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../constants/theme';
const icons = {
  index: 'grid-outline',
  explore: 'compass-outline',
  create: 'add-circle-outline',
  favorites: 'heart-outline',
  profile: 'person-outline',
} as const;
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: 78,
          paddingTop: 10,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name as keyof typeof icons]} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="create" options={{ title: 'Create' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
