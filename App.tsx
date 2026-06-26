import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/lib/auth';
import { ThemeProvider, useTheme } from './src/lib/theme';
import { setupNotifications } from './src/lib/notifications';
import AppNavigator from './src/navigation/AppNavigator';

function NotificationsGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

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
        <NotificationsGate>
          <AppNavigator />
        </NotificationsGate>
      </AuthProvider>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
