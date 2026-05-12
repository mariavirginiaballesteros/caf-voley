import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Trophy, TrendingUp, Minus, TrendingDown, Edit2, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

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
};

const Standings = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Team>>({});
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

  useEffect(() => { fetchStandings(); }, []);

  const fetchStandings = async () => {
    const { data } = await supabase
      .from('standings')
      .select('*')
      .eq('season', '2026')
      .order('pos');
    if (data) setTeams(data);
    setLoading(false);
  };

  const startEdit = (team: Team) => {
    setEditingId(team.id);
    setEditData({ pts: team.pts, pj: team.pj, pg: team.pg, pp: team.pp, sets_favor: team.sets_favor, trend: team.trend });
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from('standings').update(editData).eq('id', id);
    if (error) toast.error('Error al guardar');
    else { toast.success('Tabla actualizada'); setEditingId(null); fetchStandings(); }
  };

  const caf = teams.find(t => t.is_caf);

  return (
    <Layout>
      <header className="mb-8">
        <h1 className="text-3xl font-black">Tabla de <span className="text-green-500">Posiciones</span></h1>
        <p className="text-gray-400">Temporada 2026 · Categoría B · Liga Todo Vóley · Ida</p>
      </header>

      {/* Banner posición CAF */}
      {caf && (
        <div className="bg-gradient-to-r from-[#1a1a1a] to-[#111] border border-green-900/40 rounded-2xl p-5 mb-6 flex items-center gap-5 relative overflow-hidden">
          <div className="w-14 h-14 bg-green-800 rounded-2xl flex items-center justify-center font-black text-yellow-500 text-xl border border-green-700 flex-shrink-0 shadow-lg">
            {caf.pos}°
          </div>
          <div>
            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-0.5">Posición actual · C.A. Funes</p>
            <p className="text-2xl font-black">{caf.pts} pts <span className="text-gray-500 text-sm font-medium">· {caf.pj} jugados · {caf.pg}G {caf.pp}P</span></p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5"><Trophy size={100} /></div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#242424] text-[10px] uppercase tracking-widest text-gray-400 font-black">
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">Equipo</th>
                  <th className="p-4 text-center">PJ</th>
                  <th className="p-4 text-center text-green-500">PG</th>
                  <th className="p-4 text-center text-red-500">PP</th>
                  <th className="p-4 text-center">SF</th>
                  <th className="p-4 text-center bg-green-900/20 text-green-500">Pts</th>
                  <th className="p-4 text-center">Tend</th>
                  {isAdmin && <th className="p-4 text-center">Edit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {teams.map(team => {
                  const editing = editingId === team.id;
                  return (
                    <tr key={team.id} className={`transition-colors ${team.is_caf ? 'bg-green-900/10 border-l-2 border-l-green-600' : 'hover:bg-white/5'}`}>
                      <td className="p-4 text-center">
                        <span className={`font-black text-sm ${team.pos <= 3 ? 'text-yellow-500' : 'text-gray-500'}`}>
                          {team.pos}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                            team.is_caf ? 'bg-green-800 text-yellow-500 border border-green-700' : 'bg-[#242424] text-gray-400'
                          }`}>
                            {team.name.substring(0, 3).toUpperCase()}
                          </div>
                          <span className={`font-bold text-sm ${team.is_caf ? 'text-white' : ''}`}>{team.name}</span>
                        </div>
                      </td>

                      {editing ? (
                        <>
                          {(['pj','pg','pp','sets_favor'] as const).map(field => (
                            <td key={field} className="p-2 text-center">
                              <input type="number" value={editData[field] ?? ''} onChange={e => setEditData(p => ({ ...p, [field]: +e.target.value }))}
                                className="w-12 bg-[#333] border border-[#555] rounded px-1 py-0.5 text-xs text-center outline-none focus:border-green-500" />
                            </td>
                          ))}
                          <td className="p-2 text-center">
                            <input type="number" value={editData.pts ?? ''} onChange={e => setEditData(p => ({ ...p, pts: +e.target.value }))}
                              className="w-12 bg-green-900/20 border border-green-700/50 rounded px-1 py-0.5 text-xs text-center outline-none focus:border-green-500 text-green-400 font-black" />
                          </td>
                          <td className="p-2 text-center">
                            <select value={editData.trend} onChange={e => setEditData(p => ({ ...p, trend: e.target.value as any }))}
                              className="bg-[#333] border border-[#555] rounded px-1 py-0.5 text-xs outline-none">
                              <option value="up">↑</option>
                              <option value="neutral">→</option>
                              <option value="down">↓</option>
                            </select>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => saveEdit(team.id)} className="text-green-500 hover:text-green-400"><Check size={16} /></button>
                              <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-4 text-center text-sm">{team.pj}</td>
                          <td className="p-4 text-center text-sm font-bold text-green-500">{team.pg}</td>
                          <td className="p-4 text-center text-sm font-bold text-red-500">{team.pp}</td>
                          <td className="p-4 text-center text-sm">{team.sets_favor}</td>
                          <td className="p-4 text-center font-black text-xl bg-green-900/10 text-green-500">{team.pts}</td>
                          <td className="p-4 text-center">
                            {team.trend === 'up'
                              ? <TrendingUp size={16} className="text-green-500 mx-auto" />
                              : team.trend === 'down'
                              ? <TrendingDown size={16} className="text-red-500 mx-auto" />
                              : <Minus size={16} className="text-gray-600 mx-auto" />}
                          </td>
                          {isAdmin && (
                            <td className="p-4 text-center">
                              <button onClick={() => startEdit(team)} className="text-gray-600 hover:text-gray-300 transition-colors">
                                <Edit2 size={14} />
                              </button>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-600 text-center mt-4">
        Fase de Ida · Liga Todo Vóley 2026 · Categoría B Maxi Femenino
        {isAdmin && <span className="ml-2">· Hacé clic en ✏️ para actualizar un resultado</span>}
      </p>
    </Layout>
  );
};

export default Standings;
