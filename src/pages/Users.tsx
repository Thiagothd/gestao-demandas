import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Key, Shield, Trash2, X, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Profile } from '../types';

type Toast = { type: 'success' | 'error'; message: string };

export default function UsersPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  // Modal criar usuário
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'employee' | 'manager'>('employee');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Modal alterar senha
  const [pwdTarget, setPwdTarget] = useState<Profile | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isSavingPwd, setIsSavingPwd] = useState(false);

  // Modal alterar papel
  const [roleTarget, setRoleTarget] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<'employee' | 'manager'>('employee');
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Modal confirmar exclusão
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'manager') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [profile]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (type: 'success' | 'error', message: string) => setToast({ type, message });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) throw error;
      setUsers(data as Profile[]);
    } catch (err: any) {
      showToast('error', 'Erro ao carregar usuários.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPassword.trim()) return;
    setIsCreating(true);
    try {
      const { error } = await supabase.rpc('create_system_user', {
        p_name: newName.trim(),
        p_password: newPassword,
        p_role: newRole,
      });
      if (error) throw error;
      showToast('success', `Usuário "${newName}" criado com sucesso!`);
      setShowCreate(false);
      setNewName('');
      setNewPassword('');
      setNewRole('employee');
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao criar usuário.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdTarget || !newPwd.trim()) return;
    setIsSavingPwd(true);
    try {
      const { error } = await supabase.rpc('change_user_password', {
        p_user_id: pwdTarget.id,
        p_new_password: newPwd,
      });
      if (error) throw error;
      showToast('success', `Senha de "${pwdTarget.name}" alterada com sucesso!`);
      setPwdTarget(null);
      setNewPwd('');
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao alterar senha.');
    } finally {
      setIsSavingPwd(false);
    }
  };

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTarget) return;
    if (roleTarget.id === profile?.id) {
      showToast('error', 'Você não pode alterar seu próprio cargo.');
      setRoleTarget(null);
      return;
    }
    setIsSavingRole(true);
    try {
      const { error } = await supabase.rpc('change_user_role', {
        p_user_id: roleTarget.id,
        p_new_role: selectedRole,
      });
      if (error) throw error;
      showToast('success', `Papel de "${roleTarget.name}" atualizado!`);
      setRoleTarget(null);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao alterar papel.');
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === profile?.id) {
      showToast('error', 'Você não pode excluir sua própria conta.');
      setDeleteTarget(null);
      return;
    }
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_system_user', { p_user_id: deleteTarget.id });
      if (error) throw error;
      showToast('success', `Usuário "${deleteTarget.name}" excluído.`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao excluir usuário.');
    } finally {
      setIsDeleting(false);
    }
  };

  const managers = users.filter(u => u.role === 'manager');
  const employees = users.filter(u => u.role === 'employee');

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all ${
          toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Gerenciar Usuários</h1>
            <p className="text-xs text-zinc-500">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gerentes */}
          <div className="bg-[#111111] border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Gerentes</h2>
              <span className="ml-auto text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{managers.length}</span>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {managers.map(u => (
                <UserRow
                  key={u.id}
                  user={u}
                  onChangePassword={() => { setPwdTarget(u); setNewPwd(''); setShowPwd(false); }}
                  onChangeRole={() => { setRoleTarget(u); setSelectedRole(u.role as 'employee' | 'manager'); }}
                  onDelete={() => setDeleteTarget(u)}
                />
              ))}
              {managers.length === 0 && (
                <p className="text-center text-zinc-600 text-sm py-8">Nenhum gerente cadastrado</p>
              )}
            </div>
          </div>

          {/* Funcionários */}
          <div className="bg-[#111111] border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Funcionários</h2>
              <span className="ml-auto text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{employees.length}</span>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {employees.map(u => (
                <UserRow
                  key={u.id}
                  user={u}
                  onChangePassword={() => { setPwdTarget(u); setNewPwd(''); setShowPwd(false); }}
                  onChangeRole={() => { setRoleTarget(u); setSelectedRole(u.role as 'employee' | 'manager'); }}
                  onDelete={() => setDeleteTarget(u)}
                />
              ))}
              {employees.length === 0 && (
                <p className="text-center text-zinc-600 text-sm py-8">Nenhum funcionário cadastrado</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Criar usuário */}
      {showCreate && (
        <Modal title="Novo Usuário" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Nome</label>
              <input
                required
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {newName && (
                <p className="text-xs text-zinc-500">
                  Login: <span className="text-zinc-400">{newName.toLowerCase().replace(/\s+/g, '')}</span>
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Senha</label>
              <div className="relative">
                <input
                  required
                  minLength={6}
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-2.5 pr-10 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button type="button" onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Papel</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setNewRole('employee')}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${newRole === 'employee' ? 'bg-zinc-700 border-indigo-500 text-zinc-100' : 'bg-[#0A0A0A] border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                  Funcionário
                </button>
                <button type="button" onClick={() => setNewRole('manager')}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${newRole === 'manager' ? 'bg-zinc-700 border-indigo-500 text-zinc-100' : 'bg-[#0A0A0A] border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                  Gerente
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={isCreating}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isCreating ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                {isCreating ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Alterar senha */}
      {pwdTarget && (
        <Modal title={`Alterar Senha — ${pwdTarget.name}`} onClose={() => setPwdTarget(null)}>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Nova Senha</label>
              <div className="relative">
                <input
                  required
                  minLength={6}
                  type={showPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-2.5 pr-10 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setPwdTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={isSavingPwd}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isSavingPwd ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Key className="w-4 h-4" />}
                {isSavingPwd ? 'Salvando...' : 'Salvar Senha'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Alterar papel */}
      {roleTarget && (
        <Modal title={`Alterar Papel — ${roleTarget.name}`} onClose={() => setRoleTarget(null)}>
          <form onSubmit={handleChangeRole} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSelectedRole('employee')}
                className={`py-3 rounded-lg text-sm font-medium border transition-colors ${selectedRole === 'employee' ? 'bg-zinc-700 border-indigo-500 text-zinc-100' : 'bg-[#0A0A0A] border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                Funcionário
              </button>
              <button type="button" onClick={() => setSelectedRole('manager')}
                className={`py-3 rounded-lg text-sm font-medium border transition-colors ${selectedRole === 'manager' ? 'bg-zinc-700 border-indigo-500 text-zinc-100' : 'bg-[#0A0A0A] border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                Gerente
              </button>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setRoleTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={isSavingRole}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isSavingRole ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Shield className="w-4 h-4" />}
                {isSavingRole ? 'Salvando...' : 'Salvar Papel'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Confirmar exclusão */}
      {deleteTarget && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              Tem certeza que deseja excluir o usuário <span className="font-semibold text-zinc-100">"{deleteTarget.name}"</span>?
              Todos os dados vinculados a ele serão desassociados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isDeleting ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function UserRow({ user, onChangePassword, onChangeRole, onDelete }: {
  user: Profile;
  onChangePassword: () => void;
  onChangeRole: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm font-semibold text-indigo-400">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">{user.name}</p>
          <p className="text-xs text-zinc-500">{user.name.toLowerCase().replace(/\s+/g, '')}@sistema.local</p>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onChangePassword} title="Alterar senha"
          className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors">
          <Key className="w-4 h-4" />
        </button>
        <button onClick={onChangeRole} title="Alterar papel"
          className="p-1.5 text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-md transition-colors">
          <Shield className="w-4 h-4" />
        </button>
        <button onClick={onDelete} title="Excluir usuário"
          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
