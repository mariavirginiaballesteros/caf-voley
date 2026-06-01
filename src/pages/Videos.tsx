import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import {
  Play, Plus, Trash2, Sparkles, Loader, Video as VideoIcon,
  ClipboardList, RefreshCw, Link2, CheckSquare, Square, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type VideoRow = {
  id: string;
  yt_id: string;
  title: string;
  date: string;
  season: string;
  notes?: string;
  tags?: string[];
  ai_analysis?: string | null;
};

type MatchRow = {
  id: string;
  rival: string;
  date: string;
  res: string;
  cond: string;
  fase: string;
  sets: string;
};

type MatchGroup = {
  match: MatchRow;
  videos: VideoRow[];
};

const ytThumb = (yt_id: string) => `https://img.youtube.com/vi/${yt_id}/mqdefault.jpg`;

const resLabel = (res: string) => {
  if (res === 'win') return { label: 'Victoria', cls: 'text-green-400 bg-green-900/20' };
  if (res === 'loss') return { label: 'Derrota', cls: 'text-red-400 bg-red-900/20' };
  return { label: 'Pendiente', cls: 'text-gray-400 bg-[#222]' };
};

const Videos = () => {
  const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([]);
  const [ungrouped, setUngrouped] = useState<VideoRow[]>([]);
  const [allMatches, setAllMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'partidos' | 'sin_grupo' | 'galeria'>('partidos');

  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkMatchId, setLinkMatchId] = useState('');
  const [linking, setLinking] = useState(false);

  const [analyzingMatchId, setAnalyzingMatchId] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    yt_id: '', title: '',
    date: new Date().toISOString().split('T')[0],
    season: '2026', notes: '',
  });

  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mvRes, videosRes, matchesRes] = await Promise.all([
        supabase
          .from('match_videos')
          .select('match_id, video_id, matches26(id, rival, date, res, cond, fase, sets), videos(*)'),
        supabase.from('videos').select('*').order('date', { ascending: false }),
        supabase
          .from('matches26')
          .select('id, rival, date, res, cond, fase, sets')
          .order('date', { ascending: false }),
      ]);

      const matches = (matchesRes.data || []) as MatchRow[];
      setAllMatches(matches);

      const mvRows = mvRes.data || [];
      const groupMap: Record<string, { match: MatchRow; videoIds: Set<string>; videos: VideoRow[] }> = {};
      const linkedVideoIds = new Set<string>();

      for (const mv of mvRows) {
        const matchData = mv.matches26 as unknown as MatchRow;
        const videoData = mv.videos as unknown as VideoRow;
        if (!matchData || !videoData) continue;
        linkedVideoIds.add(mv.video_id);
        if (!groupMap[mv.match_id]) {
          groupMap[mv.match_id] = { match: matchData, videoIds: new Set(), videos: [] };
        }
        if (!groupMap[mv.match_id].videoIds.has(videoData.id)) {
          groupMap[mv.match_id].videoIds.add(videoData.id);
          groupMap[mv.match_id].videos.push(videoData);
        }
      }

      const groups: MatchGroup[] = Object.values(groupMap)
        .map(g => ({
          match: g.match,
          videos: [...g.videos].sort((a, b) =>
            a.title.localeCompare(b.title, undefined, { numeric: true })
          ),
        }))
        .sort((a, b) => b.match.date.localeCompare(a.match.date));

      setMatchGroups(groups);

      const allVideos = (videosRes.data || []) as VideoRow[];
      setUngrouped(allVideos.filter(v => !linkedVideoIds.has(v.id)));
    } catch {
      toast.error('Error al cargar videos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const allVideos = [...matchGroups.flatMap(g => g.videos), ...ungrouped];

  const analyzeMatch = async (group: MatchGroup) => {
    setAnalyzingMatchId(group.match.id);
    const firstVideo = group.videos[0];
    if (!firstVideo) {
      toast.error('No hay videos en este partido');
      setAnalyzingMatchId(null);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('analyze-single-video', {
        body: {
          video_id: firstVideo.id,
          title: `CAF vs ${group.match.rival} — Partido completo (${group.videos.length} parte${group.videos.length !== 1 ? 's' : ''})`,
          notes: `Temporada ${firstVideo.season || '2026'}. ${group.match.fase ? group.match.fase + '.' : ''} Resultado: ${group.match.sets || group.match.res}. Análisis del partido completo, grabado en ${group.videos.length} partes.`,
          rival: group.match.rival,
        },
      });
      if (error) throw error;
      if (data?.analysis) {
        toast.success(`Análisis vs ${group.match.rival} generado`);
        fetchAll();
      }
    } catch {
      toast.error('Error al analizar el partido');
    } finally {
      setAnalyzingMatchId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedVideoIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleLinkVideos = async () => {
    if (!linkMatchId || selectedVideoIds.size === 0) return;
    setLinking(true);
    try {
      const rows = [...selectedVideoIds].map(video_id => ({ match_id: linkMatchId, video_id }));
      const { error } = await supabase.from('match_videos').insert(rows);
      if (error) throw error;
      toast.success(`${selectedVideoIds.size} video${selectedVideoIds.size !== 1 ? 's' : ''} vinculado${selectedVideoIds.size !== 1 ? 's' : ''}`);
      setSelectedVideoIds(new Set());
      setLinkMatchId('');
      setLinkModalOpen(false);
      fetchAll();
    } catch {
      toast.error('Error al vincular videos');
    } finally {
      setLinking(false);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('videos').insert([{ ...formData, id: formData.yt_id }]);
    if (error) toast.error('Error al guardar video');
    else {
      toast.success('Video agregado');
      setAddModalOpen(false);
      setFormData({ yt_id: '', title: '', date: new Date().toISOString().split('T')[0], season: '2026', notes: '' });
      fetchAll();
    }
  };

  const deleteVideo = async (id: string) => {
    if (!confirm('¿Eliminar video?')) return;
    await supabase.from('match_videos').delete().eq('video_id', id);
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Video eliminado'); fetchAll(); }
  };

  const totalVideos = matchGroups.reduce((a, g) => a + g.videos.length, 0) + ungrouped.length;

  return (
    <Layout>
      <header className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-black">Video <span className="text-green-500">Análisis</span></h1>
          <p className="text-gray-400 text-sm">
            {totalVideos} videos · {matchGroups.length} partido{matchGroups.length !== 1 ? 's' : ''} con video
            {ungrouped.length > 0 && ` · ${ungrouped.length} sin agrupar`}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setAddModalOpen(true)}
            className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all">
            <Plus size={16} /> Agregar Video
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[#111] border border-[#222] rounded-xl p-1 w-fit flex-wrap">
        <button onClick={() => setTab('partidos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${tab === 'partidos' ? 'bg-green-700 text-white' : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'}`}>
          <ClipboardList size={14} /> Por Partido
        </button>
        {isAdmin && (
          <button onClick={() => { setTab('sin_grupo'); setSelectedVideoIds(new Set()); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${tab === 'sin_grupo' ? 'bg-yellow-700 text-white' : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'}`}>
            <Link2 size={14} /> Sin agrupar
            {ungrouped.length > 0 && (
              <span className="bg-yellow-600 text-white rounded-full px-1.5 py-0.5 text-[9px] leading-none">{ungrouped.length}</span>
            )}
          </button>
        )}
        <button onClick={() => setTab('galeria')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${tab === 'galeria' ? 'bg-green-700 text-white' : 'text-gray-500 hover:text-white hover:bg-[#1a1a1a]'}`}>
          <VideoIcon size={14} /> Galería
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* TAB: POR PARTIDO */}
          {tab === 'partidos' && (
            <div className="space-y-6">
              {matchGroups.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                  <ClipboardList size={48} className="text-gray-700 mb-4" />
                  <p className="text-gray-500">No hay videos vinculados a partidos todavía.</p>
                  {isAdmin && (
                    <p className="text-gray-600 text-xs mt-2">
                      Cargá videos y vincinálos desde la pestaña "Sin agrupar".
                    </p>
                  )}
                </div>
              ) : matchGroups.map(group => {
                const isAnalyzing = analyzingMatchId === group.match.id;
                const analysis = group.videos.find(v => v.ai_analysis)?.ai_analysis;
                const { label, cls } = resLabel(group.match.res);
                const dateFormatted = new Date(group.match.date + 'T12:00:00').toLocaleDateString('es-AR', {
                  day: '2-digit', month: 'short', year: 'numeric',
                });

                return (
                  <div key={group.match.id} className="bg-[#141414] border border-[#222] rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-[#222] flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-xl font-black">vs {group.match.rival}</h3>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${cls}`}>{label}</span>
                          <span className="text-[10px] font-black bg-[#242424] px-2 py-0.5 rounded text-gray-500">{group.match.cond}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {dateFormatted}
                          {group.match.fase ? ` · ${group.match.fase}` : ''}
                          {group.match.sets ? ` · ${group.match.sets}` : ''}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {group.videos.length} parte{group.videos.length !== 1 ? 's' : ''} grabada{group.videos.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
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
                        <button onClick={() => analyzeMatch(group)} disabled={isAnalyzing}
                          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50 ${
                            analysis
                              ? 'bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] text-gray-400 hover:text-purple-400'
                              : 'bg-purple-900/30 hover:bg-purple-900/50 border border-purple-900/40 text-purple-400'
                          }`}>
                          {isAnalyzing
                            ? <><Loader size={14} className="animate-spin" /> Analizando...</>
                            : analysis
                              ? <><RefreshCw size={14} /> Re-analizar</>
                              : <><Sparkles size={14} /> Analizar</>}
                        </button>
                      )}
                    </div>

                    {analysis ? (
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles size={12} className="text-purple-400" />
                          <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Análisis Flora IA</span>
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
                            ? 'Clic en "Analizar" para generar el análisis táctico completo del partido.'
                            : 'Análisis pendiente.'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: SIN AGRUPAR */}
          {tab === 'sin_grupo' && isAdmin && (
            <div className="pb-24">
              {ungrouped.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                  <Link2 size={48} className="text-gray-700 mb-4" />
                  <p className="text-gray-500">Todos los videos están vinculados a un partido.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-4">
                    Seleccioná los videos que pertenecen a un mismo partido y vincinálos.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ungrouped.map(video => {
                      const selected = selectedVideoIds.has(video.id);
                      return (
                        <div key={video.id} onClick={() => toggleSelect(video.id)}
                          className={`bg-[#1a1a1a] border rounded-xl overflow-hidden cursor-pointer transition-all select-none ${
                            selected ? 'border-green-500 ring-1 ring-green-500' : 'border-[#333] hover:border-[#555]'
                          }`}>
                          <div className="aspect-video bg-black relative">
                            <img src={ytThumb(video.yt_id)} alt={video.title} className="w-full h-full object-cover opacity-70" />
                            <div className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                              selected ? 'bg-green-500' : 'bg-black/60 border border-[#555]'
                            }`}>
                              {selected
                                ? <CheckSquare size={14} className="text-white" />
                                : <Square size={14} className="text-gray-400" />}
                            </div>
                            <button onClick={e => { e.stopPropagation(); deleteVideo(video.id); }}
                              className="absolute top-2 right-2 p-1.5 bg-red-900/80 text-white rounded-lg opacity-0 hover:opacity-100 transition-opacity">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="p-3">
                            <p className="font-bold text-xs leading-snug mb-0.5 truncate">{video.title}</p>
                            <p className="text-[10px] text-gray-600">{video.date}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {selectedVideoIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1a1a] border border-green-500/50 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl whitespace-nowrap">
                  <span className="text-sm font-black text-white">
                    {selectedVideoIds.size} video{selectedVideoIds.size !== 1 ? 's' : ''} seleccionado{selectedVideoIds.size !== 1 ? 's' : ''}
                  </span>
                  <button onClick={() => { setLinkMatchId(''); setLinkModalOpen(true); }}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all">
                    <Link2 size={14} /> Vincular a partido
                  </button>
                  <button onClick={() => setSelectedVideoIds(new Set())}
                    className="text-gray-500 hover:text-white transition-all">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: GALERÍA */}
          {tab === 'galeria' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allVideos.map(video => (
                <div key={video.id} className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden group relative">
                  {isAdmin && (
                    <button onClick={() => deleteVideo(video.id)}
                      className="absolute top-2 right-2 z-10 p-2 bg-red-900/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="aspect-video bg-black relative flex items-center justify-center">
                    <img src={ytThumb(video.yt_id)} alt={video.title}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                    <a href={`https://youtube.com/watch?v=${video.yt_id}`} target="_blank" rel="noreferrer"
                      className="absolute w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white shadow-xl transform group-hover:scale-110 transition-transform">
                      <Play fill="currentColor" size={18} />
                    </a>
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-sm leading-tight mb-1">{video.title}</p>
                    <p className="text-[10px] text-gray-500">{video.date}</p>
                    {video.ai_analysis && (
                      <span className="flex items-center gap-1 text-[10px] text-purple-400 font-bold mt-1">
                        <Sparkles size={10} /> Analizado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal: Vincular a partido */}
      <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)}
        title={`Vincular ${selectedVideoIds.size} video${selectedVideoIds.size !== 1 ? 's' : ''} a un partido`}>
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Elegí el partido al que pertenecen estos videos:</p>
          <select
            className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
            value={linkMatchId}
            onChange={e => setLinkMatchId(e.target.value)}>
            <option value="">— Seleccioná un partido —</option>
            {allMatches.map(m => {
              const d = new Date(m.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
              return (
                <option key={m.id} value={m.id}>
                  {d} · vs {m.rival} ({m.cond})
                </option>
              );
            })}
          </select>
          <button onClick={handleLinkVideos} disabled={!linkMatchId || linking}
            className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-40 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2">
            {linking
              ? <><Loader size={14} className="animate-spin" /> Vinculando...</>
              : <><Link2 size={14} /> Vincular</>}
          </button>
        </div>
      </Modal>

      {/* Modal: Agregar video */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Agregar Video">
        <form onSubmit={handleAddVideo} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID de YouTube</label>
            <input type="text" required placeholder="ej: dQw4w9WgXcQ"
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.yt_id} onChange={e => setFormData({ ...formData, yt_id: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
            <input type="text" required placeholder="ej: vs CAVU – Parte 1"
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
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas</label>
            <textarea rows={2} placeholder="Contexto, resultado, observaciones..."
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
          </div>
          <p className="text-[10px] text-gray-600">
            Después de agregar, vinculá el video a un partido desde la pestaña "Sin agrupar".
          </p>
          <button type="submit" className="w-full bg-green-700 hover:bg-green-600 py-3 rounded-xl font-black text-sm transition-all">
            Publicar Video
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default Videos;
