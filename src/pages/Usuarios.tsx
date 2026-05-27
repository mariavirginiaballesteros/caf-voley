import React, { useEffect, useState, useCallback } from 'react';
import { supabase, Profile } from '../lib/supabase';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { User, UserPlus, X, Link2, Zap, Mail, Loader, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const ROLE_STYLES = {
  admin: 'bg-red-900/30 text-red-400',
  dt: 'bg-blue-900/30 text-blue-400',
  player: 'bg-green-900/30 text-green-400',
};
const ROLE_LABELS = { admin: 'Admin', dt: 'DT', player: 'Jugadora' };

type Player = { id: string; name: string; num: string };

type Invitation = {
  id: string;
  email: string;
  role: string;
  invited_at: string;
};

type AuthStat = {
  id: string;
  email: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  created_at: string;
};

type HistorialEntry = {
  email: string;
  role: string;
  profileId?: string;
  invitedAt?: string;
  lastSignIn?: string | null;
  totalMinutes: number;
  hasLoggedIn: boolean;
};

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtMinutes = (mins: number) => {
  if (!mins || mins < 0.5) return '< 1m';
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const Usuarios = () => {
  const [profiles, setProfiles] = useState<(Profile & { player_id?: string | null })[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'dt' | 'player'>('player');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [resending, setResending] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'usuarios' | 'historial'>('usuarios');
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [pRes, plRes] = await Promise.all([
      supabase.from('profiles').select('*').order('role'),
      supabase.from('players').select('id, name, num').order('num'),
    ]);
    if (pRes.data) setProfiles(pRes.data);
    if (plRes.data) setPlayers(plRes.data);
    setLoading(false);
  };

  const fetchHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const [invitsRes, sessionsRes] = await Promise.all([
        supabase.from('invitations').select('*').order('invited_at', { ascending: false }),
        supabase.from('session_logs').select('user_id, duration_minutes'),
      ]);

      const profileIds = profiles.map(p => p.id);
      let authStats: AuthStat[] = [];
      if (profileIds.length > 0) {
        const { data } = await supabase.rpc('get_user_auth_stats', { p_user_ids: profileIds });
        authStats = data || [];
      }
      const statsMap = Object.fromEntries(authStats.map(s => [s.id, s]));

      const totals: Record<string, number> = {};
      (sessionsRes.data || []).forEach(s => {
        totals[s.user_id] = (totals[s.user_id] || 0) + (s.duration_minutes || 0);
      });

      const byEmail = new Map<string, HistorialEntry>();

      profiles.forEach(p => {
        const stat = statsMap[p.id];
        const email = p.email || stat?.email || null;
        if (!email) return;
        byEmail.set(email.toLowerCase(), {
          email,
          role: p.role,
          profileId: p.id,
          lastSignIn: stat?.last_sign_in_at,
          totalMinutes: totals[p.id] || 0,
          hasLoggedIn: !!stat?.last_sign_in_at,
        });
      });

      (invitsRes.data || []).forEach((inv: Invitation) => {
        const key = inv.email.toLowerCase();
        if (byEmail.has(key)) {
          byEmail.get(key)!.invitedAt = inv.invited_at;
        } else {
          byEmail.set(key, {
            email: inv.email,
            role: inv.role,
            invitedAt: inv.invited_at,
            totalMinutes: 0,
            hasLoggedIn: false,
          });
        }
      });

      setHistorial(
        Array.from(byEmail.values()).sort((a, b) => {
          if (a.hasLoggedIn !== b.hasLoggedIn) return a.hasLoggedIn ? -1 : 1;
          return (b.lastSignIn || '').localeCompare(a.lastSignIn || '');
        })
      );
    } finally {
      setLoadingHistorial(false);
    }
  }, [profiles]);

  useEffect(() => {
    if (tab === 'historial') fetchHistorial();
  }, [tab, fetchHistorial]);

  const updateRole = async (id: string, newRole: 'admin' | 'dt' | 'player') => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (error) toast.error('No se pudo actualizar el rol');
    else { toast.success('Rol actualizado'); fetchAll(); }
  };

  const linkPlayer = async (profileId: string, playerId: string) => {
    const val = playerId === '' ? null : playerId;
    const { error } = await supabase.from('profiles').update({ player_id: val }).eq('id', profileId);
    if (error) toast.error('Error al vincular');
    else { toast.success(val ? 'Jugadora vinculada' : 'Vínculo removido'); fetchAll(); }
  };

  const autoMatch = async () => {
    setAutoMatching(true);
    let matched = 0;
    for (const profile of profiles) {
      if (profile.player_id || profile.role !== 'player') continue;
      const searchName = (profile.first_name || profile.email?.split('@')[0] || '').toLowerCase();
      const found = players.find(p =>
        p.name.toLowerCase().includes(searchName) || searchName.includes(p.name.toLowerCase().split(' ')[0])
      );
      if (found) {
        await supabase.from('profiles').update({ player_id: found.id }).eq('id', profile.id);
        matched++;
      }
    }
    toast.success(matched > 0 ? `${matched} jugadora${matched > 1 ? 's' : ''} vinculada${matched > 1 ? 's' : ''} automáticamente` : 'No se encontraron coincidencias automáticas');
    fetchAll();
    setAutoMatching(false);
  };

  const resendLink = async (profileId: string, email: string) => {
    setResending(prev => new Set(prev).add(profileId));
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setResending(prev => { const s = new Set(prev); s.delete(profileId); return s; });
    if (error) toast.error('No se pudo reenviar: ' + error.message);
    else toast.success(`Link reenviado a ${email}`);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    const email = inviteEmail.trim().toLowerCase();
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error('No autenticado');

      const { data: myProfile } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single();
      const invitedBy = [myProfile?.first_name, myProfile?.last_name].filter(Boolean).join(' ') || user.email || 'El equipo';

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://bvrotpmkazxhyiyohnle.supabase.co'}/functions/v1/send-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ email, role: inviteRole, invitedBy }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al enviar');

      await supabase.from('invitations').insert({ email, role: inviteRole, invited_by: user.id });
      toast.success(`Invitación enviada a ${email}`);
      setInviteEmail('');
      setShowInvite(false);
    } catch (err) {
      toast.error('No se pudo invitar: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setInviting(false);
    }
  };

  const linkedPlayerIds = new Set(profiles.map(p => p.player_id).filter(Boolean));

  return (
    <Layout>
      <header className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-black">Gestión de <span className="text-green-500">Usuarios</span></h1>
          <p className="text-gray-400">Roles, invitaciones y vinculación al plantel</p>
        </div>
        {tab === 'usuarios' && (
          <div className="flex gap-2">
            {players.length > 0 && (
              <button
                onClick={autoMatch}
                disabled={autoMatching}
                className="bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] px-3 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Zap size={14} className="text-yellow-500" />
                {autoMatching ? 'Vinculando...' : 'Auto-vincular'}
              </button>
            )}
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all"
            >
              <UserPlus size={16} /> Invitar
            </button>
          </div>
        )}
        {tab === 'historial' && (
          <button
            onClick={fetchHistorial}
            disabled={loadingHistorial}
            className="bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] px-3 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {loadingHistorial ? <Loader size={14} className="animate-spin" /> : <Clock size={14} className="text-green-500" />}
            Actualizar
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#141414] p-1 rounded-xl border border-[#333] w-fit">
        <button
          onClick={() => setTab('usuarios')}
          className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
            tab === 'usuarios' ? 'bg-green-700 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <User size={12} /> Usuarios ({profiles.length})
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
            tab === 'historial' ? 'bg-green-700 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Clock size={12} /> Historial de acceso
        </button>
      </div>

      {tab === 'usuarios' ? (
        <>
          {showInvite && (
            <form onSubmit={handleInvite} className="bg-[#141414] border border-green-800/40 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <input
                  type="email" required value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="jugadora@email.com"
                  className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rol</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                  className="bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500">
                  <option value="player">Jugadora</option>
                  <option value="dt">DT</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={inviting}
                  className="bg-green-700 hover:bg-green-600 px-4 py-2.5 rounded-lg text-xs font-black transition-all disabled:opacity-50">
                  {inviting ? 'Enviando...' : 'Enviar invitación'}
                </button>
                <button type="button" onClick={() => setShowInvite(false)}
                  className="p-2.5 rounded-lg bg-[#242424] hover:bg-[#333] transition-all">
                  <X size={16} />
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#242424] text-xs uppercase tracking-widest text-gray-400 font-bold">
                    <th className="p-4">Usuario</th>
                    <th className="p-4">Rol</th>
                    <th className="p-4">Jugadora del plantel</th>
                    <th className="p-4 text-right">Cambiar rol</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333]">
                  {profiles.map((profile) => {
                    const linked = players.find(p => p.id === profile.player_id);
                    const available = players.filter(p => !linkedPlayerIds.has(p.id) || p.id === profile.player_id);
                    return (
                      <tr key={profile.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center text-xs font-black text-gray-400">
                              {profile.email?.substring(0, 2).toUpperCase() ?? <User size={16} />}
                            </div>
                            <div>
                              <p className="font-bold text-sm">
                                {profile.first_name && profile.last_name
                                  ? `${profile.first_name} ${profile.last_name}`
                                  : profile.email ?? 'Usuario'}
                              </p>
                              {profile.email && (profile.first_name || profile.last_name) && (
                                <p className="text-xs text-gray-500">{profile.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${ROLE_STYLES[profile.role]}`}>
                            {ROLE_LABELS[profile.role]}
                          </span>
                        </td>
                        <td className="p-4">
                          {profile.role === 'player' ? (
                            <div className="flex items-center gap-2">
                              <Link2 size={14} className={linked ? 'text-green-500' : 'text-gray-600'} />
                              <select
                                value={profile.player_id || ''}
                                onChange={e => linkPlayer(profile.id, e.target.value)}
                                className="bg-[#242424] border border-[#333] text-xs rounded-lg px-2 py-1.5 outline-none focus:border-green-500 max-w-[180px]"
                              >
                                <option value="">— Sin vincular —</option>
                                {available.map(p => (
                                  <option key={p.id} value={p.id}>#{p.num} {p.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <select
                            value={profile.role}
                            onChange={e => updateRole(profile.id, e.target.value as any)}
                            className="bg-[#242424] border border-[#444] text-xs rounded-lg px-2 py-1 outline-none focus:border-green-500"
                          >
                            <option value="player">Jugadora</option>
                            <option value="dt">DT</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          {profile.email && (
                            <button
                              onClick={() => resendLink(profile.id, profile.email!)}
                              disabled={resending.has(profile.id)}
                              title="Reenviar link de acceso"
                              className="inline-flex items-center gap-1.5 bg-[#242424] hover:bg-[#333] border border-[#444] text-xs text-gray-400 hover:text-blue-400 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                            >
                              {resending.has(profile.id) ? <Loader size={12} className="animate-spin" /> : <Mail size={12} />}
                              Reenviar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Historial de acceso */
        loadingHistorial ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#141414] border border-[#333] rounded-2xl p-4">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total invitadas</p>
                <p className="text-3xl font-black">{historial.length}</p>
              </div>
              <div className="bg-[#141414] border border-green-900/40 rounded-2xl p-4">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Activas</p>
                <p className="text-3xl font-black text-green-400">{historial.filter(e => e.hasLoggedIn).length}</p>
              </div>
              <div className="bg-[#141414] border border-yellow-900/40 rounded-2xl p-4">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Pendientes</p>
                <p className="text-3xl font-black text-yellow-400">{historial.filter(e => !e.hasLoggedIn).length}</p>
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#242424] text-xs uppercase tracking-widest text-gray-400 font-bold">
                    <th className="p-4">Email</th>
                    <th className="p-4">Rol</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Invitada el</th>
                    <th className="p-4">Último acceso</th>
                    <th className="p-4 text-right">Tiempo navegando</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333]">
                  {historial.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-gray-500 text-sm">
                        No hay invitaciones registradas aún.<br />
                        <span className="text-xs text-gray-600">Las nuevas invitaciones aparecerán aquí automáticamente.</span>
                      </td>
                    </tr>
                  ) : historial.map((entry, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-xs font-black text-gray-400">
                            {entry.email.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{entry.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          ROLE_STYLES[entry.role as keyof typeof ROLE_STYLES] || 'bg-gray-800 text-gray-400'
                        }`}>
                          {ROLE_LABELS[entry.role as keyof typeof ROLE_LABELS] || entry.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {entry.hasLoggedIn ? (
                          <span className="inline-flex items-center gap-1.5 text-green-400 text-xs font-bold">
                            <CheckCircle size={12} /> Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-yellow-500 text-xs font-bold">
                            <AlertCircle size={12} /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-gray-400">{fmtDate(entry.invitedAt)}</td>
                      <td className="p-4 text-xs text-gray-400">{fmtDate(entry.lastSignIn)}</td>
                      <td className="p-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-gray-300">
                          <Clock size={11} className="text-gray-500" />
                          {entry.totalMinutes > 0 ? fmtMinutes(entry.totalMinutes) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}
    </Layout>
  );
};

export default Usuarios;
