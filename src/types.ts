export type Role = 'manager' | 'employee';

export interface Profile {
  id: string;
  name: string;
  role: Role;
}

export type DemandStatus = 'A Fazer' | 'Em Andamento' | 'Aguardando Revisão' | 'Concluído';
export type DemandPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export interface Comment {
  id: string;
  demand_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface ChecklistSubItem {
  id: string;
  title: string;
  completed: boolean;
  in_progress?: boolean;
  logged_hours?: number;
  observation?: string;
  completed_at?: string;
  completed_by?: string;
  hasError?: boolean;
  errorNote?: string;
  cycle?: number;
  isCorrection?: boolean;
}

export interface ChecklistItem {
  id: string;
  title: string;
  isGroup: boolean;
  subItems: ChecklistSubItem[];
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface Demand {
  id: string;
  ticket_id?: number;
  title: string;
  description: string;
  client?: string;
  requester?: string;
  request_type?: string;
  assigned_to: string;
  status: DemandStatus;
  priority: DemandPriority;
  sla: string;
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
  logged_hours?: number;
  final_observations?: string;
  completed_at?: string;
  created_at: string;
  // For UI convenience
  assignee?: Profile;
}
