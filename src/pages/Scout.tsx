import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Radar, Shield, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type ScoutEntry = {
  id: string;
  rival: string;
  player_num: string;
  player_pos: string | null;
  strengths: string[];
  weaknesses: string[];
  notes: string | null;
  ai_generated: boolean;
  updated_at: string;
};

type Video = { id: string; yt_id: string; title: string };

const Scout = () => {
  const [data, setData] = useState<ScoutEntry[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rivalName, setRivalName] = useState('');
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [matchNotes, setMatchNotes] = useState('');
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [scoutRes, videosRes] = await Promise.all([
      supabase.from('rival_scouting').select('*').order('rival').order('player_num'),
      supabase.from('videos').select('id, yt_id, title').order('date', { ascending: false }),
    ]);
    if (scoutRes.data) setData(scoutRes.data);
    if (videosRes.data) setVideos(videosRes.data);
    setLoading(false);
  };

  const analyzeRival = async () => {
    if (!rivalName.trim()) return;
    const rival = rivalName.trim();
    setAnalyzing(rival);
    setIsModalOpen(false);
    toast.loading(`Analizando ${rival} con IA...`, { id: 'analyzing' });
    try {
      const { data: result, error } = await supabase.functions.invoke('analyze-video', {
        body: {
          rival,
          video_ids: selectedVideos,
          match_notes: matchNotes,
          match_result: '',
        }
      });
      if (error) throw error;
      const saved = result?.players_saved ?? 0;
      toast.success(
        saved > 0
          ? `Scouting de ${rival} generado — ${saved} jugadora(s) analizadas`
          : `Scouting de ${rival} generado`,
        { id: 'analyzing' }
      );
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Error al analizar. Revisá que la edge function esté activa.', { id: 'analyzing' });
    } finally {
      setAnalyzing(null);
      setRivalName('');
      setSelectedVideos([]);
      setMatchNotes('');
    }
  };

  const deleteRival = async (rival: string) => {
    if (!confirm(`¿Eliminar todo el scouting de ${rival}?`)) return;
    const { error } = await supabase.from('rival_scouting').delete().eq('rival', rival);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Scouting eliminado'); fetchData(); }
  };

  const toggleVideo = (ytId: string) => {
    setSelectedVideos(prev =>
      prev.includes(ytId) ? prev.filter(v => v !== ytId) : [...prev, ytId]
    );
  };

  const byRival = data.reduce((acc, entry) => {
    if (!acc[entry.rival]) acc[entry.rival] = [];
    acc[entry.rival].push(entry);
    return acc;
  }, {} as Record<string, ScoutEntry[]>);

  const rivals = Object.keys(byRival);

  return (
    <Layout>
      <header className="flex justify-between items-end mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-900/40 rounded-2xl flex items-center justify-center border border-blue-800/40">
            <Radar size={26} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Scout <span className="text-blue-400">Rivales</span></h1>
            <p className="text-gray-400 text-sm">Análisis IA de equipos contrincantes</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!!analyzing}
            className="bg-blue-800 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all"
          >
            {analyzing ? (
              <><RefreshCw size={14} className="animate-spin" /> Analizando {analyzing}...</>
            ) : (
              <><Plus size={14} /> Analizar rival</>
            )}
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rivals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Radar size={48} className="text-gray-700 mb-4" />
          <h3 className="font-black text-lg text-gray-600 mb-2">Sin scouting todavía</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            {isAdmin
              ? 'Usá el botón "Analizar rival" para que la IA genere un informe de scouting.'
              : 'Aún no hay informes de scouting disponibles.'}
          </p>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 bg-blue-800 hover:bg-blue-700 px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all"
            >
              <Plus size={14} /> Analizar primer rival
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {rivals.map(rival => {
            const players = byRival[rival];
            const isOpen = expanded === rival;
            return (
              <div key={rival} className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
                  <button
                    onClick={() => setExpanded(isOpen ? null : rival)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="w-10 h-10 bg-blue-900/30 rounded-xl flex items-center justify-center border border-blue-800/30 flex-shrink-0">
                      <Radar size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="font-black text-lg">{rival}</p>
                      <p className="text-xs text-gray-500">
                        {players.length} jugadora{players.length !== 1 ? 's' : ''} analizada{players.length !== 1 ? 's' : ''} · IA
                      </p>
                    </div>
                    <span className="ml-2 text-gray-600">
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => { setRivalName(rival); setIsModalOpen(true); }}
                        disabled={!!analyzing}
                        title="Re-analizar"
                        className="flex items-center gap-1.5 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-800/40 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-black transition-all disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={analyzing === rival ? 'animate-spin' : ''} />
                        Re-analizar
                      </button>
                      <button
                        onClick={() => deleteRival(rival)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1.5"
                        title="Eliminar scouting"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {isOpen && (
                  <div className="border-t border-[#333] p-5 space-y-4">
                    {players.map(p => (
                      <div key={p.id} className="bg-[#141414] border border-[#222] rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-[#242424] rounded-lg flex items-center justify-center font-black text-lg text-white border border-[#333]">
                            #{p.player_num}
                          </div>
                          <div>
                            <p className="font-black text-sm">{p.player_pos || 'Posición no especificada'}</p>
                            {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Shield size={10} /> Fortalezas
                            </p>
                            <ul className="space-y-1">
                              {(p.strengths || []).map((s, i) => (
                                <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5 flex-shrink-0">▸</span>{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <AlertTriangle size={10} /> Debilidades
                            </p>
                            <ul className="space-y-1">
                              {(p.weaknesses || []).map((w, i) => (
                                <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                  <span className="text-red-400 mt-0.5 flex-shrink-0">▸</span>{w}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para analizar rival */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedVideos([]); setMatchNotes(''); }} title="Analizar rival con IA">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del rival *</label>
            <input
              type="text"
              placeholder="ej: CAI Rojo, Sportivo, Vélez..."
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
              value={rivalName}
              onChange={e => setRivalName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observaciones del partido (opcional)</label>
            <textarea
              rows={2}
              placeholder="Ej: Tienen una punta muy potente en zona 4, su armadora es zurda, sacan mucho al 5..."
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
              value={matchNotes}
              onChange={e => setMatchNotes(e.target.value)}
            />
          </div>

          {videos.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                Videos a incluir en el análisis (opcional)
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                {videos.map(v => (
                  <label key={v.yt_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#242424] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVideos.includes(v.yt_id)}
                      onChange={() => toggleVideo(v.yt_id)}
                      className="accent-blue-500"
                    />
                    <span className="text-xs text-gray-300 truncate">{v.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl p-3">
            <p className="text-[11px] text-blue-300 leading-relaxed">
              La IA generará un informe de scouting con jugadoras clave, fortalezas y debilidades del rival, basándose en las observaciones y videos que indiques. Si no hay videos, usará el contexto general del equipo.
            </p>
          </div>

          <button
            onClick={analyzeRival}
            disabled={!rivalName.trim()}
            className="w-full bg-blue-800 hover:bg-blue-700 disabled:opacity-40 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Radar size={16} /> Generar scouting con IA
          </button>
        </div>
      </Modal>
    </Layout>
  );
};

export default Scout;
