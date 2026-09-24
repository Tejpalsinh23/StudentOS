import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { StatusBar } from 'expo-status-bar';
// @ts-ignore
import '../global.css';

// Component to handle routing based on auth state
const RootLayoutNav = () => {
  const { session, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      // Redirect to home if logged in and inside auth group
      router.replace('/(tabs)');
    } else if (!session && !inAuthGroup) {
      // Redirect to login if not logged in and not inside auth group
      // Allow access to welcome/onboarding later by modifying this logic
      router.replace('/(auth)/welcome');
    }
  }, [session, initialized, segments]);

  if (!initialized) {
    return null; // Or a splash screen component
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="new-task" options={{ presentation: 'modal', title: 'New Task' }} />
    </Stack>
  );
};

import { View, Platform, LogBox } from 'react-native';

LogBox.ignoreLogs([
  '"shadow*" style props are deprecated',
  'Invalid DOM property `transform-origin`',
  'Listening to push token changes is not yet fully supported on web'
]);

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <View style={[
        { flex: 1, width: '100%', backgroundColor: '#fff' },
        Platform.OS === 'web' && {
          maxWidth: 500,
          marginHorizontal: 'auto',
          // @ts-ignore
          boxShadow: '0 0 20px rgba(0,0,0,0.1)'
        }
      ]}>
        <RootLayoutNav />
      </View>
    </AuthProvider>
  );
}
