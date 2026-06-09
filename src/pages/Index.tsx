import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Match, Video, Player } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getCache, setCache } from '../lib/cache';
import {
  Trophy,
  Users,
  Video as VideoIcon,
  Calendar,
  Plus,
  Zap,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  UserPlus,
  PlayCircle,
  PlusCircle,
  Brain,
  BookOpen,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

type Standing = { pos: number; pts: number; pg: number; pp: number; is_caf: boolean };

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayDiaryEntry, setTodayDiaryEntry] = useState<boolean | null>(null);

  useEffect(() => {
    fetchData();
    checkTodayDiary();
  }, []);

  const checkTodayDiary = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('match_diary')
      .select('id')
      .eq('match_date', today)
      .limit(1);
    setTodayDiaryEntry(!!data && data.length > 0);
  };

  const fetchData = async () => {
    const cm = getCache<Match[]>('matches26');
    const cv = getCache<Video[]>('videos');
    const cp = getCache<Player[]>('players');
    if (cm) setMatches(cm);
    if (cv) setVideos(cv);
    if (cp) setPlayers(cp);
    if (cm && cv && cp) setLoading(false);

    try {
      const [mRes, vRes, pRes, sRes] = await Promise.all([
        supabase.from('matches26').select('*').order('date', { ascending: false }),
        supabase.from('videos').select('*').order('date', { ascending: false }),
        supabase.from('players').select('*'),
        supabase.from('standings').select('pos, pts, pg, pp, is_caf').eq('season', '2026').order('pos'),
      ]);
      if (mRes.data) { setMatches(mRes.data); setCache('matches26', mRes.data); }
      if (vRes.data) { setVideos(vRes.data); setCache('videos', vRes.data); }
      if (pRes.data) { setPlayers(pRes.data); setCache('players', pRes.data); }
      if (sRes.data) setStandings(sRes.data);
    } catch {
      if (!cm) toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const caf = standings.find(s => s.is_caf);

  return (
    <Layout>
      {/* Header con botones de acción */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Panel <span className="text-green-500">CAF</span> Funes</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Temporada 2026 · Categoría B · Liga Todo Vóley</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/videos')}
            className="bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
          >
            <PlayCircle size={14} /> Agregar video
          </button>
          <button 
            onClick={() => navigate('/fixture')}
            className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-green-900/20"
          >
            <Plus size={14} /> Cargar partido 2026
          </button>
        </div>
      </header>

      {/* Diary prompt — shown when no entry for today */}
      {todayDiaryEntry === false && (
        <div
          onClick={() => navigate('/diario')}
          className="bg-gradient-to-r from-[#0f1f14] to-[#111] border border-green-900/40 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4 cursor-pointer hover:border-green-700/60 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-green-900/20 rounded-xl flex items-center justify-center border border-green-900/30 shrink-0">
              <BookOpen size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white">¿Jugaron partido hoy?</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Dejá tus notas en el diario — Flora las va a usar para conocer mejor al equipo.</p>
            </div>
          </div>
          <button className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 shadow-lg shadow-green-900/20">
            <Pencil size={13} /> Escribir
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Victorias 2026" 
          value={matches.filter(m => m.res === 'win').length} 
          subtitle="Temporada en curso"
          color="green" 
        />
        <StatCard 
          title="Derrotas 2026" 
          value={matches.filter(m => m.res === 'loss').length} 
          subtitle="Categoría B"
          color="red" 
        />
        <StatCard
          title={caf ? "Posición 2026" : "Posición 2025"}
          value={caf ? `${caf.pos}°` : "3°"}
          subtitle={caf ? `${caf.pts} pts · Cat. B` : "Liga Cat. C — ascenso"}
          color="yellow"
        />
        <StatCard 
          title="Videos cargados" 
          value={videos.length} 
          subtitle="Partidos analizados"
          color="blue" 
        />
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Últimos Partidos */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#222] rounded-2xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#222] flex justify-between items-center">
            <h3 className="text-sm font-black flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Últimos partidos 2026
            </h3>
            <button 
              onClick={() => navigate('/fixture')}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors bg-[#1a1a1a] px-3 py-1 rounded-full border border-[#333]"
            >
              Ver fixture
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            {matches.length > 0 ? (
              <div className="w-full space-y-2">
                {matches.slice(0, 3).map(match => (
                  <div key={match.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    match.res === 'win' ? 'bg-green-900/10 border-green-900/30' :
                    match.res === 'loss' ? 'bg-red-900/10 border-red-900/30' :
                    'bg-[#1a1a1a] border-[#333]'
                  }`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                      match.res === 'win' ? 'bg-green-800 text-green-300' :
                      match.res === 'loss' ? 'bg-red-900 text-red-300' :
                      'bg-[#333] text-gray-400'
                    }`}>
                      {match.res === 'win' ? 'V' : match.res === 'loss' ? 'D' : '-'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">vs {match.rival}</p>
                      <p className="text-[10px] text-gray-500">{match.date} · {match.cond}</p>
                    </div>
                    {match.sets && (
                      <span className={`text-sm font-black shrink-0 ${
                        match.res === 'win' ? 'text-green-400' : match.res === 'loss' ? 'text-red-400' : 'text-gray-400'
                      }`}>{match.sets}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-4 border border-[#333]">
                  <ClipboardList size={40} className="text-gray-600" />
                </div>
                <h4 className="font-black text-lg mb-1">Sin partidos 2026</h4>
                <p className="text-gray-500 text-sm max-w-[200px]">Cargá el fixture 2026 para empezar el seguimiento.</p>
              </>
            )}
          </div>
        </div>

        {/* Acceso Rápido */}
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-5">
          <h3 className="text-sm font-black flex items-center gap-2 mb-6">
            <Zap size={18} className="text-yellow-500" /> Acceso rápido
          </h3>
          <div className="space-y-2">
            <QuickActionButton onClick={() => navigate('/fixture')} icon={<PlusCircle size={16}/>} label="Cargar resultado de partido" color="bg-green-700 hover:bg-green-600" />
            <QuickActionButton onClick={() => navigate('/diario')} icon={<BookOpen size={16}/>} label="Escribir en el diario" />
            <QuickActionButton onClick={() => navigate('/videos')} icon={<VideoIcon size={16}/>} label="Agregar video al análisis" />
            <QuickActionButton onClick={() => navigate('/analisis')} icon={<Calendar size={16}/>} label="Ver análisis del equipo" />
            <QuickActionButton onClick={() => navigate('/ai-coach')} icon={<Brain size={16}/>} label="Consultar entrenadora IA" />
          </div>
        </div>
      </div>

      {/* Logro Histórico Banner */}
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#111] border border-[#333] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20 shadow-2xl shadow-yellow-500/10">
            <Trophy size={32} className="text-yellow-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black bg-green-900/30 text-green-500 px-2 py-0.5 rounded uppercase tracking-tighter">Temporada 2025</span>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">• LOGRO HISTÓRICO</span>
            </div>
            <h3 className="text-2xl font-black text-white">3° Puesto · Cat. C <span className="text-green-500">→ ASCENSO</span></h3>
            <p className="text-gray-400 text-sm font-medium">7 victorias · 8 derrotas · Semifinalistas · Bronce vs CAI Rojo 3-0</p>
          </div>
        </div>
        <button onClick={() => navigate('/history-2025')} className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg shadow-yellow-500/20 relative z-10">
          Ver temporada 2025
        </button>
        
        {/* Decoración de fondo */}
        <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-opacity">
          <Trophy size={200} />
        </div>
      </div>
    </Layout>
  );
};

const StatCard = ({ title, value, subtitle, color }: { title: string, value: string | number, subtitle: string, color: 'green' | 'red' | 'yellow' | 'blue' }) => {
  const colors = {
    green: "border-green-900/30 text-green-500 bg-green-900/5",
    red: "border-red-900/30 text-red-500 bg-red-900/5",
    yellow: "border-yellow-900/30 text-yellow-500 bg-yellow-900/5",
    blue: "border-blue-900/30 text-blue-400 bg-blue-900/5"
  };

  return (
    <div className={`bg-[#141414] border rounded-2xl p-5 transition-all hover:scale-[1.02] cursor-default ${colors[color]}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{title}</p>
      <p className="text-4xl font-black mb-1">{value}</p>
      <p className="text-[10px] font-bold opacity-60">{subtitle}</p>
    </div>
  );
};

const QuickActionButton = ({ icon, label, onClick, color = "bg-[#1a1a1a] hover:bg-[#242424]" }: { icon: React.ReactNode, label: string, onClick?: () => void, color?: string }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between p-3 rounded-xl border border-[#333] transition-all group ${color}`}
  >
    <div className="flex items-center gap-3">
      <span className="text-gray-400 group-hover:text-white transition-colors">{icon}</span>
      <span className="text-xs font-bold">{label}</span>
    </div>
    <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
  </button>
);

export default Index;