import { supabase } from './src/supabaseClient.ts';

async function fetchDemands() {
  const { data, error } = await supabase.from('demands').select('*').limit(5);
  console.log('Error:', error);
  console.log('Data:', data);
}
fetchDemands();
