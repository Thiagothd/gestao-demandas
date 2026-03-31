import { createClient } from '@supabase/supabase-js';

async function test() {
  try {
    const supabase = createClient('https://placeholder.supabase.co', 'placeholder');
    const res = await supabase.auth.getSession();
    console.log('Success:', res);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
