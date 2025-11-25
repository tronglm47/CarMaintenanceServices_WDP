import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useEffect, useState } from 'react';
import type { ColorSchemeName } from 'react-native';
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
  const { isLoading: authLoading, isAuthenticated, userRole } = useAuth();
  const router = useRouter();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only navigate once when auth loading is complete
    if (!authLoading && !hasInitialized) {
      console.log('✅ Auth loading completed');
      console.log('🔐 User authenticated:', isAuthenticated);
      console.log('👤 User role:', userRole);
      
      // Mark as initialized immediately to prevent multiple runs
      setHasInitialized(true);
      
      // Add small delay to ensure all APIs are loaded
      const timer = setTimeout(() => {
        // Navigate to the correct route
        if (!isAuthenticated) {
          console.log('📍 Navigating to: /login');
          router.replace('/login');
        } else if (userRole === 'TECHNICIAN') {
          console.log('📍 Navigating to: /(technician-tabs)');
          router.replace('/(technician-tabs)' as any);
        } else {
          console.log('📍 Navigating to: /(tabs)');
          router.replace('/(tabs)');
        }
      }, 300); // 300ms delay to load APIs
      
      return () => clearTimeout(timer);
    }
  }, [authLoading, hasInitialized]);

  // Show splash screen while auth is loading or not yet initialized
  if (authLoading || !hasInitialized) {
    return <SplashScreenComponent />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
          <Stack.Screen name="(technician-tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="service-record-detail" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
          <Stack.Screen name="book-appointment" options={{ headerShown: false }} />
          <Stack.Screen name="vehicle-details" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
        <Toaster richColors swipeToDismissDirection="left" />
        <ChatFloatingButton />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

