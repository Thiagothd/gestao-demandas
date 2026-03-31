import { supabase } from './src/supabaseClient.ts';

async function checkSchema() {
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
        attachments: ['test'],
        non_existent_column: 'test'
      }
    ]);
    
  console.log('Insert Error:', error);
}

checkSchema();
