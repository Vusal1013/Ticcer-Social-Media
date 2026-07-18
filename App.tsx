import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { registerGlobals } from '@livekit/react-native';

registerGlobals();
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/lib/auth';
import { ThemeProvider, useTheme } from './src/lib/theme';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { setupNotifications, setupNotificationListeners } from './src/lib/notifications';
import AppNavigator from './src/navigation/AppNavigator';

function NotificationsGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    setupNotificationListeners();
  }, []);

  useEffect(() => {
    if (user?.id) setupNotifications(user.id);
  }, [user?.id]);

  return <>{children}</>;
}

function ThemedApp() {
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <LanguageProvider>
          <NotificationsGate>
            <AppNavigator />
          </NotificationsGate>
        </LanguageProvider>
      </AuthProvider>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
