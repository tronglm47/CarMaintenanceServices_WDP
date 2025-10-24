import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useEffect, useState } from 'react';
import type { ColorSchemeName } from 'react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import * as Notification from "expo-notifications";
import { useColorScheme } from '@/hooks/use-color-scheme';
import SplashScreenComponent from '@/components/SplashScreen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import ChatFloatingButton from '@/components/ChatFloatingButton';

// Initialize Firebase before anything else
import Firebase from '@react-native-firebase/app';
import { Toaster } from 'sonner-native';

Firebase.app();

// Setup notification handlers
Notification.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <NotificationProvider>

        <AppNavigator colorScheme={colorScheme} />

      </NotificationProvider>
    </AuthProvider>
  );
}

function AppNavigator({ colorScheme }: { colorScheme: ColorSchemeName }) {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only navigate once when auth loading is complete
    if (!authLoading && !hasInitialized) {
      setHasInitialized(true);
      console.log('✅ Auth loading completed');
      console.log('🔐 User authenticated:', isAuthenticated);
      const targetRoute = isAuthenticated ? '/(tabs)' : '/login';
      console.log('📍 Navigating to:', targetRoute);
      
      // Navigate to the correct route
      router.replace(targetRoute);
    }
  }, [authLoading, hasInitialized, isAuthenticated]);

  // Show splash screen while auth is loading
  if (authLoading) {
    console.log('⏳ Auth is loading, showing splash screen...');
    return <SplashScreenComponent />;
  }

  console.log('🎯 Rendering main navigation. isAuthenticated:', isAuthenticated);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="login">
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
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
      <Toaster richColors swipeToDismissDirection="left" />
      <ChatFloatingButton />
    </ThemeProvider>
  );
}

