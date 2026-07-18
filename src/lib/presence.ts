import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';
import { useAuth } from './auth';

export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let isActive = true;

    const updateStatus = async (online: boolean) => {
      if (!isActive) return;
      const payload: any = { is_online: online };
      if (!online) payload.last_seen = new Date().toISOString();
      await supabase.from('profiles').update(payload).eq('id', user.id);
    };

    updateStatus(true);

    const sub = AppState.addEventListener('change', (nextState) => {
      updateStatus(nextState === 'active');
    });

    return () => {
      isActive = false;
      updateStatus(false);
      sub.remove();
    };
  }, [user]);
}

export function formatLastSeen(dateStr: string | null): string {
  if (!dateStr) return 'Offline';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Indicə online idi';
  if (diff < 3600) return `${Math.floor(diff / 60)} dəq əvvəl`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat əvvəl`;
  if (diff < 172800) return 'Dünən';
  return `${Math.floor(diff / 86400)} gün əvvəl`;
}
