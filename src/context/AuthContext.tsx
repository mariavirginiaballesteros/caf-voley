import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

type Role = 'admin' | 'dt' | 'player' | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: Role;
  loading: boolean;
  recovering: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    // Safety: never stay loading more than 2 seconds
    const timeout = setTimeout(() => setLoading(false), 2000);

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error || !session?.user) {
        setSession(null);
        setUser(null);
        setLoading(false);
        clearTimeout(timeout);
        return;
      }

      const expiresAt = session.expires_at ?? 0;
      const nowSec = Math.floor(Date.now() / 1000);

      if (expiresAt > 0 && expiresAt < nowSec) {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr || !refreshed.session) {
          Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
          setSession(null);
          setUser(null);
          setLoading(false);
          clearTimeout(timeout);
          return;
        }
        setSession(refreshed.session);
        setUser(refreshed.session.user);
        // Unlock UI immediately — role loads in background
        setLoading(false);
        clearTimeout(timeout);
        fetchRole(refreshed.session.user.id);
        return;
      }

      // Session valid — unlock UI immediately, don't wait for role
      setSession(session);
      setUser(session.user);
      setLoading(false);
      clearTimeout(timeout);
      fetchRole(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(session);
        setUser(session?.user ?? null);
        setRecovering(true);
        setLoading(false);
        return;
      }
      if (event === 'USER_UPDATED') {
        setRecovering(false);
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) fetchRole(session.user.id);
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      setRole(!error && data?.role ? (data.role as Role) : 'player');
    } catch {
      setRole('player');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, recovering, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
