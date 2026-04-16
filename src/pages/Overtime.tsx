import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Search, Filter, Calendar, X, Clock, User, MoreVertical, Edit2, Trash2, Plus, Upload } from 'lucide-react';
import { getLocalDateString } from '../utils';
import * as XLSX from 'xlsx';

interface OvertimeEntry {
  id: string;
  user_id: string;
  devName: string;
  date: string;
  client: string;
  reason: string;
  type: string;
  hours: string;
  observation: string;
  created_at: string;
  isNoOverride?: boolean;
  isPaid?: boolean;
  paidAt?: string;
}

const formatMinutes = (totalMinutes: number) => {
  const isNegative = totalMinutes < 0;
  const absMinutes = Math.abs(totalMinutes);
  const hrs = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  return `${isNegative ? '-' : ''}${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export default function Overtime() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDev, setSelectedDev] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  
  const [appliedFilters, setAppliedFilters] = useState({
    searchQuery: '',
    selectedDev: 'all',
    startDate: '',
    endDate: '',
    status: 'all' as 'all' | 'paid' | 'pending'
  });

  const [activeTab, setActiveTab] = useState<'registros' | 'pagamentos'>('registros');
  const [paymentStartDate, setPaymentStartDate] = useState(() => {
    const d = new Date();
    if (d.getDate() <= 15) {
      const prevMonth = new Date(d.getFullYear(), d.getMonth() - 1, 16);
      return getLocalDateString(prevMonth);
    } else {
      const currMonth = new Date(d.getFullYear(), d.getMonth(), 16);
      return getLocalDateString(currMonth);
    }
  });
  const [paymentEndDate, setPaymentEndDate] = useState(() => {
    const d = new Date();
    if (d.getDate() <= 15) {
      const currMonth = new Date(d.getFullYear(), d.getMonth(), 15);
      return getLocalDateString(currMonth);
    } else {
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 15);
      return getLocalDateString(nextMonth);
    }
  });
  const [editingEntry, setEditingEntry] = useState<OvertimeEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [newEntry, setNewEntry] = useState({
    date: getLocalDateString(),
    client: '',
    reason: '',
    type: 'Hora Extra (Dia Útil)',
    hours: '',
    observation: ''
  });

  const [confirmPayDev, setConfirmPayDev] = useState<{ userId: string, pendingEntries: OvertimeEntry[] } | null>(null);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<OvertimeEntry | null>(null);

  const handleEdit = (entry: OvertimeEntry) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDelete = async (entry: OvertimeEntry) => {
    setConfirmDeleteEntry(entry);
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteEntry) return;
    try {
      setIsSubmitting(true);
      if (confirmDeleteEntry.id.startsWith('auto-')) {
        const { error } = await supabase.from('overtime_entries').insert([{
          user_id: confirmDeleteEntry.user_id,
          date: confirmDeleteEntry.date,
          client: confirmDeleteEntry.client,
          reason: confirmDeleteEntry.reason,
          type: confirmDeleteEntry.type,
          hours: '00:00',
          observation: 'Excluído manualmente'
        }]);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('overtime_entries')
          .update({ hours: '00:00', observation: 'Excluído manualmente' })
          .eq('id', confirmDeleteEntry.id)
          .select();
          
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Sem permissão para excluir ou registro não encontrado no banco de dados.');
        }
      }
      await fetchEntries();
      setConfirmDeleteEntry(null);
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      alert('Erro ao excluir hora extra: ' + (error.message || JSON.stringify(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    setIsSubmitting(true);
    try {
      const prefix = editingEntry.isNoOverride ? '[NO_OVERRIDE] ' : '';
      const paymentTag = editingEntry.isPaid ? `[PAGO:${editingEntry.paidAt}] ` : '';
      const fullObservation = (prefix + paymentTag + (editingEntry.observation || '')).trim();

      if (editingEntry.id.startsWith('auto-')) {
        const { error } = await supabase.from('overtime_entries').insert([{
          user_id: editingEntry.user_id,
          date: editingEntry.date,
          client: editingEntry.client,
          reason: editingEntry.reason,
          type: editingEntry.type,
          hours: editingEntry.hours,
          observation: fullObservation
        }]);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('overtime_entries')
          .update({
            client: editingEntry.client,
            reason: editingEntry.reason,
            type: editingEntry.type,
            hours: editingEntry.hours,
            observation: fullObservation
          })
          .eq('id', editingEntry.id)
          .select();
          
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Sem permissão para editar ou registro não encontrado no banco de dados.');
        }
      }
      setIsEditModalOpen(false);
      setEditingEntry(null);
      fetchEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Erro ao salvar hora extra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('overtime_entries').insert([{
        user_id: user.id,
        date: newEntry.date,
        client: newEntry.client,
        reason: newEntry.reason,
        type: newEntry.type,
        hours: newEntry.hours,
        observation: '[NO_OVERRIDE]' + (newEntry.observation ? ' ' + newEntry.observation : '')
      }]);

      if (error) throw error;

      setIsModalOpen(false);
      setNewEntry({
        date: getLocalDateString(),
        client: '',
        reason: '',
        type: 'Hora Extra (Dia Útil)',
        hours: '',
        observation: ''
      });
      fetchEntries();
    } catch (error) {
      console.error('Error adding entry:', error);
      alert('Erro ao adicionar hora extra.');
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
            reason: row.Motivo || row.reason || row.MOTIVO || 'Importado via planilha',
            type: row.Tipo || row.type || row.TIPO || 'Hora Extra (Dia Útil)',
            hours: hoursStr,
            observation: '[NO_OVERRIDE]' + (row.Observacao || row.observation || row.OBSERVACAO ? ' ' + (row.Observacao || row.observation || row.OBSERVACAO) : '')
          };
        });

        const { error } = await supabase.from('overtime_entries').insert(entriesToInsert);
        if (error) throw error;

        alert('Planilha importada com sucesso!');
        fetchEntries();
      } catch (error) {
        console.error('Error importing spreadsheet:', error);
        alert('Erro ao importar planilha. Verifique o formato do arquivo.');
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset file input
    e.target.value = '';
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
      const { data: profiles } = await supabase.from('profiles').select('id, name');
      const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p.name]) || []);

      // Fetch regular time entries and demands for auto-calculation
      const { data: timeEntries } = await supabase.from('time_entries').select('*');
      const { data: demandsData } = await supabase.from('demands').select('id, client, title, checklist, completed_at, created_at, assigned_to');

      type TimeEvent = {
        userId: string;
        date: string;
        timestamp: number;
        minutes: number;
        activity: string;
        client: string;
      };
      
      const events: TimeEvent[] = [];

      // Process time_entries
      (timeEntries || []).forEach(entry => {
        if (!entry.user_id || !entry.date || !entry.hours) return;
        const [hrs, mins] = entry.hours.split(':').map(Number);
        const totalMins = (hrs * 60) + (mins || 0);
        
        events.push({
          userId: entry.user_id,
          date: entry.date,
          timestamp: new Date(entry.created_at || entry.date).getTime(),
          minutes: totalMins,
          activity: entry.activity || 'Atividade manual',
          client: entry.client || ''
        });
      });

      // Process demands
      (demandsData || []).forEach(demand => {
        if (!demand.checklist || !Array.isArray(demand.checklist)) return;
        
        demand.checklist.forEach((group: any) => {
          if (!group.subItems || !Array.isArray(group.subItems)) return;
          
          group.subItems.forEach((item: any) => {
            if (item.completed && item.logged_hours) {
              const completedAt = item.completed_at || demand.completed_at || demand.created_at;
              if (!completedAt) return;
              
              const dateObj = new Date(completedAt);
              const date = getLocalDateString(dateObj);

              const userId = item.completed_by || demand.assigned_to || 'unknown';
              const totalMins = Math.round(Number(item.logged_hours) * 60);

              events.push({
                userId,
                date,
                timestamp: dateObj.getTime(),
                minutes: totalMins,
                activity: `${demand.title} - ${group.title}: ${item.title}`,
                client: demand.client || ''
              });
            }
          });
        });
      });

      // Sort events chronologically
      events.sort((a, b) => a.timestamp - b.timestamp);

      // Accumulate
      const dailyTotals: Record<string, Record<string, { 
        minutes: number, 
        clients: Set<string>, 
        thresholdActivity: string | null 
      }>> = {};

      events.forEach(ev => {
        if (!dailyTotals[ev.userId]) dailyTotals[ev.userId] = {};
        if (!dailyTotals[ev.userId][ev.date]) {
          dailyTotals[ev.userId][ev.date] = { minutes: 0, clients: new Set(), thresholdActivity: null };
        }

        const dayData = dailyTotals[ev.userId][ev.date];
        const previousMinutes = dayData.minutes;
        dayData.minutes += ev.minutes;
        if (ev.client) dayData.clients.add(ev.client);

        const d = new Date(ev.date + 'T12:00:00Z');
        const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
        const threshold = isWeekend ? 0 : 480;

        if (previousMinutes <= threshold && dayData.minutes > threshold) {
          dayData.thresholdActivity = ev.activity;
        } else if (isWeekend && !dayData.thresholdActivity) {
          dayData.thresholdActivity = ev.activity;
        }
      });

      // Fetch manual/edited overtime entries
      const { data: manualEntries, error: manualError } = await supabase.from('overtime_entries').select('*');
      if (manualError) {
        console.error('Error fetching manual entries:', manualError);
      }
      
      const manualEntriesByDate: Record<string, any[]> = {};
      (manualEntries || []).forEach(entry => {
        const key = `${entry.user_id}-${entry.date}`;
        if (!manualEntriesByDate[key]) manualEntriesByDate[key] = [];
        manualEntriesByDate[key].push(entry);
      });

      // Calculate automatic overtime
      const autoEntries: OvertimeEntry[] = [];
      
      for (const userId in dailyTotals) {
        for (const dateStr in dailyTotals[userId]) {
          const data = dailyTotals[userId][dateStr];
          
          // Check if weekend
          const d = new Date(dateStr + 'T12:00:00Z');
          const dayOfWeek = d.getUTCDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday

          let extraMinutes = 0;
          let type = 'Hora Extra (Dia Útil)';

          if (isWeekend) {
            extraMinutes = data.minutes; // All hours are overtime
            type = 'Hora Extra (Fim de Semana)';
          } else if (data.minutes > 480) {
            extraMinutes = data.minutes - 480; // Only hours above 8
          }

          if (extraMinutes > 0) {
            const extraHrs = Math.floor(extraMinutes / 60);
            const extraMins = extraMinutes % 60;
            const hoursStr = `${extraHrs.toString().padStart(2, '0')}:${extraMins.toString().padStart(2, '0')}`;
            
            autoEntries.push({
              id: `auto-${userId}-${dateStr}`,
              user_id: userId,
              devName: profileMap[userId] || 'Usuário Desconhecido',
              date: dateStr,
              client: Array.from(data.clients).join(', ') || '-',
              reason: data.thresholdActivity || 'Atividade não identificada',
              type: type,
              hours: hoursStr,
              observation: '',
              created_at: new Date().toISOString()
            });
          }
        }
      }

      const finalEntries: OvertimeEntry[] = [];

      // Add manual entries (that are not deleted)
      Object.values(manualEntriesByDate).forEach(entries => {
        entries.forEach(entry => {
          if (entry.hours !== '00:00') {
            let obs = entry.observation || '';
            let isNoOverride = false;
            let isPaid = false;
            let paidAt = '';

            if (obs.startsWith('[NO_OVERRIDE]')) {
              isNoOverride = true;
              obs = obs.replace('[NO_OVERRIDE]', '').trim();
            }

            const paidMatch = obs.match(/\[PAGO:(.*?)\]/);
            if (paidMatch) {
              isPaid = true;
              paidAt = paidMatch[1];
              obs = obs.replace(paidMatch[0], '').trim();
            }

            finalEntries.push({
              id: entry.id,
              user_id: entry.user_id,
              devName: profileMap[entry.user_id] || 'Desconhecido',
              date: entry.date,
              client: entry.client || '-',
              reason: entry.reason,
              type: entry.type,
              hours: entry.hours,
              observation: obs,
              created_at: entry.created_at,
              isNoOverride,
              isPaid,
              paidAt
            });
          }
        });
      });

      // Add auto entries that don't have a manual override
      autoEntries.forEach(auto => {
        const key = `${auto.user_id}-${auto.date}`;
        const manualForDay = manualEntriesByDate[key] || [];
        
        // Hide auto entry if there is ANY manual entry that is an override (i.e. doesn't have [NO_OVERRIDE])
        const hasOverride = manualForDay.some(e => !(e.observation || '').startsWith('[NO_OVERRIDE]'));
        
        if (!hasOverride) {
          finalEntries.push(auto);
        }
      });

      // Sort by date descending
      finalEntries.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setEntries(finalEntries);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleApplyFilters = () => {
    setAppliedFilters({
      searchQuery,
      selectedDev,
      startDate,
      endDate,
      status: statusFilter
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDev('all');
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setAppliedFilters({
      searchQuery: '',
      selectedDev: 'all',
      startDate: '',
      endDate: '',
      status: 'all'
    });
  };

  const filteredEntries = entries.filter(entry => {
    const { searchQuery, selectedDev, startDate, endDate, status } = appliedFilters;
    const matchesSearch = entry.reason.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          entry.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDev = selectedDev === 'all' || entry.devName === selectedDev;
    const matchesStartDate = !startDate || entry.date >= startDate;
    const matchesEndDate = !endDate || entry.date <= endDate;
    const matchesStatus = status === 'all' || 
                          (status === 'paid' && entry.isPaid) || 
                          (status === 'pending' && !entry.isPaid);
    
    return matchesSearch && matchesDev && matchesStartDate && matchesEndDate && matchesStatus;
  });

  const uniqueDevs = Array.from(new Set(entries.map(e => e.devName))).sort();

  // Calculate total hours
  const totalMinutes = filteredEntries.reduce((acc, entry) => {
    const parts = entry.hours.split(':');
    if (parts.length === 2) {
      const [hrs, mins] = parts.map(Number);
      if (!isNaN(hrs) && !isNaN(mins)) {
        const minutes = (hrs * 60) + mins;
        if (entry.type === 'Banco de Horas (Débito)') {
          return acc - minutes;
        }
        return acc + minutes;
      }
    }
    return acc;
  }, 0);
  const totalHoursFormatted = formatMinutes(totalMinutes);

  // Group entries for payment view
  const paymentEntriesByDev = React.useMemo(() => {
    const periodEntries = entries.filter(entry => {
      const matchesStart = !paymentStartDate || entry.date >= paymentStartDate;
      const matchesEnd = !paymentEndDate || entry.date <= paymentEndDate;
      return matchesStart && matchesEnd;
    });

    const grouped: Record<string, { userId: string, devName: string, totalMinutes: number, paidMinutes: number, pendingMinutes: number, pendingEntries: OvertimeEntry[] }> = {};

    periodEntries.forEach(entry => {
      if (!grouped[entry.user_id]) {
        grouped[entry.user_id] = {
          userId: entry.user_id,
          devName: entry.devName,
          totalMinutes: 0,
          paidMinutes: 0,
          pendingMinutes: 0,
          pendingEntries: []
        };
      }

      const parts = entry.hours.split(':');
      if (parts.length === 2) {
        const [hrs, mins] = parts.map(Number);
        if (!isNaN(hrs) && !isNaN(mins)) {
          let minutes = (hrs * 60) + mins;
          if (entry.type === 'Banco de Horas (Débito)') {
            minutes = -minutes;
          }
          
          grouped[entry.user_id].totalMinutes += minutes;
          if (entry.isPaid) {
            grouped[entry.user_id].paidMinutes += minutes;
          } else {
            grouped[entry.user_id].pendingMinutes += minutes;
            grouped[entry.user_id].pendingEntries.push(entry);
          }
        }
      }
    });

    return Object.values(grouped).sort((a, b) => a.devName.localeCompare(b.devName));
  }, [entries, paymentStartDate, paymentEndDate]);

  const handlePay = async (userId: string, pendingEntries: OvertimeEntry[]) => {
    setConfirmPayDev({ userId, pendingEntries });
  };

  const confirmPay = async () => {
    if (!confirmPayDev) return;
    const { pendingEntries } = confirmPayDev;

    try {
      setIsSubmitting(true);
      const today = getLocalDateString();
      const paymentTag = `[PAGO:${today}]`;

      const updates = [];
      const inserts = [];

      for (const entry of pendingEntries) {
        if (entry.id.startsWith('auto-')) {
          // Need to insert
          inserts.push({
            user_id: entry.user_id,
            date: entry.date,
            client: entry.client,
            reason: entry.reason,
            type: entry.type,
            hours: entry.hours,
            observation: `${paymentTag} ${entry.observation || ''}`.trim()
          });
        } else {
          // Need to update
          let newObs = entry.observation || '';
          if (entry.isNoOverride) {
            newObs = `[NO_OVERRIDE] ${paymentTag} ${newObs}`.trim();
          } else {
            newObs = `${paymentTag} ${newObs}`.trim();
          }
          updates.push({
            id: entry.id,
            observation: newObs
          });
        }
      }

      for (const insert of inserts) {
        const { error } = await supabase.from('overtime_entries').insert([insert]);
        if (error) throw error;
      }

      for (const update of updates) {
        const { data, error } = await supabase.from('overtime_entries')
          .update({ observation: update.observation })
          .eq('id', update.id)
          .select();
          
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Sem permissão para atualizar ou registro não encontrado no banco de dados.');
        }
      }

      await fetchEntries();
      setConfirmPayDev(null);
    } catch (error: any) {
      console.error('Error paying overtime:', error);
      alert('Erro ao registrar pagamento: ' + (error.message || JSON.stringify(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shadow-sm">
            <Clock className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">Horas Extras</h2>
        </div>
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Nova Hora Extra
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('registros')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'registros'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          Registros
        </button>
        <button
          onClick={() => setActiveTab('pagamentos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pagamentos'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          Pagamentos
        </button>
      </div>

      {activeTab === 'registros' ? (
        <>
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
                  Minhas Horas
                </button>
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar motivo ou cliente..."
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

              <div className="relative flex-1 min-w-[140px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="all">Todos os Status</option>
                  <option value="pending">Pendentes</option>
                  <option value="paid">Pagas</option>
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
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3 whitespace-nowrap">Tipo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Observação</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">Horas Extras</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center">
                        <div className="flex justify-center">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                        Nenhuma hora extra encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-4 py-3 font-medium text-zinc-200 whitespace-nowrap">
                          {entry.devName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(entry.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-800/50 text-zinc-300 text-xs font-medium border border-zinc-700/50">
                            {entry.client || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {entry.reason}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-medium border border-indigo-500/20">
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {entry.isPaid ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title={`Pago em ${new Date(entry.paidAt + 'T12:00:00Z').toLocaleDateString('pt-BR')}`}>
                              Pago
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">
                          {entry.observation || '-'}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-right font-mono font-medium ${entry.type === 'Banco de Horas (Débito)' ? 'text-red-400' : 'text-emerald-400'}`}>
                          {entry.type === 'Banco de Horas (Débito)' ? '-' : ''}{entry.hours}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredEntries.length > 0 && (
                  <tfoot className="bg-[#1A1A1A] border-t border-zinc-800/80 sticky bottom-0">
                    <tr>
                      <td colSpan={7} className="px-4 py-3 text-right font-medium text-zinc-300">
                        Total de Horas Extras:
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">
                        {totalHoursFormatted}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 bg-[#111111] rounded-xl border border-zinc-800/80 p-6 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-zinc-100">Pagamento de Horas Extras</h3>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <input
                type="date"
                value={paymentStartDate}
                onChange={(e) => setPaymentStartDate(e.target.value)}
                className="bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]"
              />
              <span className="text-zinc-500 text-sm">até</span>
              <input
                type="date"
                value={paymentEndDate}
                onChange={(e) => setPaymentEndDate(e.target.value)}
                className="bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm text-zinc-300 px-3 py-2 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentEntriesByDev.map((devData) => (
                <div key={devData.userId} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm text-indigo-300 font-bold">
                      {devData.devName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-zinc-200 font-medium">{devData.devName}</h4>
                      <p className="text-xs text-zinc-500">Resumo do Mês</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">Total de Horas:</span>
                      <span className={`font-medium font-mono ${devData.totalMinutes < 0 ? 'text-red-400' : 'text-zinc-200'}`}>
                        {formatMinutes(devData.totalMinutes)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">Horas Pagas:</span>
                      <span className={`font-medium font-mono ${devData.paidMinutes < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatMinutes(devData.paidMinutes)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-800/80">
                      <span className="text-zinc-300 font-medium">Horas Pendentes:</span>
                      <span className={`font-bold font-mono ${devData.pendingMinutes < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                        {formatMinutes(devData.pendingMinutes)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePay(devData.userId, devData.pendingEntries)}
                    disabled={devData.pendingMinutes === 0}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      devData.pendingMinutes > 0
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    {devData.pendingMinutes > 0 ? 'Pagar Pendentes' : 'Tudo Pago'}
                  </button>
                </div>
              ))}
              
              {paymentEntriesByDev.length === 0 && (
                <div className="col-span-full py-12 text-center border border-dashed border-zinc-800 rounded-xl">
                  <p className="text-zinc-500">Nenhuma hora extra registrada neste mês.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800/80 bg-[#1A1A1A]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <Edit2 className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100">Editar Hora Extra</h3>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEntry(null);
                }}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Data</label>
                  <input
                    type="date"
                    value={editingEntry.date}
                    disabled
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-sm text-zinc-500 cursor-not-allowed"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Horas</label>
                  <input
                    type="time"
                    required
                    value={editingEntry.hours}
                    onChange={(e) => setEditingEntry({ ...editingEntry, hours: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Cliente</label>
                <input
                  type="text"
                  value={editingEntry.client}
                  onChange={(e) => setEditingEntry({ ...editingEntry, client: e.target.value })}
                  placeholder="Nome do cliente"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Motivo</label>
                <input
                  type="text"
                  required
                  value={editingEntry.reason}
                  onChange={(e) => setEditingEntry({ ...editingEntry, reason: e.target.value })}
                  placeholder="Motivo da hora extra"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Tipo</label>
                <select
                  value={editingEntry.type}
                  onChange={(e) => setEditingEntry({ ...editingEntry, type: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="Hora Extra (Dia Útil)">Hora Extra (Dia Útil)</option>
                  <option value="Hora Extra (Fim de Semana)">Hora Extra (Fim de Semana)</option>
                  <option value="Horas Extras Automáticas">Horas Extras Automáticas</option>
                  <option value="Plantão">Plantão</option>
                  <option value="Sobreaviso">Sobreaviso</option>
                  <option value="Banco de Horas (Débito)">Banco de Horas (Débito)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Observação</label>
                <textarea
                  value={editingEntry.observation}
                  onChange={(e) => setEditingEntry({ ...editingEntry, observation: e.target.value })}
                  placeholder="Observações adicionais..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingEntry(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111111] rounded-2xl shadow-2xl border border-zinc-800/80 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800/80 bg-[#111111]">
              <h3 className="text-lg font-semibold text-zinc-100">Nova Hora Extra</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Data</label>
                  <input
                    type="date"
                    required
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Horas</label>
                  <input
                    type="time"
                    required
                    value={newEntry.hours}
                    onChange={(e) => setNewEntry({ ...newEntry, hours: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Cliente</label>
                <input
                  type="text"
                  value={newEntry.client}
                  onChange={(e) => setNewEntry({ ...newEntry, client: e.target.value })}
                  placeholder="Nome do cliente"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Motivo</label>
                <input
                  type="text"
                  required
                  value={newEntry.reason}
                  onChange={(e) => setNewEntry({ ...newEntry, reason: e.target.value })}
                  placeholder="Motivo da hora extra"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Tipo</label>
                <select
                  value={newEntry.type}
                  onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="Hora Extra (Dia Útil)">Hora Extra (Dia Útil)</option>
                  <option value="Hora Extra (Fim de Semana)">Hora Extra (Fim de Semana)</option>
                  <option value="Plantão">Plantão</option>
                  <option value="Sobreaviso">Sobreaviso</option>
                  <option value="Banco de Horas (Débito)">Banco de Horas (Débito)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Observação</label>
                <textarea
                  value={newEntry.observation}
                  onChange={(e) => setNewEntry({ ...newEntry, observation: e.target.value })}
                  placeholder="Observações adicionais..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Apontamento'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Pay Modal */}
      {confirmPayDev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111111] rounded-2xl shadow-2xl border border-zinc-800/80 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Confirmar Pagamento</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Deseja marcar as horas extras pendentes deste desenvolvedor como pagas?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmPayDev(null)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmPay}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Pagamento'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111111] rounded-2xl shadow-2xl border border-zinc-800/80 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Excluir Hora Extra</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Tem certeza que deseja excluir esta hora extra?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDeleteEntry(null)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Excluir'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
