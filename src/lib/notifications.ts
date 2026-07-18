import { Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

let setupInProgress = false;
let navigationRef: any = null;

export function setNotificationNavigationRef(ref: any) {
  navigationRef = ref;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function setupNotificationListeners() {
  Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification.request.content.data);
  });

  Notifications.addNotificationResponseReceivedListener(response => {
    const { data } = response.notification.request.content;

    const route = data?.route as string | undefined;
    if (route) {
      Linking.openURL(route);
      return;
    }

    if (data?.type === 'call' && data?.call_id && navigationRef) {
      navigationRef.navigate('IncomingCallScreen', {
        callId: data.call_id,
        callerInfo: { id: data.caller_id },
        callType: data.call_type || 'audio',
        roomName: data.room_name,
        conversationId: data.conversation_id,
      });
      return;
    }

    const type = data?.type as string | undefined;
    const postId = data?.post_id as string | undefined;
    if (type && postId) {
      Linking.openURL(`ticcer://${type}/${postId}`);
    }
  });
}

export async function setupNotifications(userId: string) {
  if (!Device.isDevice || setupInProgress) return;
  setupInProgress = true;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    setupInProgress = false;
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('general', {
      name: 'general',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF7F00',
    });
    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Zənglər',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 500, 500],
      lightColor: '#6C63FF',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.manifest?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('profiles').update({
      expo_push_token: token.data ?? null,
    }).eq('id', userId);
  } catch (e) {
    console.warn('Push token alinamadi:', e);
  }

  setupInProgress = false;
}

export async function sendLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null,
  });
}
