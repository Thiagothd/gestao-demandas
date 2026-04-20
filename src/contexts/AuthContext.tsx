import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  const loadedUserIdRef = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000)
      );
      const query = supabase.from('profiles').select('*').eq('id', userId).single();
      const { data, error } = await Promise.race([query, timeout]) as any;

      if (error) throw error;
      if (mountedRef.current) {
        loadedUserIdRef.current = userId;
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      if (mountedRef.current) setProfile(null);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const timeoutId = setTimeout(() => {
      if (mountedRef.current) setIsLoading(false);
    }, 8000);

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
      } finally {
        clearTimeout(timeoutId);
        if (mountedRef.current) setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mountedRef.current) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Perfil já carregado para este usuário — ignora (ex: TOKEN_REFRESHED)
        if (loadedUserIdRef.current === session.user.id) return;
        await fetchProfile(session.user.id);
      } else {
        loadedUserIdRef.current = null;
        setProfile(null);
      }
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    loadedUserIdRef.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
