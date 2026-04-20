import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, Calendar, AlertTriangle, Copy, Check, X, Clock, FileSpreadsheet, User, Upload, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { getLocalDateString } from '../utils';
import * as XLSX from 'xlsx';

interface UnifiedTimeEntry {
  id: string;
  type: 'demand' | 'manual';
  devName: string;
  date: string;
  client: string;
  activity: string;
  status: string;
  hours: string;
  createdAt: string;
  rawDate: Date;
  demandId?: string;
  groupId?: string;
  subItemId?: string;
}

const sqlScript = `
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL,
  client TEXT,
  activity TEXT NOT NULL,
  status TEXT DEFAULT 'Concluído',
  hours TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all time entries" ON time_entries FOR SELECT USING (true);
CREATE POLICY "Users can insert their own time entries" ON time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own time entries" ON time_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own time entries" ON time_entries FOR DELETE USING (auth.uid() = user_id);
`;

const formatHours = (decimalHours: number) => {
  if (!decimalHours) return '00:00';
  const hrs = Math.floor(decimalHours);
  const mins = Math.round((decimalHours - hrs) * 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export default function Timesheet() {
  const { user, profile } = useAuth();
  const isManager = profile?.role === 'manager';
  const [entries, setEntries] = useState<UnifiedTimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDev, setSelectedDev] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [appliedFilters, setAppliedFilters] = useState({
    searchQuery: '',
    selectedDev: 'all',
    startDate: '',
    endDate: ''
  });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: getLocalDateString(),
    client: '',
    activity: '',
    status: 'Concluído',
    hours: ''
  });

  const [editingEntry, setEditingEntry] = useState<UnifiedTimeEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const parseHours = (timeStr: string) => {
    if (!timeStr) return 0;
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs + (mins / 60);
  };

  const handleEdit = (entry: UnifiedTimeEntry) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDelete = async (entry: UnifiedTimeEntry) => {
    if (!window.confirm('Tem certeza que deseja excluir este apontamento?')) return;
    setOpenMenuId(null);
    
    try {
      if (entry.type === 'manual') {
        const { error } = await supabase.from('time_entries').delete().eq('id', entry.id);
        if (error) throw error;
      } else if (entry.type === 'demand' && entry.demandId) {
        // Update demand checklist to remove the logged hours and mark as not completed
        const { data: demand } = await supabase.from('demands').select('checklist').eq('id', entry.demandId).single();
        if (demand && demand.checklist) {
          const newChecklist = demand.checklist.map((g: any) => {
            if (g.id === entry.groupId) {
              return {
                ...g,
                subItems: g.subItems.map((s: any) => {
                  if (s.id === entry.subItemId) {
                    return {
                      ...s,
                      completed: false,
                      logged_hours: 0,
                      completed_at: null,
                      completed_by: null
                    };
                  }
                  return s;
                })
              };
            }
            return g;
          });
          const { error } = await supabase.from('demands').update({ checklist: newChecklist }).eq('id', entry.demandId);
          if (error) throw error;
        }
      }
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Erro ao excluir apontamento.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    setIsSubmitting(true);
    try {
      if (editingEntry.type === 'manual') {
        const { error } = await supabase.from('time_entries')
          .update({
            date: editingEntry.date,
            client: editingEntry.client,
            activity: editingEntry.activity,
            status: editingEntry.status,
            hours: editingEntry.hours
          })
          .eq('id', editingEntry.id);
        if (error) throw error;
      } else if (editingEntry.type === 'demand' && editingEntry.demandId) {
        const { data: demand } = await supabase.from('demands').select('checklist').eq('id', editingEntry.demandId).single();
        if (demand && demand.checklist) {
          const newChecklist = demand.checklist.map((g: any) => {
            if (g.id === editingEntry.groupId) {
              return {
                ...g,
                subItems: g.subItems.map((s: any) => {
                  if (s.id === editingEntry.subItemId) {
                    return {
                      ...s,
                      title: editingEntry.activity, // Update the activity/title
                      logged_hours: parseHours(editingEntry.hours),
                      completed_at: new Date(editingEntry.date + 'T12:00:00Z').toISOString()
                    };
                  }
                  return s;
                })
              };
            }
            return g;
          });
          const { error } = await supabase.from('demands').update({ checklist: newChecklist }).eq('id', editingEntry.demandId);
          if (error) throw error;
        }
      }
      setIsEditModalOpen(false);
      setEditingEntry(null);
      fetchEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Erro ao salvar apontamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const [
        { data: profiles },
        { data: manualData, error: manualError },
        { data: demandsData, error: demandsError },
      ] = await Promise.all([
        supabase.from('profiles').select('id, name'),
        supabase.from('time_entries').select('*'),
        supabase.from('demands').select('id, client, title, checklist, assigned_to, created_at, completed_at'),
      ]);

      const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p.name]) || []);

      if (manualError) {
        if (manualError.code === '42P01' || manualError.message?.includes('does not exist')) {
          setNeedsSetup(true);
        } else {
          console.error('Error fetching manual entries:', manualError);
        }
      }

      if (demandsError) throw demandsError;

      const unifiedEntries: UnifiedTimeEntry[] = [];

      if (manualData) {
        manualData.forEach(entry => {
          unifiedEntries.push({
            id: entry.id,
            type: 'manual',
            devName: profileMap[entry.user_id] || 'Desconhecido',
            date: entry.date,
            client: entry.client || '-',
            activity: entry.activity,
            status: entry.status,
            hours: entry.hours,
            createdAt: entry.created_at,
            rawDate: new Date(entry.date)
          });
        });
      }

      if (demandsData) {
        demandsData.forEach(demand => {
          if (Array.isArray(demand.checklist)) {
            demand.checklist.forEach(group => {
              if (Array.isArray(group.subItems)) {
                group.subItems.forEach(subItem => {
                  if (subItem.completed) {
                    const completedAt = subItem.completed_at || demand.completed_at || demand.created_at;
                    const dateObj = new Date(completedAt);
                    const dateStr = getLocalDateString(dateObj);
                    
                    unifiedEntries.push({
                      id: subItem.id,
                      type: 'demand',
                      devName: profileMap[subItem.completed_by || demand.assigned_to] || 'Desconhecido',
                      date: dateStr,
                      client: demand.client || '-',
                      activity: `${demand.title} - ${group.title}: ${subItem.title}`,
                      status: 'Concluído',
                      hours: formatHours(subItem.logged_hours || 0),
                      createdAt: completedAt,
                      rawDate: dateObj,
                      demandId: demand.id,
                      groupId: group.id,
                      subItemId: subItem.id
                    });
                  }
                });
              }
            });
          }
        });
      }

      unifiedEntries.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
      setEntries(unifiedEntries);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 15000);

    fetchEntries().finally(() => {
      cancelled = true;
      clearTimeout(timeoutId);
    });

    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, []);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('time_entries').insert([{
        user_id: profile.id,
        date: newEntry.date,
        client: newEntry.client,
        activity: newEntry.activity,
        status: newEntry.status,
        hours: newEntry.hours
      }]);
      
      if (error) throw error;
      
      setIsModalOpen(false);
      setNewEntry({
        date: getLocalDateString(),
        client: '',
        activity: '',
        status: 'Concluído',
        hours: ''
      });
      fetchEntries();
    } catch (error) {
      console.error('Error adding entry:', error);
      alert('Erro ao adicionar apontamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const entriesToInsert = data.map((row: any) => {
          let dateStr = getLocalDateString();
          if (row.Data || row.date || row.DATA) {
            const d = row.Data || row.date || row.DATA;
            if (typeof d === 'number') {
              const date = new Date((d - (25567 + 2)) * 86400 * 1000);
              dateStr = getLocalDateString(date);
            } else if (typeof d === 'string') {
              const parts = d.split('/');
              if (parts.length === 3) {
                dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
              } else {
                dateStr = getLocalDateString(new Date(d));
              }
            }
          }

          let hoursStr = '00:00';
          const h = row.Horas || row.hours || row.HOURS;
          if (typeof h === 'number') {
            const totalMinutes = Math.round(h * 24 * 60);
            const hrs = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            hoursStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
          } else if (typeof h === 'string') {
            hoursStr = h;
          }

          return {
            user_id: user.id,
            date: dateStr,
            client: row.Cliente || row.client || row.CLIENTE || '',
            activity: row.Atividade || row.activity || row.ATIVIDADE || 'Importado via planilha',
            status: row.Status || row.status || row.STATUS || 'Concluído',
            hours: hoursStr
          };
        });

        if (entriesToInsert.length > 0) {
          const { error } = await supabase.from('time_entries').insert(entriesToInsert);
          if (error) throw error;
          alert(`${entriesToInsert.length} registros importados com sucesso!`);
          fetchEntries();
        }
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Erro ao importar planilha. Verifique o formato dos dados.');
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      searchQuery,
      selectedDev,
      startDate,
      endDate
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDev('all');
    setStartDate('');
    setEndDate('');
    setAppliedFilters({
      searchQuery: '',
      selectedDev: 'all',
      startDate: '',
      endDate: ''
    });
  };

  const filteredEntries = entries.filter(entry => {
    const { searchQuery, selectedDev, startDate, endDate } = appliedFilters;
    const matchesSearch = entry.activity.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          entry.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDev = selectedDev === 'all' || entry.devName === selectedDev;
    const matchesStartDate = !startDate || entry.date >= startDate;
    const matchesEndDate = !endDate || entry.date <= endDate;
    
    return matchesSearch && matchesDev && matchesStartDate && matchesEndDate;
  });

  const uniqueDevs = Array.from(new Set(entries.map(e => e.devName))).sort();

  // Calculate total hours
  const totalMinutes = filteredEntries.reduce((acc, entry) => {
    const [hrs, mins] = entry.hours.split(':').map(Number);
    return acc + (hrs * 60) + (mins || 0);
  }, 0);
  const totalHoursFormatted = `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;

  if (needsSetup) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-4 text-orange-400">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-xl font-bold">Configuração Necessária</h2>
          </div>
          <p className="text-zinc-300 mb-4 text-sm leading-relaxed">
            Para usar os apontamentos manuais, você precisa criar a tabela <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-400">time_entries</code> no Supabase. 
            Acesse o SQL Editor do seu projeto Supabase e execute o script abaixo:
          </p>
          <div className="bg-[#0A0A0A] p-4 rounded-xl border border-zinc-800 relative group">
            <pre className="text-xs text-zinc-300 overflow-x-auto custom-scrollbar whitespace-pre-wrap">
              {sqlScript}
            </pre>
            <button
              onClick={copyScript}
              className="absolute top-2 right-2 p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="text-xs font-medium">{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
              Já executei o script, recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shadow-sm">
            <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">Controle de Horas</h2>
        </div>
        <div className="flex items-center gap-3">
          {isManager && (
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Importar planilha"
              />
              <button className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors border border-zinc-700/50">
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Importar</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Novo Apontamento
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 bg-[#111111] p-4 rounded-xl border border-zinc-800/80">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newDev = selectedDev === profile?.name ? 'all' : (profile?.name || 'all');
                setSelectedDev(newDev);
                setAppliedFilters(prev => ({ ...prev, selectedDev: newDev }));
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                selectedDev === profile?.name
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-[#0A0A0A] text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <User className="w-4 h-4" />
              Meus Apontamentos
            </button>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar atividade ou cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="relative flex-1 min-w-[160px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <select
              value={selectedDev}
              onChange={(e) => setSelectedDev(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
            >
              <option value="all">Todos os Desenvolvedores</option>
              {uniqueDevs.map(dev => (
                <option key={dev} value={dev}>{dev}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-all"
              style={{ colorScheme: 'dark' }}
            />
            <span className="text-zinc-500 text-sm">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-all"
              style={{ colorScheme: 'dark' }}
            />
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
              onClick={handleApplyFilters}
              className="flex-1 sm:flex-none px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111111] border border-zinc-800/80 rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-[#1A1A1A] text-xs uppercase font-medium text-zinc-400 tracking-wide border-b border-zinc-800/80 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Dev</th>
                <th className="px-4 py-3 whitespace-nowrap">Data</th>
                <th className="px-4 py-3 whitespace-nowrap">Cliente</th>
                <th className="px-4 py-3">Atividade</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Horas</th>
                <th className="px-4 py-3 whitespace-nowrap text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum apontamento encontrado.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-zinc-800/20 transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-zinc-200">{entry.devName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-400">{new Date(entry.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-300">{entry.client}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      <div className="flex items-center gap-2">
                        {entry.type === 'demand' && (
                          <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                            Demanda
                          </span>
                        )}
                        <span className="line-clamp-2" title={entry.activity}>{entry.activity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-medium tracking-wide ${
                        entry.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        entry.status === 'Em execução' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-indigo-300 font-medium">
                      {entry.hours}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {(isManager || (entry.type === 'manual' && entry.devName === profile?.name)) && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === entry.id ? null : entry.id);
                            }}
                            className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuId === entry.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-[#1A1A1A] border border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(entry);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                Editar
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(entry);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!isLoading && filteredEntries.length > 0 && (
              <tfoot className="bg-[#1A1A1A] border-t border-zinc-800/80 sticky bottom-0">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right font-medium text-zinc-300">
                    Total de Horas:
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-indigo-400 font-bold text-base">
                    {totalHoursFormatted}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 shrink-0">
              <h2 className="text-xl font-semibold text-zinc-100">Novo Apontamento</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Data</label>
                  <input
                    type="date"
                    required
                    value={newEntry.date}
                    onChange={e => setNewEntry({...newEntry, date: e.target.value})}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Horas (HH:MM)</label>
                  <input
                    type="text"
                    required
                    placeholder="02:30"
                    pattern="^([0-9]{2,3}):([0-5][0-9])$"
                    title="Formato esperado: HH:MM (ex: 02:30)"
                    value={newEntry.hours}
                    onChange={e => {
                      // Allow only numbers and colon
                      const val = e.target.value.replace(/[^0-9:]/g, '');
                      setNewEntry({...newEntry, hours: val});
                    }}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Cliente</label>
                <input
                  type="text"
                  placeholder="Nome do cliente (opcional)"
                  value={newEntry.client}
                  onChange={e => setNewEntry({...newEntry, client: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Atividade</label>
                <textarea
                  required
                  placeholder="Descreva a atividade realizada..."
                  value={newEntry.activity}
                  onChange={e => setNewEntry({...newEntry, activity: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Status</label>
                <select
                  value={newEntry.status}
                  onChange={e => setNewEntry({...newEntry, status: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="Concluído">Concluído</option>
                  <option value="Em execução">Em execução</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Salvar Apontamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {isEditModalOpen && editingEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 shrink-0">
              <h2 className="text-xl font-semibold text-zinc-100">Editar Apontamento</h2>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEntry(null);
                }}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Data</label>
                  <input
                    type="date"
                    required
                    value={editingEntry.date}
                    onChange={e => setEditingEntry({...editingEntry, date: e.target.value})}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Horas (HH:MM)</label>
                  <input
                    type="text"
                    required
                    placeholder="02:30"
                    pattern="^([0-9]{2,3}):([0-5][0-9])$"
                    title="Formato esperado: HH:MM (ex: 02:30)"
                    value={editingEntry.hours}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9:]/g, '');
                      setEditingEntry({...editingEntry, hours: val});
                    }}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Cliente</label>
                <input
                  type="text"
                  placeholder="Nome do cliente (opcional)"
                  value={editingEntry.client}
                  onChange={e => setEditingEntry({...editingEntry, client: e.target.value})}
                  disabled={editingEntry.type === 'demand'}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Atividade</label>
                <textarea
                  required
                  placeholder="Descreva a atividade realizada..."
                  value={editingEntry.activity}
                  onChange={e => setEditingEntry({...editingEntry, activity: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[100px] resize-none"
                />
                {editingEntry.type === 'demand' && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Nota: Alterar a atividade aqui não altera o título original da demanda.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Status</label>
                <select
                  value={editingEntry.status}
                  onChange={e => setEditingEntry({...editingEntry, status: e.target.value})}
                  disabled={editingEntry.type === 'demand'}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="Concluído">Concluído</option>
                  <option value="Em execução">Em execução</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingEntry(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
