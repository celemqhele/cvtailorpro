import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gqiccyijkvqyuollaqju.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zh5_v-HeIQ8RyQEQAVds6g_pgROanvm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);