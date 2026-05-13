import React, { useEffect, useState } from 'react';
import { supabase, Video } from '../lib/supabase';
import { getCache, setCache } from '../lib/cache';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Play, Tag, Plus, Trash2, Sparkles, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type VideoWithAnalysis = Video & { ai_analysis?: string | null };

const Videos = () => {
  const [videos, setVideos] = useState<VideoWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

  const [formData, setFormData] = useState<Partial<Video>>({
    yt_id: '', title: '', season: '2026',
    date: new Date().toISOString().split('T')[0], notes: '', tags: []
  });

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async (silent = false) => {
    const cached = getCache<VideoWithAnalysis[]>('videos');
    if (cached) { setVideos(cached); setLoading(false); }
    try {
      const { data, error } = await supabase.from('videos').select('*').order('date', { ascending: false });
      if (error) { if (!cached && !silent) toast.error('Error al cargar videos'); }
      else { setVideos(data || []); setCache('videos', data || []); }
    } catch { if (!cached && !silent) toast.error('Error de conexión'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('videos').insert([formData]);
    if (error) toast.error('Error al guardar video');
    else { toast.success('Video cargado'); setIsModalOpen(false); fetchVideos(); }
  };

  const deleteVideo = async (id: string) => {
    if (!confirm('¿Eliminar video?')) return;
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Video eliminado'); fetchVideos(); }
  };

  const analyzeVideo = async (video: VideoWithAnalysis) => {
    setAnalyzingId(video.id!);
    const rival = video.title.match(/CAF vs (.+?)( [–-]|$)/)?.[1]?.trim() || '';
    try {
      const { data, error } = await supabase.functions.invoke('analyze-single-video', {
        body: { video_id: video.id, yt_id: video.yt_id, title: video.title, notes: video.notes, rival }
      });
      if (error) throw error;
      toast.success('Análisis generado');
      fetchVideos();
    } catch {
      toast.error('Error al analizar');
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <Layout>
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black">Video <span className="text-green-500">Análisis</span></h1>
          <p className="text-gray-400">Partidos grabados · Análisis IA por video</p>
        </div>
        {isAdmin && (
          <button onClick={() => setIsModalOpen(true)}
            className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all">
            <Plus size={16} /> Agregar Video
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden group relative">
              {isAdmin && (
                <button onClick={() => deleteVideo(video.id!)}
                  className="absolute top-2 right-2 z-10 p-2 bg-red-900/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={14} />
                </button>
              )}

              {/* Thumbnail */}
              <div className="aspect-video bg-black relative flex items-center justify-center">
                <img
                  src={`https://img.youtube.com/vi/${video.yt_id}/maxresdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                />
                <a href={`https://youtube.com/watch?v=${video.yt_id}`} target="_blank" rel="noreferrer"
                  className="absolute w-14 h-14 bg-green-600 rounded-full flex items-center justify-center text-white shadow-2xl transform group-hover:scale-110 transition-transform">
                  <Play fill="currentColor" size={20} />
                </a>
              </div>

              {/* Info */}
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-base leading-tight flex-1 pr-2">{video.title}</h3>
                  <span className="text-[10px] bg-[#242424] px-2 py-1 rounded text-gray-400 font-bold flex-shrink-0">{video.date}</span>
                </div>
                {video.notes && <p className="text-gray-400 text-xs mb-3">{video.notes}</p>}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {video.tags?.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 text-[10px] bg-green-900/20 text-green-500 px-2 py-0.5 rounded-full font-bold">
                      <Tag size={9} /> {tag}
                    </span>
                  ))}
                </div>

                {/* Análisis IA — siempre visible si existe */}
                {video.ai_analysis ? (
                  <div className="mt-1 bg-[#0f0f0f] border border-purple-900/30 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-purple-900/20">
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-purple-400 uppercase tracking-widest">
                        <Sparkles size={10} /> Análisis Flora IA
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => analyzeVideo(video)}
                          disabled={analyzingId === video.id}
                          title="Re-analizar"
                          className="text-[10px] text-gray-600 hover:text-purple-400 transition-colors disabled:opacity-40 flex items-center gap-1"
                        >
                          {analyzingId === video.id
                            ? <Loader size={10} className="animate-spin" />
                            : <Sparkles size={10} />}
                          {analyzingId === video.id ? 'Analizando...' : 'Re-analizar'}
                        </button>
                      )}
                    </div>
                    <div className="px-4 py-3 text-xs text-gray-300 leading-relaxed whitespace-pre-line min-h-[6rem]">
                      {video.ai_analysis}
                    </div>
                  </div>
                ) : isAdmin ? (
                  <button
                    onClick={() => analyzeVideo(video)}
                    disabled={analyzingId === video.id}
                    className="w-full flex items-center justify-center gap-2 text-xs font-black text-purple-400 bg-purple-900/10 border border-dashed border-purple-900/30 rounded-xl px-3 py-3 hover:bg-purple-900/20 transition-all disabled:opacity-50"
                  >
                    {analyzingId === video.id
                      ? <><Loader size={12} className="animate-spin" /> Analizando con IA...</>
                      : <><Sparkles size={12} /> Analizar este video con IA</>}
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-600 bg-[#141414] rounded-xl px-3 py-3 border border-[#222]">
                    <Sparkles size={12} /> Análisis pendiente
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
            <input type="text" required
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
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
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas para el análisis IA</label>
            <textarea rows={3} placeholder="Observaciones sobre el partido, jugadas clave, situaciones a analizar..."
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
