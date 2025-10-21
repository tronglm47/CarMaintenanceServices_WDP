import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useEffect, useState } from 'react';
import type { ColorSchemeName } from 'react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

// Initialize Firebase before anything else
import Firebase from '@react-native-firebase/app';
Firebase.app();

import { useColorScheme } from '@/hooks/use-color-scheme';
import SplashScreenComponent from '@/components/SplashScreen';
import { AuthProvider } from '@/contexts/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <AppNavigator colorScheme={colorScheme} />
    </AuthProvider>
  );
}
function AppNavigator({ colorScheme }: { colorScheme: ColorSchemeName }) {
  const [isLoading, setIsLoading] = useState(true);


  const handleSplashFinish = (route: string) => {
    console.log('Splash finished, navigating to:', route);
    setIsLoading(false);
    // Navigate after the splash screen state is updated
    // Use a small delay to ensure the Stack is rendered first
    setTimeout(() => {
      router.replace(route as any);
    }, 0);
  };

  if (isLoading) {
    console.log('Showing splash screen');
    return <SplashScreenComponent onFinish={handleSplashFinish} />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="test" options={{ headerShown: false }} />
        <Stack.Screen name="test-auth" options={{ headerShown: false }} />
        <Stack.Screen name="auth-debug" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="verify" options={{ headerShown: false }} />
        <Stack.Screen name="service-description" options={{ headerShown: false }} />
        <Stack.Screen name="payment" options={{ headerShown: false }} />
        <Stack.Screen name="booking-success" options={{ headerShown: false }} />
        <Stack.Screen name="tracking" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
      <Toast />
    </ThemeProvider>
  );
}

