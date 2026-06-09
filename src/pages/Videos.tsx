import React, { useEffect, useState } from 'react';
import { supabase, Video } from '../lib/supabase';
import { getCache, setCache, clearCache } from '../lib/cache';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Play, Plus, Trash2, Sparkles, Loader, Video as VideoIcon, LayoutList, RefreshCw, Film } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type VideoWithAnalysis = Video & { ai_analysis?: string | null };

type MatchGroup = {
  rival: string;
  date: string;
  season: string;
  videos: VideoWithAnalysis[];
};

const extractRival = (title: string): string => {
  const m = title.match(/vs\.?\s+([^–—\-]+?)(?:\s*[–—\-]|$)/i);
  return m?.[1]?.trim() || 'Desconocido';
};

const groupByMatch = (videos: VideoWithAnalysis[]): MatchGroup[] => {
  const groups: Record<string, VideoWithAnalysis[]> = {};
  for (const v of videos) {
    const rival = extractRival(v.title);
    const key = `${rival}__${v.date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  }
  return Object.entries(groups)
    .map(([, vids]) => {
      const sorted = [...vids].sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
      return {
        rival: extractRival(sorted[0].title),
        date: sorted[0].date,
        season: sorted[0].season || '2025',
        videos: sorted,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
};

const extractYtId = (input: string): string | null => {
  const s = input.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return null;
};

const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

const Videos = () => {
  const [videos, setVideos] = useState<VideoWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analyzingMatch, setAnalyzingMatch] = useState<string | null>(null);
  const [tab, setTab] = useState<'analisis' | 'galeria'>('analisis');
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

  const [rival, setRival] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [season, setSeason] = useState('2026');
  const [notes, setNotes] = useState('');
  const [urlsText, setUrlsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parsedUrls = urlsText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => ({ raw: l, id: extractYtId(l) }));

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async (silent = false) => {
    const cached = getCache<VideoWithAnalysis[]>('videos');
    if (cached) { setVideos(cached); setLoading(false); }
    try {
      const { data, error } = await supabase.from('videos').select('*').order('date', { ascending: false }).order('title');
      if (error) { if (!cached && !silent) toast.error('Error al cargar videos'); }
      else { setVideos(data || []); setCache('videos', data || []); }
    } catch { if (!cached && !silent) toast.error('Error de conexión'); }
    finally { setLoading(false); }
  };

  const analyzeMatch = async (group: MatchGroup) => {
    const key = `${group.rival}_${group.date}`;
    setAnalyzingMatch(key);
    const firstVideo = group.videos[0];
    const partNotes = group.videos
      .map(v => v.notes ?? null).filter(Boolean).join('. ')
      || `Partido oficial vs ${group.rival}, ${group.season}`;
    try {
      const { data, error } = await supabase.functions.invoke('analyze-single-video', {
        body: {
          video_id: firstVideo.id,
          title: `CAF vs ${group.rival} — Partido completo (${group.videos.length} parte${group.videos.length !== 1 ? 's' : ''})`,
          notes: `${partNotes}. Temporada: ${group.season}. Este es el análisis del partido completo.`,
          rival: group.rival,
        }
      });
      if (error) throw error;
      if (data?.analysis) {
        toast.success(`Análisis de vs ${group.rival} generado`);
        clearCache('videos');
        fetchVideos(true);
      }
    } catch (e: any) {
      let msg = `Error al analizar vs ${group.rival}`;
      try { const body = await e?.context?.json?.(); if (body?.error) msg = body.error; } catch { /**/ }
      toast.error(msg);
    } finally { setAnalyzingMatch(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = parsedUrls.filter(u => u.id);
    if (valid.length === 0) { toast.error('Ninguna URL válida de YouTube'); return; }
    if (!rival.trim()) { toast.error('Ingresá el nombre del rival'); return; }
    setSubmitting(true);
    const rows = valid.map((u, i) => ({
      yt_id: u.id!,
      title: valid.length === 1 ? `CAF vs ${rival.trim()}` : `CAF vs ${rival.trim()} – Parte ${i + 1}`,
      date: matchDate, season,
      notes: notes || null,
      tags: [],
    }));
    const { error } = await supabase.from('videos').insert(rows);
    setSubmitting(false);
    if (error) toast.error('Error al guardar: ' + error.message);
    else {
      toast.success(`${rows.length} video${rows.length > 1 ? 's' : ''} cargado${rows.length > 1 ? 's' : ''}`);
      setIsModalOpen(false);
      setRival(''); setUrlsText(''); setNotes('');
      clearCache('videos'); fetchVideos();
    }
  };

  const deleteVideo = async (id: string) => {
    if (!confirm('¿Eliminar video?')) return;
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Video eliminado'); clearCache('videos'); fetchVideos(); }
  };

  const matches = groupByMatch(videos);

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black">Videos <span className="text-green-500">&amp; Jugadas</span></h1>
          <p className="text-gray-500 text-xs mt-0.5">
            {videos.length} video{videos.length !== 1 ? 's' : ''} · {matches.length} partido{matches.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-[11px] font-black transition-all"
          >
            <Plus size={13} /> Cargar video
          </button>
        )}
      </div>

      {/* Tabs compactos */}
      <div className="flex gap-1 mb-4 bg-[#111] border border-[#1e1e1e] rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('analisis')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${tab === 'analisis' ? 'bg-green-700 text-white' : 'text-gray-500 hover:text-white'}`}
        >
          <LayoutList size={12} /> Por partido
        </button>
        <button
          onClick={() => setTab('galeria')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${tab === 'galeria' ? 'bg-green-700 text-white' : 'text-gray-500 hover:text-white'}`}
        >
          <Film size={12} /> Galería
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── ANÁLISIS POR PARTIDO ── */}
          {tab === 'analisis' && (
            <div className="space-y-3">
              {matches.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                  <VideoIcon size={36} className="text-gray-700 mb-3" />
                  <p className="text-gray-500 text-sm font-bold">Sin videos cargados</p>
                  {isAdmin && <p className="text-gray-600 text-xs mt-1">Cargá el primero con "Cargar video"</p>}
                </div>
              ) : matches.map(group => {
                const matchKey = `${group.rival}_${group.date}`;
                const isAnalyzing = analyzingMatch === matchKey;
                const analysis = group.videos[0]?.ai_analysis;

                return (
                  <div key={matchKey} className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                    {/* Cabecera del partido */}
                    <div className="p-4 flex items-center gap-3">
                      {/* Miniatura */}
                      <div className="relative w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                        <img
                          src={`https://img.youtube.com/vi/${group.videos[0].yt_id}/mqdefault.jpg`}
                          alt=""
                          className="w-full h-full object-cover opacity-70"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <Play size={7} fill="white" className="text-white ml-0.5" />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-black text-sm">vs {group.rival}</span>
                          <span className="text-[10px] text-gray-600">{group.season}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-500">{fmtDate(group.date)}</span>
                          <span className="text-gray-700">·</span>
                          {/* Links a partes */}
                          {group.videos.map((v, i) => (
                            <a
                              key={v.id}
                              href={`https://youtube.com/watch?v=${v.yt_id}`}
                              target="_blank" rel="noreferrer"
                              className="flex items-center gap-0.5 text-[10px] text-green-500 hover:text-green-400 font-bold transition-colors"
                            >
                              <Play size={7} fill="currentColor" />
                              {group.videos.length === 1 ? 'Ver' : `P${i + 1}`}
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Botón analizar */}
                      {isAdmin && (
                        <button
                          onClick={() => analyzeMatch(group)}
                          disabled={isAnalyzing}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all disabled:opacity-50 ${
                            analysis
                              ? 'bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-gray-500 hover:text-purple-400'
                              : 'bg-purple-900/25 hover:bg-purple-900/40 border border-purple-800/30 text-purple-400'
                          }`}
                        >
                          {isAnalyzing
                            ? <><Loader size={11} className="animate-spin" /> Analizando</>
                            : analysis
                              ? <><RefreshCw size={11} /> Re-analizar</>
                              : <><Sparkles size={11} /> Analizar</>}
                        </button>
                      )}
                    </div>

                    {/* Análisis */}
                    {analysis ? (
                      <div className="border-t border-[#1a1a1a] px-4 pb-4 pt-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles size={10} className="text-purple-400" />
                          <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Flora IA · Análisis táctico</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{analysis}</p>
                      </div>
                    ) : !isAnalyzing && (
                      <div className="border-t border-[#161616] px-4 py-2.5 flex items-center gap-2">
                        <Sparkles size={11} className="text-gray-700" />
                        <span className="text-[11px] text-gray-600">
                          {isAdmin ? 'Clic en "Analizar" para generar el análisis táctico' : 'Análisis pendiente'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── GALERÍA ── */}
          {tab === 'galeria' && (
            <>
              {videos.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                  <Film size={36} className="text-gray-700 mb-3" />
                  <p className="text-gray-500 text-sm font-bold">Sin videos</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {videos.map(video => (
                    <div key={video.id} className="group bg-[#111] border border-[#1e1e1e] rounded-xl overflow-hidden relative">
                      {isAdmin && (
                        <button
                          onClick={() => deleteVideo(video.id!)}
                          className="absolute top-1.5 right-1.5 z-10 p-1.5 bg-black/70 text-gray-400 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      <div className="aspect-video bg-black relative overflow-hidden">
                        <img
                          src={`https://img.youtube.com/vi/${video.yt_id}/mqdefault.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-50 transition-opacity"
                        />
                        <a
                          href={`https://youtube.com/watch?v=${video.yt_id}`}
                          target="_blank" rel="noreferrer"
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="w-10 h-10 bg-green-600/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play fill="white" size={14} className="ml-0.5" />
                          </div>
                        </a>
                        {video.ai_analysis && (
                          <span className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-[8px] bg-purple-900/80 text-purple-300 px-1.5 py-0.5 rounded-full font-bold">
                            <Sparkles size={7} /> IA
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="font-bold text-xs leading-tight line-clamp-1">{video.title}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{fmtDate(video.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modal cargar video */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cargar Videos del Partido">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
              Links de YouTube <span className="text-gray-600 normal-case font-normal">(uno por línea)</span>
            </label>
            <textarea
              rows={4}
              placeholder={"https://youtube.com/watch?v=abc123\nhttps://youtu.be/xyz456"}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 font-mono resize-none transition-colors placeholder-gray-700"
              value={urlsText}
              onChange={e => setUrlsText(e.target.value)}
            />
            {urlsText.trim() && (
              <div className="mt-1.5 space-y-1">
                {parsedUrls.map((u, i) => (
                  <div key={i} className={`flex items-center gap-2 text-[10px] px-2 py-1 rounded-lg ${u.id ? 'bg-green-900/15 text-green-400' : 'bg-red-900/15 text-red-400'}`}>
                    {u.id ? <Play size={7} fill="currentColor" /> : <span className="font-bold">✕</span>}
                    <span className="truncate">{u.id ? `Parte ${i + 1} → ${u.id}` : `Inválida: ${u.raw}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Rival</label>
            <input
              type="text" required
              placeholder="ej: CAI Azul"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
              value={rival} onChange={e => setRival(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Fecha</label>
              <input
                type="date" required
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                value={matchDate} onChange={e => setMatchDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Temporada</label>
              <input
                type="text"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                value={season} onChange={e => setSeason(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Notas del partido</label>
            <textarea
              rows={2}
              placeholder="Resultado, contexto, observaciones..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 resize-none transition-colors placeholder-gray-700"
              value={notes} onChange={e => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || parsedUrls.filter(u => u.id).length === 0}
            className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 py-2.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Loader size={14} className="animate-spin" /> Guardando...</>
              : `Cargar ${parsedUrls.filter(u => u.id).length || ''} video${parsedUrls.filter(u => u.id).length !== 1 ? 's' : ''}`}
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default Videos;
