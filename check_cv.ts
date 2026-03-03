
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gqiccyijkvqyuollaqju.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCV() {
  const { data, error } = await supabase
    .from('cv_applications')
    .select('*')
    .ilike('job_title', '%Operations Manager%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No CVs found with that title.');
    return;
  }

  console.log('Found CVs:');
  data.forEach(cv => {
    console.log(`ID: ${cv.id}`);
    console.log(`Title: ${cv.job_title}`);
    console.log(`Created At: ${cv.created_at}`);
    // Check if there's any metadata about the model
    if (cv.metadata) {
        console.log(`Metadata: ${JSON.stringify(cv.metadata, null, 2)}`);
    } else {
        console.log('No metadata found.');
    }
    console.log('---');
  });
}

checkCV();
