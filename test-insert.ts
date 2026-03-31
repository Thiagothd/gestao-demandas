import { supabase } from './src/supabaseClient.js';

async function testInsert() {
  const { data, error } = await supabase.from('demands').insert([
    {
      id: crypto.randomUUID(),
      title: 'Test',
      description: 'Test',
      client: null,
      priority: 'Média',
      sla: null,
      assigned_to: null,
      status: 'A Fazer',
      tags: null,
      attachments: null
    }
  ]);
  console.log('Error:', error);
  console.log('Data:', data);
}

testInsert();
