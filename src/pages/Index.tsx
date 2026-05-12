import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Match, Video, Player } from '../lib/supabase';
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
  Brain
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const Index = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, vRes, pRes] = await Promise.all([
        supabase.from('matches26').select('*').order('date', { ascending: false }),
        supabase.from('videos').select('*').order('date', { ascending: false }),
        supabase.from('players').select('*').order('num', { ascending: true })
      ]);

      if (mRes.data) setMatches(mRes.data);
      if (vRes.data) setVideos(vRes.data);
      if (pRes.data) setPlayers(pRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Header con botones de acción */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-2xl font-black text-white">Dashboard <span className="text-green-500 text-xl">CAF</span></h2>
          </div>
          <p className="text-gray-500 text-sm font-medium">Temporada activa 2026 · Categoría B · Liga Todo Vóley</p>
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
          title="Posición 2025" 
          value="3°" 
          subtitle="Liga Cat. C — ascenso"
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
                  <div key={match.id} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl border border-[#333]">
                    <span className="font-bold text-sm">vs {match.rival}</span>
                    <span className={`text-xs font-black px-2 py-1 rounded ${match.res === 'win' ? 'text-green-500' : 'text-red-500'}`}>
                      {match.sets}
                    </span>
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
            <QuickActionButton onClick={() => navigate('/videos')} icon={<VideoIcon size={16}/>} label="Agregar video al análisis" />
            <QuickActionButton onClick={() => navigate('/fixture')} icon={<Calendar size={16}/>} label="Ver fixture 2026" />
            <QuickActionButton onClick={() => navigate('/plantel')} icon={<UserPlus size={16}/>} label="Agregar jugadora al plantel" />
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
        <button className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg shadow-yellow-500/20 relative z-10">
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