import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://wibtcbushwojjzegyppl.supabase.co';
const supabaseAnonKey = 'sb_publishable_pQAY8NGZVX10-5Ps8WiunQ_sn3WlaVE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
