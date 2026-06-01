import React, { useEffect, useState } from 'react';
import { supabase, Video } from '../lib/supabase';
import { getCache, setCache, clearCache } from '../lib/cache';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Play, Tag, Plus, Trash2, Sparkles, Loader, Video as VideoIcon, ClipboardList, RefreshCw } from 'lucide-react';
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

const Videos = () => {
  const [videos, setVideos] = useState<VideoWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analyzingMatch, setAnalyzingMatch] = useState<string | null>(null);
  const [tab, setTab] = useState<'galeria' | 'analisis'>('analisis');
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

  const [formData, setFormData] = useState<Partial<Video>>({
    yt_id: '', title: '', season: '2025',
    date: new Date().toISOString().split('T')[0], notes: '', tags: []
  });

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
      .map(v => v.notes ? v.notes : null).filter(Boolean)
      .join('. ') || `Partido oficial vs ${group.rival}, ${group.season}`;

    try {
      const { data, error } = await supabase.functions.invoke('analyze-single-video', {
        body: {
          video_id: firstVideo.id,
          title: `CAF vs ${group.rival} — Partido completo (${group.videos.length} parte${group.videos.length !== 1 ? 's' : ''})`,
          notes: `${partNotes}. Temporada: ${group.season}. Este es el análisis del partido completo, no de un clip aislado.`,
          rival: group.rival,
        }
      });
      if (error) throw error;
      if (data?.analysis) {
        toast.success(`Análisis de vs ${group.rival} generado`);
        clearCache('videos');
        fetchVideos(true);
      }
    } catch {
      toast.error(`Error al analizar vs ${group.rival}`);
    } finally {
      setAnalyzingMatch(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('videos').insert([formData]);
    if (error) toast.error('Error al guardar video');
    else { toast.success('Video cargado'); setIsModalOpen(false); clearCache('videos'); fetchVideos(); }
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
      <header className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-black">Video <span className="text-green-500">Análisis</span></h1>
          <p className="text-gray-400 text-sm">{videos.length} videos · {matches.length} partidos grabados</p>
        </div>
        {isAdmin && (
          <button onClick={() => setIsModalOpen(true)}
            className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all">
            <Plus size={16} /> Agregar Video
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[#111] border border-[#222] rounded-xl p-1 w-fit">
        <button onClick={() => setTab('analisis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${tab === 'analisis' ? 'bg-green-700 text-white' : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'}`}>
          <ClipboardList size={14} /> Análisis por Partido
        </button>
        <button onClick={() => setTab('galeria')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${tab === 'galeria' ? 'bg-green-700 text-white' : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'}`}>
          <VideoIcon size={14} /> Galería de Videos
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* TAB: ANÁLISIS POR PARTIDO */}
          {tab === 'analisis' && (
            <div className="space-y-6">
              {matches.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                  <ClipboardList size={48} className="text-gray-700 mb-4" />
                  <p className="text-gray-500">No hay videos cargados todavía.</p>
                </div>
              ) : matches.map(group => {
                const matchKey = `${group.rival}_${group.date}`;
                const isAnalyzing = analyzingMatch === matchKey;
                const analysis = group.videos[0]?.ai_analysis;
                const dateFormatted = new Date(group.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

                return (
                  <div key={matchKey} className="bg-[#141414] border border-[#222] rounded-2xl overflow-hidden">
                    {/* Match header */}
                    <div className="p-5 border-b border-[#222] flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-black">vs {group.rival}</h3>
                          <span className="text-[10px] font-black bg-[#242424] px-2 py-0.5 rounded text-gray-500">{group.season}</span>
                        </div>
                        <p className="text-xs text-gray-500">{dateFormatted} · {group.videos.length} parte{group.videos.length !== 1 ? 's' : ''} grabada{group.videos.length !== 1 ? 's' : ''}</p>
                        {/* Video part chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {group.videos.map((v, i) => (
                            <a key={v.id} href={`https://youtube.com/watch?v=${v.yt_id}`} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-[10px] bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] px-2 py-0.5 rounded-full font-bold text-gray-400 hover:text-white transition-all">
                              <Play size={8} fill="currentColor" />
                              {group.videos.length === 1 ? 'Ver video' : `Parte ${i + 1}`}
                            </a>
                          ))}
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => analyzeMatch(group)}
                          disabled={isAnalyzing}
                          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50 ${
                            analysis
                              ? 'bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] text-gray-400 hover:text-purple-400'
                              : 'bg-purple-900/30 hover:bg-purple-900/50 border border-purple-900/40 text-purple-400'
                          }`}
                        >
                          {isAnalyzing
                            ? <><Loader size={14} className="animate-spin" /> Analizando...</>
                            : analysis
                              ? <><RefreshCw size={14} /> Re-analizar</>
                              : <><Sparkles size={14} /> Analizar partido</>}
                        </button>
                      )}
                    </div>

                    {/* Analysis content */}
                    {analysis ? (
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles size={12} className="text-purple-400" />
                          <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Análisis Flora IA — Partido completo</span>
                        </div>
                        <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line bg-[#0f0f0f] border border-purple-900/20 rounded-xl p-4">
                          {analysis}
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 py-4 flex items-center gap-3 text-gray-600">
                        <Sparkles size={14} />
                        <span className="text-xs">
                          {isAdmin
                            ? 'Hacé clic en "Analizar partido" para generar el análisis táctico completo de este partido.'
                            : 'Análisis pendiente.'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: GALERÍA */}
          {tab === 'galeria' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map(video => (
                <div key={video.id} className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden group relative">
                  {isAdmin && (
                    <button onClick={() => deleteVideo(video.id!)}
                      className="absolute top-2 right-2 z-10 p-2 bg-red-900/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="aspect-video bg-black relative flex items-center justify-center">
                    <img
                      src={`https://img.youtube.com/vi/${video.yt_id}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                    />
                    <a href={`https://youtube.com/watch?v=${video.yt_id}`} target="_blank" rel="noreferrer"
                      className="absolute w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white shadow-xl transform group-hover:scale-110 transition-transform">
                      <Play fill="currentColor" size={18} />
                    </a>
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-sm leading-tight mb-1">{video.title}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-500">{video.date}</p>
                      {video.ai_analysis && (
                        <span className="flex items-center gap-1 text-[10px] text-purple-400 font-bold">
                          <Sparkles size={10} /> Analizado
                        </span>
                      )}
                    </div>
                    {video.notes && <p className="text-[11px] text-gray-600 mt-1 truncate">{video.notes}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {video.tags?.map((tag, i) => (
                        <span key={i} className="flex items-center gap-1 text-[9px] bg-green-900/20 text-green-500 px-1.5 py-0.5 rounded-full font-bold">
                          <Tag size={8} /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal agregar video */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cargar Video">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID de YouTube</label>
            <input type="text" required placeholder="ej: dQw4w9WgXcQ"
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.yt_id} onChange={e => setFormData({ ...formData, yt_id: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
            <input type="text" required placeholder="ej: CAF vs CAI Azul – Parte 1"
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            <p className="text-[10px] text-gray-600 mt-1">Usá el formato: CAF vs RIVAL – Parte N para agrupar automáticamente</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
              <input type="date" required
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Temporada</label>
              <input type="text"
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                value={formData.season} onChange={e => setFormData({ ...formData, season: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas del partido</label>
            <textarea rows={2} placeholder="Observaciones sobre el partido, resultado, contexto..."
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
          </div>
          <button type="submit" className="w-full bg-green-700 hover:bg-green-600 py-3 rounded-xl font-black text-sm transition-all">
            Publicar Video
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default Videos;
