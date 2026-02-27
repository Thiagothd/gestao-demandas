export type TaskStatus = 'Pendente' | 'Em Andamento' | 'Concluído';

export interface Subtask {
  id: string;
  title: string;
  status: TaskStatus;
  note?: string;
}

export interface Task {
  id: string;
  title: string;
  subtasks: Subtask[];
}

export interface Demand {
  id: string;
  client: string;
  startDate: string;
  responsible: string;
  notes: string;
  tasks: Task[];
  createdAt: string;
}

export interface FilterOptions {
  client: string;
  date: string;
  status: TaskStatus | 'Todos';
}
