import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Demand, DemandStatus } from '../types';
import DemandModal from '../components/DemandModal';
import DemandDetailsModal from '../components/DemandDetailsModal';
import { Plus, Calendar, Search, Filter, CheckSquare, Building2, User, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const COLUMNS: DemandStatus[] = ['A Fazer', 'Em Andamento', 'Concluído'];

const Avatar = ({ name }: { name?: string }) => {
  if (!name) return <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-medium tracking-wide">?</div>;
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return (
    <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] text-indigo-300 font-medium" title={name}>
      {initials}
    </div>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const colors = {
    'Urgente': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'Alta': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Média': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Baixa': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  const colorClass = colors[priority as keyof typeof colors] || colors['Média'];
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${colorClass}`}>
      {priority}
    </span>
  );
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [demandToEdit, setDemandToEdit] = useState<Demand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedRequester, setSelectedRequester] = useState<string>('all');
  const [dateFilterType, setDateFilterType] = useState<string>('created_at');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    searchQuery: '',
    selectedAssignee: 'all',
    selectedClient: 'all',
    selectedRequester: 'all',
    dateFilterType: 'created_at',
    startDate: '',
    endDate: ''
  });

  const handleApplyFilters = () => {
    setAppliedFilters({
      searchQuery,
      selectedAssignee,
      selectedClient,
      selectedRequester,
      dateFilterType,
      startDate,
      endDate
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedAssignee('all');
    setSelectedClient('all');
    setSelectedRequester('all');
    setDateFilterType('created_at');
    setStartDate('');
    setEndDate('');
    setAppliedFilters({
      searchQuery: '',
      selectedAssignee: 'all',
      selectedClient: 'all',
      selectedRequester: 'all',
      dateFilterType: 'created_at',
      startDate: '',
      endDate: ''
    });
  };

  useEffect(() => {
    fetchDemands();
  }, [profile]);

  const fetchDemands = async () => {
    if (!profile) return;
    setIsLoading(true);

    let query = supabase
      .from('demands')
      .select('*, assignee:profiles!assigned_to(id, name, role)');

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching demands:', error);
    } else if (data) {
      setDemands(data as Demand[]);
    }
    setIsLoading(false);
  };

  // When a task is updated in the details modal, we want to refresh the specific demand or all demands
  const handleDemandUpdate = () => {
    fetchDemands();
  };

  useEffect(() => {
    if (selectedDemand) {
      const updated = demands.find(d => d.id === selectedDemand.id);
      if (updated) setSelectedDemand(updated);
    }
  }, [demands]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId as DemandStatus;
    
    const updateData: any = { status: newStatus };
    if (newStatus === 'Concluído') {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }

    // Optimistic UI update
    setDemands(prev => prev.map(d => d.id === draggableId ? { ...d, ...updateData } : d));

    // Supabase update
    const { error } = await supabase
      .from('demands')
      .update(updateData)
      .eq('id', draggableId);

    if (error) {
      console.error('Error updating status:', error);
      fetchDemands(); // Revert on error
    }
  };

  const handleEditDemand = () => {
    if (selectedDemand) {
      setDemandToEdit(selectedDemand);
      setIsModalOpen(true);
    }
  };

  const assignees = useMemo(() => {
    const uniqueAssignees = new Map();
    demands.forEach(d => {
      if (d.assignee) {
        uniqueAssignees.set(d.assignee.id, d.assignee);
      }
    });
    return Array.from(uniqueAssignees.values());
  }, [demands]);

  const clients = useMemo(() => {
    const uniqueClients = new Set<string>();
    demands.forEach(d => {
      if (d.client) uniqueClients.add(d.client);
    });
    return Array.from(uniqueClients).sort();
  }, [demands]);

  const requesters = useMemo(() => {
    const uniqueRequesters = new Set<string>();
    demands.forEach(d => {
      if (d.requester) uniqueRequesters.add(d.requester);
    });
    return Array.from(uniqueRequesters).sort();
  }, [demands]);

  const filteredDemands = useMemo(() => {
    const { searchQuery, selectedAssignee, selectedClient, selectedRequester, dateFilterType, startDate, endDate } = appliedFilters;

    const filtered = demands.filter(demand => {
      const matchesSearch = 
        demand.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (demand.ticket_id && `#${demand.ticket_id}`.includes(searchQuery));
      
      const matchesAssignee = selectedAssignee === 'all' || demand.assigned_to === selectedAssignee;
      const matchesClient = selectedClient === 'all' || demand.client === selectedClient;
      const matchesRequester = selectedRequester === 'all' || demand.requester === selectedRequester;
      
      let matchesDate = true;
      if (startDate || endDate) {
        let dateValue = '';
        if (dateFilterType === 'created_at') dateValue = demand.created_at;
        else if (dateFilterType === 'sla') dateValue = demand.sla;
        else if (dateFilterType === 'completed_at') dateValue = demand.completed_at || '';

        if (!dateValue) {
          matchesDate = false;
        } else {
          // Convert to YYYY-MM-DD in local time for accurate comparison
          const d = new Date(dateValue);
          const demandDateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
          
          let matchesStart = true;
          if (startDate) {
            matchesStart = demandDateStr >= startDate;
          }
          
          let matchesEnd = true;
          if (endDate) {
            matchesEnd = demandDateStr <= endDate;
          }
          
          matchesDate = matchesStart && matchesEnd;
        }
      }
      
      return matchesSearch && matchesAssignee && matchesClient && matchesRequester && matchesDate;
    });

    return filtered.sort((a, b) => {
      if (!a.sla && !b.sla) return 0;
      if (!a.sla) return 1;
      if (!b.sla) return -1;
      return new Date(a.sla).getTime() - new Date(b.sla).getTime();
    });
  }, [demands, appliedFilters]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100">Locação Web</h2>
        <button
          onClick={() => {
            setDemandToEdit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Nova Demanda
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 bg-[#111111] p-4 rounded-xl border border-zinc-800/80">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar ID/Título..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="relative flex-1 min-w-[160px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
            >
              <option value="all">Todos os Desenvolvedores</option>
              {assignees.map(assignee => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 min-w-[160px]">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
            >
              <option value="all">Todos os Clientes</option>
              {clients.map(client => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 min-w-[160px]">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <select
              value={selectedRequester}
              onChange={(e) => setSelectedRequester(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
            >
              <option value="all">Todos os Solicitantes</option>
              {requesters.map(req => (
                <option key={req} value={req}>
                  {req}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleClearFilters}
              className="flex-1 sm:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors border border-zinc-700/50 flex items-center justify-center gap-2"
              title="Limpar todos os filtros"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
            <button
              onClick={() => {
                if (profile?.id) {
                  setSelectedAssignee(profile.id);
                  setAppliedFilters(prev => ({ ...prev, selectedAssignee: profile.id }));
                }
              }}
              className="flex-1 sm:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors border border-zinc-700/50 flex items-center justify-center gap-2"
              title="Filtrar pelas minhas demandas"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Minhas Demandas</span>
              <span className="sm:hidden">Minhas</span>
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 sm:flex-none px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-[#0A0A0A] p-3 rounded-lg border border-zinc-800/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400 font-medium whitespace-nowrap">Filtrar por data:</span>
          </div>
          <select
            value={dateFilterType}
            onChange={(e) => setDateFilterType(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 bg-[#111111] border border-zinc-800 rounded-md text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-all appearance-none"
          >
            <option value="created_at">Data de Criação</option>
            <option value="sla">Prazo (SLA)</option>
            <option value="completed_at">Data de Conclusão</option>
          </select>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-[#111111] border border-zinc-800 rounded-md text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-all"
              style={{ colorScheme: 'dark' }}
            />
            <span className="text-zinc-500 text-sm">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-[#111111] border border-zinc-800 rounded-md text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-all"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs font-medium tracking-wide text-zinc-400 hover:text-zinc-200 transition-colors ml-auto sm:ml-2"
            >
              Limpar datas
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[60vh] overflow-x-auto pb-4 items-start">
          {COLUMNS.map(column => {
            const columnDemands = filteredDemands.filter(d => d.status === column);

            return (
              <div key={column} className="flex flex-col bg-[#111111] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm h-full max-h-[75vh]">
                {/* Column Header */}
                <div className="p-4 border-b border-zinc-800/80 bg-[#111111] flex items-center justify-between sticky top-0 z-10">
                  <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
                    {column === 'A Fazer' && <div className="w-2 h-2 rounded-full bg-zinc-500" />}
                    {column === 'Em Andamento' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                    {column === 'Concluído' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                    {column}
                  </h3>
                  <span className="px-2.5 py-1 bg-zinc-800/50 text-zinc-400 rounded-lg text-xs font-medium tracking-wide border border-zinc-700/50">
                    {columnDemands.length}
                  </span>
                </div>

                {/* Column Content */}
                <Droppable droppableId={column}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-4 flex-1 overflow-y-auto space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-zinc-900/50' : ''}`}
                    >
                      {isLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        columnDemands.map((demand, index) => {
                          const isOverdue = demand.sla && new Date(demand.sla).getTime() < new Date().setHours(0,0,0,0);
                          const slaColor = isOverdue && demand.status !== 'Concluído' ? 'text-red-400' : 'text-zinc-400 tracking-wide';

                          return (
                            // @ts-expect-error React 19 type incompatibility
                            <Draggable key={demand.id} draggableId={demand.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => setSelectedDemand(demand)}
                                  className={`bg-[#1A1A1A] border border-white/5 rounded-xl p-4 transition-all cursor-grab active:cursor-grabbing group ${
                                    snapshot.isDragging ? 'shadow-2xl shadow-black/80 border-indigo-500/50 rotate-2 scale-105' : 'hover:border-white/10 hover:shadow-lg hover:shadow-black/40'
                                  }`}
                                  style={{ ...provided.draggableProps.style }}
                                >
                                  <div className="flex justify-between items-start mb-3 gap-2">
                                    <div className="flex flex-col gap-1.5">
                                      {demand.ticket_id && (
                                        <span className="text-xs font-bold text-indigo-400">
                                          #{demand.ticket_id}
                                        </span>
                                      )}
                                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 tracking-wide border border-zinc-700/50 truncate max-w-[120px]">
                                        {demand.client || 'Sem cliente'}
                                      </span>
                                      {demand.assignee?.name && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 w-fit truncate max-w-[120px]">
                                          {demand.assignee.name}
                                        </span>
                                      )}
                                    </div>
                                    <PriorityBadge priority={demand.priority} />
                                  </div>
                                  
                                  <h4 className="text-sm font-medium text-zinc-100 mb-4 leading-snug line-clamp-2 group-hover:text-indigo-300 transition-colors">
                                    {demand.title}
                                  </h4>
                                  
                                  <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-3">
                                      <div className={`flex items-center gap-1.5 text-xs font-medium tracking-wide ${slaColor}`}>
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{demand.sla && !isNaN(new Date(demand.sla).getTime()) ? new Date(demand.sla).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Sem prazo'}</span>
                                      </div>
                                      {demand.checklist && demand.checklist.length > 0 && (
                                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium tracking-wide">
                                          <CheckSquare className="w-3.5 h-3.5" />
                                          <span>{demand.checklist.reduce((acc, g) => acc + g.subItems.filter(s => s.completed).length, 0)}/{demand.checklist.reduce((acc, g) => acc + g.subItems.length, 0)}</span>
                                        </div>
                                      )}
                                    </div>
                                    <Avatar name={demand.assignee?.name} />
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <DemandModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setDemandToEdit(null);
        }} 
        onSuccess={fetchDemands}
        demandToEdit={demandToEdit}
      />

      <DemandDetailsModal
        isOpen={!!selectedDemand}
        onClose={() => setSelectedDemand(null)}
        demand={selectedDemand}
        onUpdate={handleDemandUpdate}
        onEdit={handleEditDemand}
      />
    </div>
  );
}
