import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { Radar, Shield, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
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

const Scout = () => {
  const [data, setData] = useState<ScoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Group videos by rival to trigger analysis
  const [matchGroups, setMatchGroups] = useState<{ rival: string; video_ids: string[]; count: number }[]>([]);
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [scoutRes, videosRes] = await Promise.all([
      supabase.from('rival_scouting').select('*').order('rival').order('player_num'),
      supabase.from('videos').select('yt_id, title').order('date', { ascending: false }),
    ]);

    if (scoutRes.data) setData(scoutRes.data);

    // Group videos by rival extracted from title
    if (videosRes.data) {
      const groups: Record<string, string[]> = {};
      for (const v of videosRes.data) {
        const match = v.title.match(/CAF vs (.+?) [–-]/);
        if (match) {
          const rival = match[1].trim();
          if (!groups[rival]) groups[rival] = [];
          groups[rival].push(v.yt_id);
        }
      }
      setMatchGroups(Object.entries(groups).map(([rival, ids]) => ({ rival, video_ids: ids, count: ids.length })));
    }
    setLoading(false);
  };

  const analyzeRival = async (rival: string, video_ids: string[]) => {
    setAnalyzing(rival);
    toast.loading(`Analizando ${rival} con IA...`, { id: 'analyzing' });
    try {
      const { data: result, error } = await supabase.functions.invoke('analyze-video', {
        body: { rival, video_ids, match_notes: '', match_result: '' }
      });
      if (error) throw error;
      toast.success(`Scouting de ${rival} actualizado — ${result.players_saved} jugadora(s)`, { id: 'analyzing' });
      fetchData();
    } catch {
      toast.error('Error al analizar', { id: 'analyzing' });
    } finally {
      setAnalyzing(null);
    }
  };

  const byRival = data.reduce((acc, entry) => {
    if (!acc[entry.rival]) acc[entry.rival] = [];
    acc[entry.rival].push(entry);
    return acc;
  }, {} as Record<string, ScoutEntry[]>);

  return (
    <Layout>
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-900/40 rounded-2xl flex items-center justify-center border border-blue-800/40">
            <Radar size={26} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Scout <span className="text-blue-400">Rivales</span></h1>
            <p className="text-gray-400 text-sm">Análisis IA de equipos y jugadoras contrincantes</p>
          </div>
        </div>
      </header>

      {/* Análisis disponibles */}
      {isAdmin && matchGroups.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Partidos disponibles para analizar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matchGroups.map(({ rival, video_ids, count }) => (
              <div key={rival} className="bg-[#141414] border border-[#222] rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-sm">vs {rival}</p>
                  <p className="text-[10px] text-gray-500">{count} video{count > 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => analyzeRival(rival, video_ids)}
                  disabled={analyzing === rival}
                  className="flex items-center gap-2 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-800/40 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-black transition-all disabled:opacity-50"
                >
                  <RefreshCw size={12} className={analyzing === rival ? 'animate-spin' : ''} />
                  {analyzing === rival ? 'Analizando...' : byRival[rival] ? 'Re-analizar' : 'Analizar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : Object.keys(byRival).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Radar size={48} className="text-gray-700 mb-4" />
          <h3 className="font-black text-lg text-gray-600 mb-2">Sin scouting todavía</h3>
          <p className="text-gray-500 text-sm max-w-xs">Hacé clic en "Analizar" en alguno de los partidos de arriba para que la IA genere el informe de scouting.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byRival).map(([rival, players]) => (
            <div key={rival} className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === rival ? null : rival)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-900/30 rounded-xl flex items-center justify-center border border-blue-800/30">
                    <Radar size={20} className="text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-lg">{rival}</p>
                    <p className="text-xs text-gray-500">{players.length} jugadora{players.length > 1 ? 's' : ''} analizada{players.length > 1 ? 's' : ''} · IA</p>
                  </div>
                </div>
                {expanded === rival ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
              </button>

              {expanded === rival && (
                <div className="border-t border-[#333] p-5 space-y-4">
                  {players.map((p) => (
                    <div key={p.id} className="bg-[#141414] border border-[#222] rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[#242424] rounded-lg flex items-center justify-center font-black text-lg text-white border border-[#333]">
                          #{p.player_num}
                        </div>
                        <div>
                          <p className="font-black text-sm">{p.player_pos || 'Posición desconocida'}</p>
                          {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Shield size={10} /> Fortalezas
                          </p>
                          <ul className="space-y-1">
                            {(p.strengths || []).map((s, i) => (
                              <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">▸</span>{s}
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
                                <span className="text-red-400 mt-0.5">▸</span>{w}
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
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Scout;
