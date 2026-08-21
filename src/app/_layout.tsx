import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <AnimatedSplashOverlay />

      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="add-item"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="item-details"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="add-maintenance"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="reminder-settings"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="items"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="edit-maintenance"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}