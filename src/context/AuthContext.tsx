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

// Extract role from JWT metadata (instant, no DB query)
const roleFromMeta = (session: Session | null): Role => {
  const r = session?.user?.user_metadata?.role;
  if (r === 'admin' || r === 'dt' || r === 'player') return r;
  return null;
};

const ROLE_CACHE = (uid: string) => `caf_role_${uid}`;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  const applySession = (s: Session | null) => {
    setSession(s);
    setUser(s?.user ?? null);

    if (!s?.user) { setRole(null); return; }

    // 1. JWT metadata — instant, zero network
    const metaRole = roleFromMeta(s);
    if (metaRole) { setRole(metaRole); return; }

    // 2. localStorage cache — also instant
    const cached = localStorage.getItem(ROLE_CACHE(s.user.id)) as Role | null;
    if (cached) setRole(cached);

    // 3. DB query in background (updates cache for next time)
    fetchRoleFromDB(s.user.id);
  };

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 2000);

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error || !session?.user) {
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
          setLoading(false);
          clearTimeout(timeout);
          return;
        }
        applySession(refreshed.session);
        setLoading(false);
        clearTimeout(timeout);
        return;
      }

      applySession(session);
      setLoading(false);
      clearTimeout(timeout);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
        applySession(session);
        setLoading(false);
      }
      if (event === 'SIGNED_OUT') {
        Object.keys(localStorage)
          .filter(k => k.startsWith('caf_role_'))
          .forEach(k => localStorage.removeItem(k));
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const fetchRoleFromDB = async (userId: string, attempt = 0) => {
    try {
      const { data, error } = await supabase
        .from('profiles').select('role').eq('id', userId).single();
      if (!error && data?.role) {
        const r = data.role as Role;
        setRole(r);
        if (r) localStorage.setItem(ROLE_CACHE(userId), r);
      } else if (attempt < 2) {
        setTimeout(() => fetchRoleFromDB(userId, attempt + 1), 3000);
      }
    } catch {
      if (attempt < 2) setTimeout(() => fetchRoleFromDB(userId, attempt + 1), 3000);
    }
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, recovering, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
