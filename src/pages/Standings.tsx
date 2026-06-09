import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { Trophy, TrendingUp, Minus, TrendingDown, Edit2, Check, X, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCache, setCache, clearCache } from '../lib/cache';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const COPAFACIL_URL = 'https://copafacil.com/-nz-9dqhz8ogimj9ap9y@20lb';

type Team = {
  id: string;
  pos: number;
  name: string;
  pts: number;
  pj: number;
  pg: number;
  pp: number;
  sets_favor: number;
  trend: 'up' | 'neutral' | 'down';
  is_caf: boolean;
  season?: string;
};

const BLANK_TEAM: Omit<Team, 'id'> = {
  pos: 1, name: '', pts: 0, pj: 0, pg: 0, pp: 0, sets_favor: 0, trend: 'neutral', is_caf: false, season: '2026'
};

const TrendIcon = ({ t }: { t: Team['trend'] }) =>
  t === 'up'   ? <TrendingUp  size={13} className="text-green-500" /> :
  t === 'down' ? <TrendingDown size={13} className="text-red-400" /> :
                 <Minus size={13} className="text-gray-600" />;

const Standings = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Team>>({});
  const [addModal, setAddModal] = useState(false);
  const [newTeam, setNewTeam] = useState<Omit<Team, 'id'>>(BLANK_TEAM);
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

  useEffect(() => { fetchStandings(); }, []);

  const fetchStandings = async () => {
    const cached = getCache<Team[]>('standings');
    if (cached) { setTeams(cached); setLoading(false); }
    try {
      const { data } = await supabase.from('standings').select('*').eq('season', '2026').order('pos');
      if (data) { setTeams(data); setCache('standings', data); }
    } catch { /**/ }
    finally { setLoading(false); }
  };

  const startEdit = (team: Team) => {
    setEditingId(team.id);
    setEditData({ pts: team.pts, pj: team.pj, pg: team.pg, pp: team.pp, sets_favor: team.sets_favor, trend: team.trend, pos: team.pos });
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from('standings').update(editData).eq('id', id);
    if (error) toast.error('Error al guardar');
    else { toast.success('Tabla actualizada'); setEditingId(null); clearCache('standings'); fetchStandings(); }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('¿Eliminar equipo de la tabla?')) return;
    const { error } = await supabase.from('standings').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Equipo eliminado'); clearCache('standings'); fetchStandings(); }
  };

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.name.trim()) { toast.error('Ingresá el nombre del equipo'); return; }
    const { error } = await supabase.from('standings').insert([{ ...newTeam, season: '2026' }]);
    if (error) toast.error('Error: ' + error.message);
    else {
      toast.success('Equipo agregado');
      setAddModal(false);
      setNewTeam(BLANK_TEAM);
      clearCache('standings'); fetchStandings();
    }
  };

  const caf = teams.find(t => t.is_caf);

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black">Tabla de <span className="text-green-500">Posiciones</span></h1>
          <p className="text-gray-500 text-xs mt-0.5">Temporada 2026 · Cat. B Maxi Femenino · Liga Todo Vóley</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={COPAFACIL_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#111] border border-[#2a2a2a] hover:border-green-700/50 rounded-lg text-[11px] font-bold text-gray-400 hover:text-green-400 transition-all"
          >
            <ExternalLink size={12} /> Actualizar datos
          </a>
          {isAdmin && (
            <button
              onClick={() => setAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-[11px] font-black transition-all"
            >
              <Plus size={13} /> Equipo
            </button>
          )}
        </div>
      </div>

      {/* Banner CAF */}
      {caf && (
        <div className="relative bg-gradient-to-r from-green-950/50 to-[#0d150d] border border-green-800/40 rounded-2xl p-4 mb-4 overflow-hidden flex items-center gap-4">
          <div className="w-12 h-12 bg-green-800/60 border border-green-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="font-black text-yellow-400 text-lg leading-none">{caf.pos}°</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-0.5">C.A. Funes · Posición actual</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{caf.pts}</span>
              <span className="text-xs text-gray-500 font-medium">pts</span>
              <span className="text-gray-700 text-xs">·</span>
              <span className="text-sm text-gray-400 font-bold">{caf.pj} PJ</span>
              <span className="text-sm text-green-500 font-bold">{caf.pg}G</span>
              <span className="text-sm text-red-500 font-bold">{caf.pp}P</span>
            </div>
          </div>
          <TrendIcon t={caf.trend} />
          <div className="absolute -right-3 -bottom-3 opacity-[0.04]"><Trophy size={90} /></div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Trophy size={36} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm font-bold">Tabla vacía</p>
          {isAdmin && <p className="text-gray-600 text-xs mt-1">Agregá equipos con el botón "Equipo"</p>}
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              {/* Columnas */}
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-gray-600 font-black w-10 text-center">#</th>
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-gray-600 font-black">Equipo</th>
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-gray-600 font-black text-center">PJ</th>
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-green-700 font-black text-center">PG</th>
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-red-900 font-black text-center">PP</th>
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-gray-600 font-black text-center">SF</th>
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-green-500 font-black text-center">PTS</th>
                  <th className="px-3 py-2.5 text-[9px] uppercase tracking-widest text-gray-600 font-black text-center w-8"></th>
                  {isAdmin && <th className="px-2 py-2.5 w-16" />}
                </tr>
              </thead>
              <tbody>
                {teams.map((team, idx) => {
                  const editing = editingId === team.id;
                  const isTop3 = team.pos <= 3;
                  const showDivider = idx > 0 && teams[idx - 1].pos <= 3 && !isTop3;

                  return (
                    <React.Fragment key={team.id}>
                      {showDivider && (
                        <tr>
                          <td colSpan={isAdmin ? 9 : 8} className="px-3 py-1 bg-[#0d0d0d]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-yellow-700/50">— ascenso (top 3) —</p>
                          </td>
                        </tr>
                      )}
                      <tr className={`border-t border-[#161616] transition-colors group ${
                        team.is_caf
                          ? 'bg-green-950/20 border-l-2 border-l-green-600'
                          : isTop3
                          ? 'bg-yellow-950/10'
                          : 'hover:bg-white/[0.02]'
                      }`}>
                        {/* Pos */}
                        <td className="px-3 py-2.5 text-center">
                          <span className={`font-black text-sm ${isTop3 ? 'text-yellow-500' : 'text-gray-600'}`}>
                            {team.pos}
                          </span>
                        </td>

                        {/* Nombre */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0 ${
                              team.is_caf ? 'bg-green-800/60 text-yellow-400 border border-green-700/50' : 'bg-[#1a1a1a] text-gray-500'
                            }`}>
                              {team.name.substring(0, 3).toUpperCase()}
                            </div>
                            <span className={`text-sm font-bold ${team.is_caf ? 'text-white' : 'text-gray-200'}`}>
                              {team.name}
                            </span>
                          </div>
                        </td>

                        {editing ? (
                          <>
                            {(['pj', 'pg', 'pp', 'sets_favor'] as const).map(field => (
                              <td key={field} className="px-2 py-2 text-center">
                                <input
                                  type="number"
                                  value={editData[field] ?? ''}
                                  onChange={e => setEditData(p => ({ ...p, [field]: +e.target.value }))}
                                  className="w-11 bg-[#222] border border-[#333] rounded px-1 py-0.5 text-xs text-center outline-none focus:border-green-500"
                                />
                              </td>
                            ))}
                            <td className="px-2 py-2 text-center">
                              <input
                                type="number"
                                value={editData.pts ?? ''}
                                onChange={e => setEditData(p => ({ ...p, pts: +e.target.value }))}
                                className="w-11 bg-green-900/20 border border-green-700/50 rounded px-1 py-0.5 text-xs text-center outline-none focus:border-green-500 text-green-400 font-black"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <select
                                value={editData.trend}
                                onChange={e => setEditData(p => ({ ...p, trend: e.target.value as any }))}
                                className="bg-[#222] border border-[#333] rounded px-1 py-0.5 text-xs outline-none"
                              >
                                <option value="up">↑</option>
                                <option value="neutral">→</option>
                                <option value="down">↓</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex gap-1 justify-center">
                                <button onClick={() => saveEdit(team.id)} className="text-green-500 hover:text-green-400 p-1">
                                  <Check size={13} />
                                </button>
                                <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-300 p-1">
                                  <X size={13} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2.5 text-center text-sm text-gray-400">{team.pj}</td>
                            <td className="px-3 py-2.5 text-center text-sm font-bold text-green-600">{team.pg}</td>
                            <td className="px-3 py-2.5 text-center text-sm font-bold text-red-600">{team.pp}</td>
                            <td className="px-3 py-2.5 text-center text-sm text-gray-500">{team.sets_favor}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`font-black text-base ${team.is_caf ? 'text-green-400' : isTop3 ? 'text-yellow-500' : 'text-white'}`}>
                                {team.pts}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <TrendIcon t={team.trend} />
                            </td>
                            {isAdmin && (
                              <td className="px-2 py-2.5">
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => startEdit(team)} className="text-gray-600 hover:text-gray-300 p-1">
                                    <Edit2 size={12} />
                                  </button>
                                  <button onClick={() => deleteTeam(team.id)} className="text-gray-700 hover:text-red-400 p-1">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer link */}
      <div className="flex items-center justify-center mt-3">
        <a
          href={COPAFACIL_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[10px] text-gray-700 hover:text-green-500 transition-colors"
        >
          <ExternalLink size={10} />
          Datos en tiempo real → Copa Fácil · Femenino C
        </a>
      </div>

      {/* Modal agregar equipo */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Agregar Equipo">
        <form onSubmit={addTeam} className="space-y-3">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Nombre del equipo</label>
            <input
              type="text" required
              placeholder="ej: CAF Funes"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
              value={newTeam.name}
              onChange={e => setNewTeam(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Pos</label>
              <input type="number" min={1}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                value={newTeam.pos} onChange={e => setNewTeam(p => ({ ...p, pos: +e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">PJ</label>
              <input type="number" min={0}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                value={newTeam.pj} onChange={e => setNewTeam(p => ({ ...p, pj: +e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">PTS</label>
              <input type="number" min={0}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                value={newTeam.pts} onChange={e => setNewTeam(p => ({ ...p, pts: +e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">PG</label>
              <input type="number" min={0}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                value={newTeam.pg} onChange={e => setNewTeam(p => ({ ...p, pg: +e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">PP</label>
              <input type="number" min={0}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                value={newTeam.pp} onChange={e => setNewTeam(p => ({ ...p, pp: +e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Sets</label>
              <input type="number" min={0}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                value={newTeam.sets_favor} onChange={e => setNewTeam(p => ({ ...p, sets_favor: +e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Tendencia</label>
              <select
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                value={newTeam.trend} onChange={e => setNewTeam(p => ({ ...p, trend: e.target.value as any }))}
              >
                <option value="up">↑ Subiendo</option>
                <option value="neutral">→ Estable</option>
                <option value="down">↓ Bajando</option>
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none p-2.5">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-green-500"
                  checked={newTeam.is_caf}
                  onChange={e => setNewTeam(p => ({ ...p, is_caf: e.target.checked }))}
                />
                <span className="text-xs font-bold text-gray-400">Es CAF</span>
              </label>
            </div>
          </div>
          <button type="submit" className="w-full bg-green-700 hover:bg-green-600 py-2.5 rounded-xl font-black text-sm transition-all">
            Agregar Equipo
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default Standings;
