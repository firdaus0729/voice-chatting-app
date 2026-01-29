import { Stack } from 'expo-router';
import { RoyalColors } from '@/constants/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: RoyalColors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="user-inspector" />
      <Stack.Screen name="gift-manager" />
      <Stack.Screen name="shop-manager" />
      <Stack.Screen name="contest-manager" />
      <Stack.Screen name="agency-tree" />
    </Stack>
  );
}
