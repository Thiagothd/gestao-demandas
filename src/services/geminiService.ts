import { GoogleGenAI, Type } from '@google/genai';
import { Demand, TaskStatus } from '../types';

export const parseDemandWithAI = async (text: string): Promise<Omit<Demand, 'id' | 'createdAt'>> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extraia as informações da seguinte demanda de TI e retorne em formato JSON.
    
    Texto bruto:
    """
    ${text}
    """
    
    Regras:
    - Identifique o Cliente, Data de Início, Responsável e Observações Gerais.
    - Desmembre as tarefas (módulos) e suas respectivas subtarefas.
    - Se uma subtarefa tiver "ok" ou "concluído" no texto, marque o status como "Concluído". Caso contrário, "Pendente".
    `,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          client: { type: Type.STRING, description: 'Nome do cliente' },
          startDate: { type: Type.STRING, description: 'Data de início no formato DD/MM/YYYY' },
          responsible: { type: Type.STRING, description: 'Nome do responsável' },
          notes: { type: Type.STRING, description: 'Observações gerais ou contexto' },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Título da tarefa ou módulo principal' },
                subtasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: 'Descrição da subtarefa' },
                      status: { type: Type.STRING, description: 'Status da subtarefa: "Pendente", "Em Andamento" ou "Concluído"' }
                    },
                    required: ['title', 'status']
                  }
                }
              },
              required: ['title', 'subtasks']
            }
          }
        },
        required: ['client', 'startDate', 'responsible', 'notes', 'tasks']
      }
    }
  });

  const jsonStr = response.text?.trim() || '{}';
  const parsed = JSON.parse(jsonStr);

  // Add IDs and ensure correct status types
  const mappedTasks = parsed.tasks.map((t: any) => ({
    id: crypto.randomUUID(),
    title: t.title,
    subtasks: t.subtasks.map((s: any) => ({
      id: crypto.randomUUID(),
      title: s.title,
      status: (['Pendente', 'Em Andamento', 'Concluído'].includes(s.status) ? s.status : 'Pendente') as TaskStatus
    }))
  }));

  return {
    client: parsed.client || 'Desconhecido',
    startDate: parsed.startDate || '',
    responsible: parsed.responsible || 'Não atribuído',
    notes: parsed.notes || '',
    tasks: mappedTasks
  };
};
