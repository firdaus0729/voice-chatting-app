import { useEffect } from 'react';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { RoyalColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth';
import { getFirebaseApp, onAuthStateChanged, isFirebaseConfigured } from '@/services';
import { authService } from '@/features/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

const RoyalDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: RoyalColors.gold,
    background: RoyalColors.background,
    card: RoyalColors.surface,
    text: RoyalColors.text,
    border: RoyalColors.blackElevated,
    notification: RoyalColors.purple,
  },
};

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const initialized = useAuthStore((s: { initialized: boolean }) => s.initialized);

  useEffect(() => {
    getFirebaseApp();
    if (!isFirebaseConfigured()) {
      useAuthStore.getState().setInitialized(true);
      useAuthStore.getState().setStatus('unauthenticated');
      return;
    }
    const unsub = onAuthStateChanged((fbUser) => {
      authService.loadUserIntoStore(fbUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [initialized]);

  return (
    <ThemeProvider value={RoyalDarkTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: RoyalColors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
