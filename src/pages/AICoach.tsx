import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Brain, Target, AlertTriangle, Trophy, Zap, ClipboardList, Users, RefreshCw, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

type AnalysisItem = { id: string; type: string; text: string; detail: string; status: string };
type Standing = { pos: number; name: string; pj: number; pg: number; pp: number; pts: number; is_caf: boolean };
type Match = { rival: string; res: string; sets: string; date: string };
type ScoutRival = { rival: string };
type TeamAnalysis = { id: string; content: string; match_count: number; generated_at: string };

type GeneratedContent = { title: string; content: string };

const TABS = ['equipo', 'prepartido', 'entrenamiento'] as const;
type Tab = typeof TABS[number];

const AICoach = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('equipo');
  const [analysis, setAnalysis] = useState<AnalysisItem[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [rivals, setRivals] = useState<string[]>([]);
  const [teamAnalysis, setTeamAnalysis] = useState<TeamAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  // Pre-partido
  const [selectedRival, setSelectedRival] = useState('');
  const [customRival, setCustomRival] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);

  // Plan entrenamiento
  const [planFocus, setPlanFocus] = useState('general');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [plan, setPlan] = useState<GeneratedContent | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [aRes, sRes, mRes, rRes, taRes] = await Promise.all([
      supabase.from('analysis_items').select('*').order('sort_order'),
      supabase.from('standings').select('*').eq('season', '2026').order('pos'),
      supabase.from('matches26').select('rival, res, sets, date').order('date', { ascending: false }).limit(8),
      supabase.from('rival_scouting').select('rival').order('rival'),
      supabase.from('team_analysis').select('*').order('generated_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (aRes.data) setAnalysis(aRes.data);
    if (sRes.data) setStandings(sRes.data);
    if (mRes.data) setMatches(mRes.data);
    if (rRes.data) {
      const unique = [...new Set((rRes.data as ScoutRival[]).map(r => r.rival))];
      setRivals(unique);
    }
    if (taRes.data) setTeamAnalysis(taRes.data as TeamAnalysis);
    setLoading(false);
  };

  const callFlora = async (prompt: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('ai-coach', {
      body: { message: prompt, history: [] }
    });
    if (error) {
      let msg = 'Error en el servidor de IA';
      try {
        const body = await (error as any).context?.json?.();
        if (body?.error) msg = body.error;
      } catch { /* ignore parse errors */ }
      throw new Error(msg);
    }
    return data?.response || '';
  };

  const generatePreMatch = async () => {
    const rival = customRival.trim() || selectedRival;
    if (!rival) { toast.error('Seleccioná o escribí el nombre del rival'); return; }
    setGenerating(true);
    setGenerated(null);
    try {
      const caf = standings.find(s => s.is_caf);
      const recent = matches.slice(0, 3).map(m => `${m.rival} ${m.sets} (${m.res === 'win' ? 'V' : 'D'})`).join(', ');
      const debilidades = analysis.filter(i => i.type === 'weakness' && i.status !== 'conquered').map(i => i.text).join(', ');
      const fortalezas = analysis.filter(i => i.type === 'strength' && i.status !== 'conquered').map(i => i.text).join(', ');

      const prompt = `Generá una FICHA TÁCTICA PRE-PARTIDO completa para el CAF Funes vs ${rival}.

CONTEXTO DEL CAF:
- Posición actual: ${caf ? `${caf.pos}° (${caf.pts} pts, ${caf.pg}G ${caf.pp}D)` : 'No disponible'}
- Últimos resultados: ${recent || 'Sin partidos aún'}
- Fortalezas del equipo: ${fortalezas || 'Sin datos'}
- Puntos a mejorar: ${debilidades || 'Sin datos'}

La ficha debe incluir EXACTAMENTE estas secciones (texto plano, sin markdown, sin asteriscos):

SISTEMA DE JUEGO SUGERIDO VS ${rival.toUpperCase()}
[Sistema y rotación recomendada con justificación táctica]

DÓNDE ATACAR
• [zona/jugadora/estrategia de ataque 1]
• [zona/jugadora/estrategia de ataque 2]
• [zona/jugadora/estrategia de ataque 3]

DÓNDE SACAR
• [estrategia de saque 1 con zona/jugadora target]
• [estrategia de saque 2]

CÓMO DEFENDER
• [consigna defensiva 1]
• [consigna defensiva 2]
• [ajuste específico vs este rival]

CONSIGNA DEL PARTIDO
[Una frase corta y poderosa para unir al equipo antes del partido]

ALERTA TÁCTICA
[El principal riesgo de este partido y cómo neutralizarlo]`;

      const response = await callFlora(prompt);
      setGenerated({ title: `Ficha táctica vs ${rival}`, content: response });
    } catch (e: any) {
      console.error('Flora pre-partido error:', e);
      toast.error(e?.message || 'Error al generar la ficha. Revisá la conexión.');
    } finally {
      setGenerating(false);
    }
  };

  const generatePlan = async () => {
    setGeneratingPlan(true);
    setPlan(null);
    try {
      const debilidades = analysis.filter(i => i.type === 'weakness' && i.status !== 'conquered');
      const caf = standings.find(s => s.is_caf);

      const prompt = `Generá un PLAN DE ENTRENAMIENTO SEMANAL para el CAF Funes (Vóley Maxi Femenino Cat B).

CONTEXTO:
- Posición: ${caf ? `${caf.pos}° con ${caf.pts} pts` : 'Temporada en curso'}
- Foco del plan: ${planFocus}
- Debilidades actuales a trabajar: ${debilidades.map(d => `"${d.text}: ${d.detail}"`).join('; ') || 'Sin datos específicos'}

Generá un plan para 3 entrenamientos de la semana con este formato exacto (texto plano, sin asteriscos):

OBJETIVO DE LA SEMANA
[Objetivo concreto y medible en una oración]

ENTRENAMIENTO 1 — TÉCNICO-INDIVIDUAL (90 min)
Entrada en calor (15 min): [descripción]
Bloque 1 (25 min): [ejercicio principal con descripción]
Bloque 2 (25 min): [ejercicio secundario]
Bloque 3 (20 min): [trabajo específico]
Vuelta a la calma (5 min): [descripción]

ENTRENAMIENTO 2 — TÁCTICO-COLECTIVO (90 min)
Entrada en calor (15 min): [descripción]
Bloque 1 (30 min): [sistema/jugada colectiva]
Bloque 2 (30 min): [situación de juego]
Vuelta a la calma (15 min): [trabajo mental/elongación]

ENTRENAMIENTO 3 — COMPETITIVO (90 min)
Entrada en calor (15 min): [descripción]
Juego interno (50 min): [formato y consignas]
Análisis grupal (20 min): [dinámica de feedback]
Vuelta a la calma (5 min): [descripción]

INDICADORES DE PROGRESO
• [cómo medir si el objetivo se logró 1]
• [cómo medir si el objetivo se logró 2]`;

      const response = await callFlora(prompt);
      setPlan({ title: `Plan semanal — ${planFocus}`, content: response });
    } catch (e: any) {
      console.error('Flora plan error:', e);
      toast.error(e?.message || 'Error al generar el plan. Revisá la conexión.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const caf = standings.find(s => s.is_caf);
  const fortalezas = analysis.filter(i => i.type === 'strength' && i.status !== 'conquered');
  const debilidades = analysis.filter(i => i.type === 'weakness' && i.status !== 'conquered');
  const conquistadas = analysis.filter(i => i.status === 'conquered');
  const wins = matches.filter(m => m.res === 'win').length;
  const losses = matches.filter(m => m.res === 'loss').length;

  return (
    <Layout>
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-green-800 rounded-2xl flex items-center justify-center text-yellow-500 shadow-lg border border-green-700">
            <Brain size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-black">Panel <span className="text-green-500">Flora IA</span></h1>
            <p className="text-gray-400 text-sm">Herramientas tácticas inteligentes para el CAF</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 bg-[#111] border border-[#222] rounded-xl p-1 w-fit">
          {[
            { id: 'equipo', label: 'Estado del equipo', icon: <Users size={14} /> },
            { id: 'prepartido', label: 'Pre-partido', icon: <Target size={14} /> },
            { id: 'entrenamiento', label: 'Plan de entrenamiento', icon: <ClipboardList size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
                tab === t.id
                  ? 'bg-green-700 text-white shadow-md'
                  : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* TAB: ESTADO DEL EQUIPO */}
          {tab === 'equipo' && (
            <div className="space-y-6">
              {/* Stats rápidas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Posición" value={caf ? `${caf.pos}°` : '—'} color="text-yellow-500" sub="Temporada 2026" />
                <StatCard label="Puntos" value={caf ? String(caf.pts) : '—'} color="text-green-400" sub={caf ? `${caf.pg}G · ${caf.pp}D` : ''} />
                <StatCard label="Victorias" value={String(wins)} color="text-green-500" sub="Partidos cargados" />
                <StatCard label="Derrotas" value={String(losses)} color="text-red-400" sub="Partidos cargados" />
              </div>

              {/* Análisis Global Flora IA */}
              <div className="bg-[#141414] border border-[#222] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
                  <h3 className="text-sm font-black flex items-center gap-2 text-green-400">
                    <Sparkles size={15} /> Análisis global del equipo
                  </h3>
                  <button
                    onClick={() => navigate('/analisis')}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-green-400 flex items-center gap-1 transition-colors"
                  >
                    Pizarra táctica <ChevronRight size={12} />
                  </button>
                </div>
                {teamAnalysis ? (
                  <div className="p-5">
                    <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">
                      {teamAnalysis.content.slice(0, 320)}{teamAnalysis.content.length > 320 ? '...' : ''}
                    </p>
                    <button
                      onClick={() => navigate('/analisis')}
                      className="mt-3 text-xs font-black text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
                    >
                      Ver análisis completo <ChevronRight size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="p-5 text-center">
                    <p className="text-gray-600 text-sm mb-3">Aún no hay análisis generado.</p>
                    <button
                      onClick={() => navigate('/analisis')}
                      className="text-xs font-black text-green-400 hover:text-green-300 flex items-center gap-1 mx-auto transition-colors"
                    >
                      Ir a Pizarra Táctica para generar <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Fortalezas y A mejorar — chips compactos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#141414] border border-[#222] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Target size={13} /> Fortalezas ({fortalezas.length})
                    </h3>
                    <button onClick={() => navigate('/analisis')} className="text-[10px] text-gray-600 hover:text-green-400 font-bold flex items-center gap-0.5 transition-colors">
                      Administrar <ChevronRight size={10} />
                    </button>
                  </div>
                  {fortalezas.length === 0 ? (
                    <p className="text-gray-600 text-xs py-2">Sin datos cargados</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {fortalezas.map(f => (
                        <span key={f.id} className="px-2.5 py-1 bg-green-900/20 border border-green-900/30 rounded-full text-xs font-bold text-green-400">
                          {f.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#141414] border border-[#222] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={13} /> En trabajo ({debilidades.length})
                    </h3>
                    <button onClick={() => navigate('/analisis')} className="text-[10px] text-gray-600 hover:text-orange-400 font-bold flex items-center gap-0.5 transition-colors">
                      Administrar <ChevronRight size={10} />
                    </button>
                  </div>
                  {debilidades.length === 0 ? (
                    <p className="text-gray-600 text-xs py-2">¡Sin puntos pendientes!</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {debilidades.map(d => (
                        <span key={d.id} className="px-2.5 py-1 bg-orange-900/20 border border-orange-900/30 rounded-full text-xs font-bold text-orange-400">
                          {d.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Conquistadas — chips */}
              {conquistadas.length > 0 && (
                <div className="bg-[#141414] border border-yellow-900/20 rounded-2xl p-4">
                  <h3 className="text-xs font-black text-yellow-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Trophy size={13} /> Conquistadas ({conquistadas.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {conquistadas.map(c => (
                      <span key={c.id} className="px-2.5 py-1 bg-yellow-900/20 border border-yellow-900/30 rounded-full text-xs font-bold text-yellow-400">
                        {c.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Últimos resultados */}
              {matches.length > 0 && (
                <div className="bg-[#141414] border border-[#222] rounded-2xl p-5">
                  <h3 className="text-sm font-black text-gray-400 mb-4 flex items-center gap-2">
                    <Zap size={14} className="text-green-500" /> Últimos partidos
                  </h3>
                  <div className="space-y-2">
                    {matches.slice(0, 5).map((m, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-xl">
                        <span className="text-sm font-bold">vs {m.rival}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">{m.date}</span>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                            m.res === 'win' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                          }`}>{m.sets}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: PRE-PARTIDO */}
          {tab === 'prepartido' && (
            <div className="max-w-2xl space-y-5">
              <div className="bg-[#141414] border border-[#222] rounded-2xl p-6">
                <h3 className="font-black text-base mb-1 flex items-center gap-2">
                  <Target size={18} className="text-green-500" /> Ficha táctica pre-partido
                </h3>
                <p className="text-gray-500 text-xs mb-5">Flora genera una ficha completa con sistema sugerido, zonas de ataque, consignas y alertas tácticas.</p>

                <div className="space-y-4">
                  {rivals.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Rival con scouting</label>
                      <div className="flex flex-wrap gap-2">
                        {rivals.map(r => (
                          <button
                            key={r}
                            onClick={() => { setSelectedRival(r); setCustomRival(''); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              selectedRival === r && !customRival
                                ? 'bg-green-700 border-green-600 text-white'
                                : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:border-green-700 hover:text-white'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      {rivals.length > 0 ? 'O escribí otro rival' : 'Nombre del rival'}
                    </label>
                    <input
                      type="text"
                      placeholder="ej: Sportivo Guadalupe"
                      className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                      value={customRival}
                      onChange={e => { setCustomRival(e.target.value); setSelectedRival(''); }}
                    />
                  </div>

                  <button
                    onClick={generatePreMatch}
                    disabled={generating || (!selectedRival && !customRival.trim())}
                    className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-40 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    {generating
                      ? <><RefreshCw size={16} className="animate-spin" /> Generando ficha táctica...</>
                      : <><Sparkles size={16} /> Generar ficha táctica</>}
                  </button>
                </div>
              </div>

              {generated && (
                <div className="bg-[#0f0f0f] border border-green-900/40 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-green-900/30 flex items-center gap-2">
                    <Sparkles size={14} className="text-green-500" />
                    <span className="text-xs font-black text-green-400 uppercase tracking-widest">{generated.title}</span>
                  </div>
                  <div className="p-5 text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                    {generated.content}
                  </div>
                  <div className="px-5 py-3 border-t border-[#222] flex gap-2">
                    <button
                      onClick={generatePreMatch}
                      disabled={generating}
                      className="text-xs text-gray-600 hover:text-green-400 transition-colors flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Regenerar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: PLAN DE ENTRENAMIENTO */}
          {tab === 'entrenamiento' && (
            <div className="max-w-2xl space-y-5">
              <div className="bg-[#141414] border border-[#222] rounded-2xl p-6">
                <h3 className="font-black text-base mb-1 flex items-center gap-2">
                  <ClipboardList size={18} className="text-green-500" /> Plan de entrenamiento semanal
                </h3>
                <p className="text-gray-500 text-xs mb-5">Flora genera un plan de 3 entrenamientos adaptado a las debilidades actuales del equipo.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Foco de la semana</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'general', label: 'Trabajo general' },
                        { id: 'recepcion', label: 'Recepción' },
                        { id: 'ataque', label: 'Ataque y remate' },
                        { id: 'defensa', label: 'Defensa y cobertura' },
                        { id: 'saque', label: 'Saque táctico' },
                        { id: 'sistema', label: 'Sistema ofensivo' },
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setPlanFocus(f.id)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border text-left ${
                            planFocus === f.id
                              ? 'bg-green-700 border-green-600 text-white'
                              : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:border-green-700 hover:text-white'
                          }`}
                        >
                          <ChevronRight size={12} className="inline mr-1" />{f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={generatePlan}
                    disabled={generatingPlan}
                    className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-40 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    {generatingPlan
                      ? <><RefreshCw size={16} className="animate-spin" /> Generando plan...</>
                      : <><Sparkles size={16} /> Generar plan semanal</>}
                  </button>
                </div>
              </div>

              {plan && (
                <div className="bg-[#0f0f0f] border border-green-900/40 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-green-900/30 flex items-center gap-2">
                    <Sparkles size={14} className="text-green-500" />
                    <span className="text-xs font-black text-green-400 uppercase tracking-widest">{plan.title}</span>
                  </div>
                  <div className="p-5 text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                    {plan.content}
                  </div>
                  <div className="px-5 py-3 border-t border-[#222]">
                    <button
                      onClick={generatePlan}
                      disabled={generatingPlan}
                      className="text-xs text-gray-600 hover:text-green-400 transition-colors flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Regenerar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

const StatCard = ({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) => (
  <div className="bg-[#141414] border border-[#222] rounded-2xl p-4">
    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-3xl font-black ${color}`}>{value}</p>
    <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
  </div>
);

export default AICoach;
