import React from 'react';
import { Search, Calendar, Filter } from 'lucide-react';
import { FilterOptions, TaskStatus } from '../types';

interface FiltersProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  clients: string[];
}

export default function Filters({ filters, setFilters, clients }: FiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-zinc-500" />
        </div>
        <select
          value={filters.client}
          onChange={(e) => setFilters({ ...filters, client: e.target.value })}
          className="block w-full pl-10 pr-3 py-2 border border-zinc-800 rounded-xl leading-5 bg-[#111111] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 sm:text-sm transition-colors appearance-none"
        >
          <option value="">Todos os Clientes</option>
          {clients.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-4 w-4 text-zinc-500" />
        </div>
        <input
          type="date"
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          className="block w-full pl-10 pr-3 py-2 border border-zinc-800 rounded-xl leading-5 bg-[#111111] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 sm:text-sm transition-colors [color-scheme:dark]"
        />
      </div>

      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Filter className="h-4 w-4 text-zinc-500" />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value as TaskStatus | 'Todos' })}
          className="block w-full pl-10 pr-3 py-2 border border-zinc-800 rounded-xl leading-5 bg-[#111111] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 sm:text-sm transition-colors appearance-none"
        >
          <option value="Todos">Todos os Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Em Andamento">Em Andamento</option>
          <option value="Concluído">Concluído</option>
        </select>
      </div>
    </div>
  );
}
