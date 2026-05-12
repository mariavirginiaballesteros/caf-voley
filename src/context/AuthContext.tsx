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
    // Safety timeout: never stay loading more than 6 seconds
    const timeout = setTimeout(() => setLoading(false), 6000);

    // 1) Get current session — if token is expired, refreshSession handles it
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error || !session?.user) {
        setSession(null);
        setUser(null);
        setLoading(false);
        clearTimeout(timeout);
        return;
      }
      // Check if access token is still valid (not expired)
      const expiresAt = session.expires_at ?? 0;
      const nowSec = Math.floor(Date.now() / 1000);
      if (expiresAt > 0 && expiresAt < nowSec) {
        // Token expired — try to refresh
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr || !refreshed.session) {
          await supabase.auth.signOut({ scope: 'local' });
          setSession(null);
          setUser(null);
          setLoading(false);
          clearTimeout(timeout);
          window.location.href = '/login';
          return;
        }
        setSession(refreshed.session);
        setUser(refreshed.session.user);
        fetchRole(refreshed.session.user.id).then(() => clearTimeout(timeout));
        return;
      }
      setSession(session);
      setUser(session.user);
      fetchRole(session.user.id).then(() => clearTimeout(timeout));
    });

    // 2) Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(session);
        setUser(session?.user ?? null);
        setRecovering(true);
        setLoading(false);
        clearTimeout(timeout);
        return;
      }
      if (event === 'USER_UPDATED') {
        setRecovering(false);
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) await fetchRole(session.user.id);
        clearTimeout(timeout);
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        clearTimeout(timeout);
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
      if (!error && data?.role) {
        setRole(data.role as Role);
      } else {
        // Profile exists but no role — default to player
        setRole('player');
      }
    } catch {
      setRole('player');
    } finally {
      setLoading(false);
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