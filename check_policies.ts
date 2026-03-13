import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gqiccyijkvqyuollaqju.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies_for_profiles');
  if (error) {
    console.error('Error:', error);
    // Let's try direct query if RPC doesn't exist
    const { data: qData, error: qError } = await supabase.from('pg_policies').select('*').eq('tablename', 'profiles');
    if (qError) {
      console.error('Query error:', qError);
    } else {
      console.log('Policies:', qData);
    }
  } else {
    console.log('Policies:', data);
  }
}

checkPolicies();
