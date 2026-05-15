import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, LogOut, Clock, Timer, Users, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  if (!profile) return null;

  const isManager = profile.role === 'manager';

  const linkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'bg-zinc-800/80 text-zinc-100'
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
    }`;

  const mobileLinkClass = (path: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
      location.pathname === path
        ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
        : 'text-zinc-300 hover:bg-zinc-800/50 border border-transparent'
    }`;

  return (
    <header className="bg-[#0A0A0A]/80 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-30">
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand + Desktop Nav */}
        <div className="flex items-center gap-4 lg:gap-8 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="p-1.5 sm:p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shadow-sm">
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            </div>
            <h1 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-zinc-100 hidden xs:block sm:block truncate">
              <span className="hidden md:inline">Gestão de Demandas</span>
              <span className="md:hidden">Gestão</span>
            </h1>
          </div>

          {/* Desktop Nav (md+) */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className={linkClass('/')}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Meu Painel</span>
            </Link>
            <Link to="/timesheet" className={linkClass('/timesheet')}>
              <Clock className="w-4 h-4" />
              <span>Apontamentos</span>
            </Link>
            <Link to="/overtime" className={linkClass('/overtime')}>
              <Timer className="w-4 h-4" />
              <span>Horas Extras</span>
            </Link>
            {isManager && (
              <Link to="/usuarios" className={linkClass('/usuarios')}>
                <Users className="w-4 h-4" />
                <span>Usuários</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="text-right hidden lg:block">
            <p className="text-sm font-medium text-zinc-200 truncate max-w-[180px]">{profile.name}</p>
            <p className="text-[10px] font-medium tracking-wider text-zinc-400 uppercase">
              {isManager ? 'Gerente' : 'Funcionário'}
            </p>
          </div>
          <button
            onClick={signOut}
            className="hidden md:inline-flex p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-lg transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute top-0 right-0 h-full w-[85%] max-w-xs bg-[#0A0A0A] border-l border-zinc-800/80 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg shrink-0">
                  <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-100 truncate">{profile.name}</p>
                  <p className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                    {isManager ? 'Gerente' : 'Funcionário'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors shrink-0"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              <Link to="/" className={mobileLinkClass('/')}>
                <LayoutDashboard className="w-5 h-5" />
                <span>Meu Painel</span>
              </Link>
              <Link to="/timesheet" className={mobileLinkClass('/timesheet')}>
                <Clock className="w-5 h-5" />
                <span>Apontamentos</span>
              </Link>
              <Link to="/overtime" className={mobileLinkClass('/overtime')}>
                <Timer className="w-5 h-5" />
                <span>Horas Extras</span>
              </Link>
              {isManager && (
                <Link to="/usuarios" className={mobileLinkClass('/usuarios')}>
                  <Users className="w-5 h-5" />
                  <span>Usuários</span>
                </Link>
              )}
            </nav>

            <div className="p-3 border-t border-zinc-800/80">
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
