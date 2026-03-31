import { supabase } from './src/supabaseClient.ts';

async function checkSchema() {
  // Try to insert a dummy record to see the exact error
  const { data, error } = await supabase
    .from('demands')
    .insert([
      {
        id: crypto.randomUUID(),
        title: 'Test',
        description: 'Test',
        client: 'Test',
        priority: 'Média',
        sla: '2026-12-31',
        assigned_to: null,
        status: 'A Fazer',
        tags: ['test'],
        attachments: ['test']
      }
    ]);
    
  console.log('Insert Error:', error);
}

checkSchema();
