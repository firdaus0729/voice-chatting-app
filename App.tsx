import 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import { AuthScreen } from './src/screens/AuthScreen';
import { VoiceRoomScreen } from './src/screens/VoiceRoomScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { AgencyDashboardScreen } from './src/screens/AgencyDashboardScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { ToastHost } from './src/components/common/ToastHost';

export type RootStackParamList = {
  Auth: undefined;
  VoiceRoom: undefined;
  Wallet: undefined;
  Agency: undefined;
  Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Auth"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="VoiceRoom" component={VoiceRoomScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="Agency" component={AgencyDashboardScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
        </Stack.Navigator>
        <ToastHost />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
