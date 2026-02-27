import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, Plus, Download } from 'lucide-react';
import SmartPaste from './components/SmartPaste';
import Filters from './components/Filters';
import DemandCard from './components/DemandCard';
import { Demand, FilterOptions, TaskStatus } from './types';

// Mock inicial baseado no exemplo do usuário
const initialMockDemand: Demand = {
  id: 'mock-1',
  client: 'Allternativa',
  startDate: '16/02/2026',
  responsible: 'Thiago',
  notes: 'Vamos utilizar um ambiente de teste, para atualização',
  createdAt: new Date().toISOString(),
  tasks: [
    {
      id: 't1',
      title: 'Sistema como um todo, para versão mais recente',
      subtasks: [
        { id: 's1', title: 'Envio de proposta via WhatsApp', status: 'Concluído', note: 'Integração com a API oficial do WhatsApp concluída e testada.' },
        { id: 's2', title: 'Abertura de proposta, com 02 cliques', status: 'Concluído', note: 'Adicionado atalho no dashboard principal.' }
      ]
    },
    {
      id: 't2',
      title: 'VENDAS – PROPOSTA e PESQUISA DE PROPOSTA',
      subtasks: [
        { id: 's3', title: 'Criar campo: Dias de Locação', status: 'Pendente' }
      ]
    }
  ]
};

export default function App() {
  const [demands, setDemands] = useState<Demand[]>(() => {
    const saved = localStorage.getItem('@gestao-demandas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse demands from local storage', e);
      }
    }
    return [initialMockDemand];
  });

  useEffect(() => {
    localStorage.setItem('@gestao-demandas', JSON.stringify(demands));
  }, [demands]);

  const [filters, setFilters] = useState<FilterOptions>({
    client: '',
    date: '',
    status: 'Todos'
  });

  const handleDemandCreated = (newDemand: Demand) => {
    setDemands((prev) => [newDemand, ...prev]);
  };

  const handleUpdateSubtaskStatus = (demandId: string, taskId: string, subtaskId: string, newStatus: TaskStatus) => {
    setDemands((prev) => prev.map(demand => {
      if (demand.id !== demandId) return demand;
      
      return {
        ...demand,
        tasks: demand.tasks.map(task => {
          if (task.id !== taskId) return task;
          
          return {
            ...task,
            subtasks: task.subtasks.map(subtask => 
              subtask.id === subtaskId ? { ...subtask, status: newStatus } : subtask
            )
          };
        })
      };
    }));
  };

  const handleUpdateSubtaskNote = (demandId: string, taskId: string, subtaskId: string, note: string) => {
    setDemands((prev) => prev.map(demand => {
      if (demand.id !== demandId) return demand;
      
      return {
        ...demand,
        tasks: demand.tasks.map(task => {
          if (task.id !== taskId) return task;
          
          return {
            ...task,
            subtasks: task.subtasks.map(subtask => 
              subtask.id === subtaskId ? { ...subtask, note } : subtask
            )
          };
        })
      };
    }));
  };

  const handleDeleteDemand = (demandId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta demanda?')) {
      setDemands((prev) => prev.filter(d => d.id !== demandId));
    }
  };

  const handleCreateEmptyDemand = () => {
    const newDemand: Demand = {
      id: crypto.randomUUID(),
      client: 'Novo Cliente',
      startDate: new Date().toLocaleDateString('pt-BR'),
      responsible: 'Responsável',
      notes: '',
      createdAt: new Date().toISOString(),
      tasks: [
        {
          id: crypto.randomUUID(),
          title: 'Nova Tarefa',
          subtasks: [
            { id: crypto.randomUUID(), title: 'Nova subtarefa', status: 'Pendente' }
          ]
        }
      ]
    };
    setDemands((prev) => [newDemand, ...prev]);
  };

  const handleExportCSV = () => {
    const headers = ['Cliente', 'Data de Início', 'Responsável', 'Status da Demanda', 'Progresso (%)'];
    
    const rows = demands.map(demand => {
      const totalSubtasks = demand.tasks.reduce((acc, task) => acc + task.subtasks.length, 0);
      const completedSubtasks = demand.tasks.reduce((acc, task) => acc + task.subtasks.filter(s => s.status === 'Concluído').length, 0);
      const progress = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);
      const status = progress === 100 && totalSubtasks > 0 ? 'Concluída' : 'Em Andamento';
      
      return [
        `"${demand.client.replace(/"/g, '""')}"`,
        `"${demand.startDate}"`,
        `"${demand.responsible.replace(/"/g, '""')}"`,
        `"${status}"`,
        `"${progress}%"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `demandas_ti_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateDemandField = (demandId: string, field: keyof Demand, value: string) => {
    setDemands((prev) => prev.map(demand => {
      if (demand.id !== demandId) return demand;
      return { ...demand, [field]: value };
    }));
  };

  const handleUpdateTaskTitle = (demandId: string, taskId: string, title: string) => {
    setDemands((prev) => prev.map(demand => {
      if (demand.id !== demandId) return demand;
      return {
        ...demand,
        tasks: demand.tasks.map(task => 
          task.id === taskId ? { ...task, title } : task
        )
      };
    }));
  };

  const handleUpdateSubtaskTitle = (demandId: string, taskId: string, subtaskId: string, title: string) => {
    setDemands((prev) => prev.map(demand => {
      if (demand.id !== demandId) return demand;
      return {
        ...demand,
        tasks: demand.tasks.map(task => {
          if (task.id !== taskId) return task;
          return {
            ...task,
            subtasks: task.subtasks.map(subtask => 
              subtask.id === subtaskId ? { ...subtask, title } : subtask
            )
          };
        })
      };
    }));
  };

  const handleAddSubtask = (demandId: string, taskId: string) => {
    setDemands((prev) => prev.map(demand => {
      if (demand.id !== demandId) return demand;
      return {
        ...demand,
        tasks: demand.tasks.map(task => {
          if (task.id !== taskId) return task;
          return {
            ...task,
            subtasks: [...task.subtasks, { id: crypto.randomUUID(), title: 'Nova subtarefa', status: 'Pendente' }]
          };
        })
      };
    }));
  };

  const clients = useMemo(() => {
    const uniqueClients = new Set(demands.map(d => d.client));
    return Array.from(uniqueClients);
  }, [demands]);

  const filteredDemands = useMemo(() => {
    return demands.map(demand => {
      // Filter by client
      if (filters.client && demand.client !== filters.client) return null;
      
      // Filter by date (simple string match for now, could be improved with date parsing)
      if (filters.date) {
        // Convert YYYY-MM-DD from input to DD/MM/YYYY for comparison
        const [year, month, day] = filters.date.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        if (demand.startDate !== formattedDate) return null;
      }

      // Filter tasks/subtasks by status
      if (filters.status !== 'Todos') {
        const filteredTasks = demand.tasks.map(task => ({
          ...task,
          subtasks: task.subtasks.filter(subtask => subtask.status === filters.status)
        })).filter(task => task.subtasks.length > 0);

        if (filteredTasks.length === 0) return null;
        
        return { ...demand, tasks: filteredTasks };
      }

      return demand;
    }).filter(Boolean) as Demand[];
  }, [demands, filters]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans text-zinc-100 selection:bg-indigo-500/30">
      {/* Header */}
      <header className="bg-[#0A0A0A]/80 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shadow-sm">
              <LayoutDashboard className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">
              Gestão de Demandas TI
            </h1>
          </div>
          
          <div className="hidden sm:block">
            <Filters filters={filters} setFilters={setFilters} clients={clients} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:hidden mb-6">
          <Filters filters={filters} setFilters={setFilters} clients={clients} />
        </div>

        <SmartPaste onDemandCreated={handleDemandCreated} />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-12">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Painel de Visualização</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 text-sm font-semibold rounded-full hidden sm:inline-block">
              {filteredDemands.length} {filteredDemands.length === 1 ? 'Demanda' : 'Demandas'}
            </span>
            <button 
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl text-sm font-medium transition-colors border border-zinc-700 shadow-sm flex-1 sm:flex-none"
              title="Exportar Dados (CSV)"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
            <button 
              onClick={handleCreateEmptyDemand}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-indigo-500/20 flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Demanda</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {filteredDemands.length > 0 ? (
            filteredDemands.map(demand => (
              <DemandCard 
                key={demand.id} 
                demand={demand} 
                onUpdateSubtaskStatus={handleUpdateSubtaskStatus} 
                onUpdateSubtaskNote={handleUpdateSubtaskNote}
                onDelete={handleDeleteDemand}
                onUpdateField={handleUpdateDemandField}
                onUpdateTaskTitle={handleUpdateTaskTitle}
                onUpdateSubtaskTitle={handleUpdateSubtaskTitle}
                onAddSubtask={handleAddSubtask}
              />
            ))
          ) : (
            <div className="text-center py-16 bg-[#111111] rounded-2xl border border-dashed border-zinc-800">
              <p className="text-zinc-500 font-medium">Nenhuma demanda encontrada com os filtros atuais.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
