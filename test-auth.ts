import { supabase } from './src/supabaseClient.ts';

async function test() {
  // Login as the user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'thiagoantunes.oliver@gmail.com',
    password: 'password123' // I don't know the password, but maybe I can just query the DB directly if I have the service role key? No, I only have anon key.
  });
  
  console.log('Auth:', authError || 'Success');
}
test();
