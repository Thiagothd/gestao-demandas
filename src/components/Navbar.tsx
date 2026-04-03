import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, LogOut, Clock } from 'lucide-react';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  if (!profile) return null;

  return (
    <header className="bg-[#0A0A0A]/80 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-20">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shadow-sm">
              <LayoutDashboard className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100 hidden sm:block">
              Gestão de Demandas
            </h1>
          </div>

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/'
                  ? 'bg-zinc-800/80 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Meu Painel</span>
            </Link>
            <Link
              to="/timesheet"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/timesheet'
                  ? 'bg-zinc-800/80 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Apontamentos</span>
            </Link>
            <Link
              to="/overtime"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/overtime'
                  ? 'bg-zinc-800/80 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Horas Extras</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-zinc-200">{profile.name}</p>
            <p className="text-[10px] font-medium tracking-wider text-zinc-400 uppercase">{profile.role === 'manager' ? 'Gerente' : 'Funcionário'}</p>
          </div>
          <button
            onClick={signOut}
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
