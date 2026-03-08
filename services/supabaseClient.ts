import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gqiccyijkvqyuollaqju.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zh5_v-HeIQ8RyQEQAVds6g_pgROanvm';

export const storageAdapter = {
  mode: 'auto' as 'auto' | 'session' | 'local',
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    
    if (storageAdapter.mode === 'session') {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    } else if (storageAdapter.mode === 'local') {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      // Auto: update where found, default to local if new
      if (sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, value);
      }
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: storageAdapter,
    persistSession: true,
    detectSessionInUrl: true
  }
});