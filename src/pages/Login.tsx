import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, Lock, User, AlertTriangle, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { user, profile } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatEmail = (userStr: string) => {
    if (userStr.includes('@')) return userStr;
    return `${userStr.toLowerCase().replace(/\s+/g, '')}@sistema.local`;
  };

  useEffect(() => {
    document.title = isLogin ? 'Login | Gestão & Alinhamento' : 'Cadastro | Gestão & Alinhamento';
  }, [isLogin]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const email = formatEmail(username);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: username,
              role: 'employee'
            }
          }
        });
        if (error) throw error;

        // Se criou com sucesso, tenta inserir o perfil (caso não haja trigger)
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { id: data.user.id, name: username, role: 'employee' }
            ]);
          // Ignora erro de duplicidade se a trigger já tiver criado
          if (profileError && profileError.code !== '23505') {
            console.error('Erro ao criar perfil:', profileError);
          }
        }
      }
    } catch (err: any) {
      let errorMessage = err.message || 'Erro ao processar a solicitação. Verifique os dados.';
      
      if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
        errorMessage = 'Este usuário já existe. Por favor, faça login ou escolha outro nome de usuário.';
      } else if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Usuário ou senha incorretos.';
      } else if (errorMessage.includes('Password should be at least')) {
        errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 selection:bg-indigo-500/30">
      <div className="w-full max-w-md bg-[#111111] rounded-2xl shadow-xl border border-zinc-800/80 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shadow-sm mb-4">
            {isLogin ? <LogIn className="w-8 h-8 text-indigo-400" /> : <UserPlus className="w-8 h-8 text-indigo-400" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            {isLogin ? 'Login' : 'Cadastro'}
          </h1>
          <p className="text-zinc-500 mt-2 text-sm text-center">
            {isLogin 
              ? 'Faça login para acessar suas demandas e preencher seu alinhamento diário.'
              : 'Crie sua conta para começar a usar o sistema.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {user && !profile && !isLoading && (
          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg flex flex-col items-center text-center">
            <AlertTriangle className="w-6 h-6 text-orange-400 mb-2" />
            <p className="text-orange-400 text-sm font-medium">Conta sem perfil configurado</p>
            <p className="text-orange-300/80 text-xs mt-1">
              Você está logado, mas não encontramos o seu perfil na tabela "profiles". 
              Por favor, verifique se a tabela existe e se há um registro com o seu ID.
            </p>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="mt-3 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-md transition-colors"
            >
              Sair e tentar novamente
            </button>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Usuário
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-zinc-500" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="block w-full pl-10 pr-3 py-2.5 border border-zinc-800 rounded-xl leading-5 bg-[#161616] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-colors"
                placeholder="Seu nome ou email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-zinc-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="block w-full pl-10 pr-3 py-2.5 border border-zinc-800 rounded-xl leading-5 bg-[#161616] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-[#111111] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              isLogin ? 'Entrar' : 'Criar Conta'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Criar agora' : 'Já tem uma conta? Fazer login'}
          </button>
        </div>
      </div>
    </div>
  );
}
