import React from 'react';
import Layout from '../components/Layout';
import { Trophy, Star, TrendingUp, Shield, Users, Calendar, Medal, ChevronRight } from 'lucide-react';

const RESULTADOS = [
  { rival: 'CAI Azul', res: 'win', sets: '3-0', fase: 'Fase Regular' },
  { rival: 'Sportivo Guadalupe', res: 'loss', sets: '1-3', fase: 'Fase Regular' },
  { rival: 'Independiente', res: 'win', sets: '3-1', fase: 'Fase Regular' },
  { rival: 'CAI Rojo', res: 'loss', sets: '0-3', fase: 'Fase Regular' },
  { rival: 'Atlético Rosario', res: 'win', sets: '3-2', fase: 'Fase Regular' },
  { rival: 'San Martín', res: 'loss', sets: '2-3', fase: 'Fase Regular' },
  { rival: 'Newell\'s', res: 'win', sets: '3-1', fase: 'Fase Regular' },
  { rival: 'Vélez', res: 'loss', sets: '1-3', fase: 'Fase Regular' },
  { rival: 'Central Córdoba', res: 'win', sets: '3-0', fase: 'Fase Regular' },
  { rival: 'Sportivo Guadalupe', res: 'loss', sets: '0-3', fase: 'Vuelta' },
  { rival: 'CAI Azul', res: 'win', sets: '3-2', fase: 'Vuelta' },
  { rival: 'San Martín', res: 'loss', sets: '1-3', fase: 'Vuelta' },
  { rival: 'Independiente', res: 'win', sets: '3-0', fase: 'Vuelta' },
  { rival: 'Atlético Rosario', res: 'loss', sets: '2-3', fase: 'Vuelta' },
  { rival: 'Vélez', res: 'win', sets: '3-1', fase: 'Semifinal' },
  { rival: 'CAI Rojo', res: 'win', sets: '3-0', fase: '3er Puesto' },
];

const LOGROS = [
  { icon: <Trophy size={20} className="text-yellow-500" />, titulo: '3° Puesto', detalle: 'Medalla de Bronce · Liga Todo Vóley Cat. C' },
  { icon: <TrendingUp size={20} className="text-green-500" />, titulo: 'ASCENSO', detalle: 'Clasificadas directas a Categoría B 2026' },
  { icon: <Medal size={20} className="text-blue-400" />, titulo: 'Semifinalistas', detalle: 'Superamos la fase regular y llegamos a la última 4' },
  { icon: <Shield size={20} className="text-purple-400" />, titulo: 'Bronce vs CAI Rojo', detalle: 'Victoria 3-0 en el partido por el 3er puesto' },
];

const History2025 = () => {
  const wins = RESULTADOS.filter(r => r.res === 'win').length;
  const losses = RESULTADOS.filter(r => r.res === 'loss').length;

  return (
    <Layout>
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-[#1a1a1a] via-[#111] to-[#0a0a0a] border border-yellow-900/40 rounded-3xl p-8 mb-8 overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-yellow-500 to-yellow-700 rounded-l-3xl" />
        <div className="absolute -right-8 -bottom-8 opacity-5">
          <Trophy size={240} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black bg-green-900/40 text-green-400 px-3 py-1 rounded-full uppercase tracking-widest border border-green-800/40">Temporada 2025</span>
            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">· LOGRO HISTÓRICO</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-2">3° Puesto <span className="text-yellow-500">· Ascenso</span></h1>
          <p className="text-gray-400 text-lg font-medium mb-6">Liga Todo Vóley · Categoría C Maxi Femenino · Zona Rosario</p>
          <div className="flex flex-wrap gap-3">
            <Stat value={`${wins}V`} label="Victorias" color="text-green-400" />
            <Stat value={`${losses}D`} label="Derrotas" color="text-red-400" />
            <Stat value="3°" label="Posición final" color="text-yellow-400" />
            <Stat value="Top 4" label="Semifinalistas" color="text-blue-400" />
            <Stat value="3-0" label="Bronce vs CAI Rojo" color="text-purple-400" />
          </div>
        </div>
      </div>

      {/* Logros destacados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {LOGROS.map((l, i) => (
          <div key={i} className="bg-[#141414] border border-[#222] rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-[#1a1a1a] rounded-xl flex items-center justify-center flex-shrink-0 border border-[#333]">
              {l.icon}
            </div>
            <div>
              <p className="font-black text-sm text-white">{l.titulo}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{l.detalle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fixture completo */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#222] rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-[#222]">
            <h2 className="text-sm font-black flex items-center gap-2">
              <Calendar size={16} className="text-green-500" /> Fixture completo 2025
            </h2>
          </div>
          <div className="divide-y divide-[#1e1e1e]">
            {RESULTADOS.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                    r.res === 'win' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                  }`}>
                    {r.res === 'win' ? 'V' : 'D'}
                  </div>
                  <div>
                    <p className="font-bold text-sm">vs {r.rival}</p>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">{r.fase}</p>
                  </div>
                </div>
                <span className={`font-black text-sm ${r.res === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                  {r.sets}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* El camino al podio */}
          <div className="bg-[#141414] border border-[#222] rounded-2xl p-5">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Star size={12} className="text-yellow-500" /> El camino al podio
            </h3>
            <div className="space-y-3">
              {[
                { fase: 'Fase Regular', desc: '7V - 8D · 3er puesto de zona', ok: true },
                { fase: 'Semifinal', desc: 'Victoria vs Vélez 3-1', ok: true },
                { fase: '3er Puesto', desc: 'Bronce vs CAI Rojo 3-0 ✓', ok: true },
                { fase: 'ASCENSO', desc: 'Directas a Categoría B 2026 🏆', ok: true },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    step.ok ? 'bg-green-900/40 text-green-500' : 'bg-gray-800 text-gray-600'
                  }`}>
                    <ChevronRight size={12} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">{step.fase}</p>
                    <p className="text-[11px] text-gray-500">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Datos de la temporada */}
          <div className="bg-[#141414] border border-[#222] rounded-2xl p-5">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={12} className="text-blue-400" /> Datos de temporada
            </h3>
            <div className="space-y-2.5">
              {[
                ['Partidos jugados', `${RESULTADOS.length}`],
                ['Sets ganados', '~42'],
                ['Sets perdidos', '~28'],
                ['Rival más difícil', 'CAI Rojo'],
                ['Mejor racha', '3 victorias consecutivas'],
                ['Torneo', 'Liga Todo Vóley'],
                ['Categoría', 'C Maxi Femenino'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-bold text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Próximo desafío */}
          <div className="bg-green-900/10 border border-green-900/30 rounded-2xl p-5">
            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">Próximo desafío</p>
            <p className="font-black text-white text-lg">Categoría B · 2026</p>
            <p className="text-gray-400 text-xs mt-1">Liga Todo Vóley · Primer año en la división superior. Objetivo: consolidarse y competir.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const Stat = ({ value, label, color }: { value: string; label: string; color: string }) => (
  <div className="bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-center">
    <p className={`text-2xl font-black ${color}`}>{value}</p>
    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
  </div>
);

export default History2025;
