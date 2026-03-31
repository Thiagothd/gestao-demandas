import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqklshmvjjrqxnusdmud.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxa2xzaG12ampycXhudXNkbXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjU3MTMsImV4cCI6MjA4ODk0MTcxM30.qTZrSZJSjy0ri6F6vZgGc2qKbVm53Vized4FYUGt190';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);