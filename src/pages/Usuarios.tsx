import React, { useEffect, useState } from 'react';
import { supabase, Profile } from '../lib/supabase';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { User, UserPlus, X, Link2, Zap, Mail, Loader } from 'lucide-react';

const ROLE_STYLES = {
  admin: 'bg-red-900/30 text-red-400',
  dt: 'bg-blue-900/30 text-blue-400',
  player: 'bg-green-900/30 text-green-400',
};
const ROLE_LABELS = { admin: 'Admin', dt: 'DT', player: 'Jugadora' };

type Player = { id: string; name: string; num: string };

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

  const updateRole = async (id: string, newRole: 'admin' | 'dt' | 'player') => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    if (error) toast.error('No se pudo actualizar el rol');
    else { toast.success('Rol actualizado'); fetchAll(); }
  };

  const linkPlayer = async (profileId: string, playerId: string) => {
    const val = playerId === '' ? null : playerId;
    const { error } = await supabase.from('profiles').update({ player_id: val }).eq('id', profileId);
    if (error) toast.error('Error al vincular');
    else {
      toast.success(val ? 'Jugadora vinculada' : 'Vínculo removido');
      fetchAll();
    }
  };

  // Auto-match: compara primer nombre del email/perfil con nombre en plantel
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
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    });
    setResending(prev => { const s = new Set(prev); s.delete(profileId); return s; });
    if (error) toast.error('No se pudo reenviar: ' + error.message);
    else toast.success(`Link reenviado a ${email}`);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: inviteEmail,
      options: { data: { role: inviteRole } }
    });
    setInviting(false);
    if (error) toast.error('No se pudo invitar: ' + error.message);
    else { toast.success(`Invitación enviada a ${inviteEmail}`); setInviteEmail(''); setShowInvite(false); }
  };

  const linkedPlayerIds = new Set(profiles.map(p => p.player_id).filter(Boolean));

  return (
    <Layout>
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black">Gestión de <span className="text-green-500">Usuarios</span></h1>
          <p className="text-gray-400">Roles, invitaciones y vinculación al plantel</p>
        </div>
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
      </header>

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
            <button type="submit" disabled={inviting} className="bg-green-700 hover:bg-green-600 px-4 py-2.5 rounded-lg text-xs font-black transition-all disabled:opacity-50">
              {inviting ? 'Enviando...' : 'Enviar invitación'}
            </button>
            <button type="button" onClick={() => setShowInvite(false)} className="p-2.5 rounded-lg bg-[#242424] hover:bg-[#333] transition-all">
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
                    {/* Usuario */}
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

                    {/* Rol badge */}
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${ROLE_STYLES[profile.role]}`}>
                        {ROLE_LABELS[profile.role]}
                      </span>
                    </td>

                    {/* Vinculación plantel */}
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

                    {/* Cambiar rol */}
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

                    {/* Reenviar link */}
                    <td className="p-4 text-right">
                      {profile.email && (
                        <button
                          onClick={() => resendLink(profile.id, profile.email!)}
                          disabled={resending.has(profile.id)}
                          title="Reenviar link de acceso"
                          className="inline-flex items-center gap-1.5 bg-[#242424] hover:bg-[#333] border border-[#444] text-xs text-gray-400 hover:text-blue-400 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                        >
                          {resending.has(profile.id)
                            ? <Loader size={12} className="animate-spin" />
                            : <Mail size={12} />}
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
    </Layout>
  );
};

export default Usuarios;
