import React, { useEffect, useState, useCallback } from 'react';
import { supabase, Match } from '../lib/supabase';
import { getCache, setCache, clearCache } from '../lib/cache';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Calendar, MapPin, Trophy, Plus, Video, X, Link2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type VideoRow = { id: string; yt_id: string; title: string; date: string };
type MatchVideoRow = { id: string; match_id: string; video_id: string; videos: VideoRow };

const ytThumb = (ytId: string) =>
  `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;

const Fixture = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

  // match_videos state
  const [matchVideos, setMatchVideos] = useState<Record<string, MatchVideoRow[]>>({});
  const [videoModalMatch, setVideoModalMatch] = useState<Match | null>(null);
  const [allVideos, setAllVideos] = useState<VideoRow[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [addingVideo, setAddingVideo] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Match>>({
    rival: '',
    cond: 'Local',
    date: new Date().toISOString().split('T')[0],
    fase: '',
    res: 'pending',
    sets: '',
    notes: ''
  });

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    const cached = getCache<Match[]>('matches26');
    if (cached) { setMatches(cached); setLoading(false); }
    try {
      const [matchRes, mvRes] = await Promise.all([
        supabase.from('matches26').select('*').order('date', { ascending: true }),
        supabase.from('match_videos').select('id, match_id, video_id, videos(id, yt_id, title, date)'),
      ]);
      if (matchRes.error) { if (!cached) toast.error('Error al cargar el fixture'); }
      else { setMatches(matchRes.data || []); setCache('matches26', matchRes.data || []); }

      if (!mvRes.error && mvRes.data) {
        const byMatch: Record<string, MatchVideoRow[]> = {};
        for (const row of mvRes.data as any[]) {
          if (!byMatch[row.match_id]) byMatch[row.match_id] = [];
          byMatch[row.match_id].push(row as MatchVideoRow);
        }
        setMatchVideos(byMatch);
      }
    } catch { if (!cached) toast.error('Error de conexión'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('matches26').insert([formData]);
    if (error) toast.error('Error al guardar el partido');
    else {
      toast.success('Partido guardado correctamente');
      setIsModalOpen(false);
      clearCache('matches26');
      fetchMatches();
    }
  };

  const openVideoModal = useCallback(async (match: Match) => {
    setVideoModalMatch(match);
    setLoadingVideos(true);
    const { data, error } = await supabase.from('videos').select('id, yt_id, title, date').order('date', { ascending: false });
    if (error) toast.error('Error cargando videos');
    else setAllVideos(data || []);
    setLoadingVideos(false);
  }, []);

  const closeVideoModal = () => setVideoModalMatch(null);

  const linkedVideoIds = videoModalMatch
    ? new Set((matchVideos[videoModalMatch.id] || []).map(mv => mv.video_id))
    : new Set<string>();

  const handleLinkVideo = async (videoId: string) => {
    if (!videoModalMatch) return;
    setAddingVideo(videoId);
    const { error } = await supabase.from('match_videos').insert({ match_id: videoModalMatch.id, video_id: videoId });
    if (error) toast.error('Error al vincular video');
    else {
      const video = allVideos.find(v => v.id === videoId)!;
      setMatchVideos(prev => ({
        ...prev,
        [videoModalMatch.id]: [
          ...(prev[videoModalMatch.id] || []),
          { id: crypto.randomUUID(), match_id: videoModalMatch.id, video_id: videoId, videos: video },
        ],
      }));
    }
    setAddingVideo(null);
  };

  const handleUnlinkVideo = async (mvId: string, matchId: string) => {
    const { error } = await supabase.from('match_videos').delete().eq('id', mvId);
    if (error) toast.error('Error al desvincular video');
    else {
      setMatchVideos(prev => ({
        ...prev,
        [matchId]: (prev[matchId] || []).filter(mv => mv.id !== mvId),
      }));
    }
  };

  const linkedVideos = videoModalMatch ? (matchVideos[videoModalMatch.id] || []) : [];
  const unlinkedVideos = allVideos.filter(v => !linkedVideoIds.has(v.id));

  return (
    <Layout>
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black">Fixture <span className="text-green-500">2026</span></h1>
          <p className="text-gray-400">Calendario de partidos y resultados</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all"
          >
            <Plus size={16} /> Nuevo Partido
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => {
            const videos = matchVideos[match.id] || [];
            return (
              <div key={match.id} className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shrink-0 ${
                    match.res === 'win' ? 'bg-green-900/30 text-green-400' :
                    match.res === 'loss' ? 'bg-red-900/30 text-red-400' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {match.res === 'win' ? 'V' : match.res === 'loss' ? 'D' : '-'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg">vs {match.rival}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
                      <span className="flex items-center gap-1"><Calendar size={12}/> {match.date}</span>
                      <span className="flex items-center gap-1"><MapPin size={12}/> {match.cond}</span>
                      <span className="flex items-center gap-1"><Trophy size={12}/> {match.fase}</span>
                    </div>
                    {videos.length > 0 && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {videos.slice(0, 4).map(mv => (
                          <img
                            key={mv.id}
                            src={ytThumb(mv.videos.yt_id)}
                            alt={mv.videos.title}
                            title={mv.videos.title}
                            className="w-20 h-14 object-cover rounded-md border border-[#333] cursor-pointer hover:border-purple-500 transition-colors"
                            onClick={() => openVideoModal(match)}
                          />
                        ))}
                        {videos.length > 4 && (
                          <button
                            onClick={() => openVideoModal(match)}
                            className="w-20 h-14 rounded-md border border-[#333] bg-[#242424] text-gray-400 text-xs font-bold hover:border-purple-700 transition-colors"
                          >
                            +{videos.length - 4} más
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => openVideoModal(match)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      videos.length > 0
                        ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50 hover:bg-purple-900/60'
                        : 'bg-[#242424] text-gray-500 border border-[#333] hover:border-purple-700 hover:text-purple-400'
                    }`}
                  >
                    <Video size={12} />
                    {videos.length > 0 ? `${videos.length} video${videos.length !== 1 ? 's' : ''}` : 'Videos'}
                  </button>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">{match.sets || 'vs'}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Resultado</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New match modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cargar Partido">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rival</label>
            <input
              type="text" required
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.rival}
              onChange={e => setFormData({...formData, rival: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Condición</label>
              <select
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                value={formData.cond}
                onChange={e => setFormData({...formData, cond: e.target.value as any})}
              >
                <option value="Local">Local</option>
                <option value="Visitante">Visitante</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
              <input
                type="date" required
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Resultado</label>
              <select
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                value={formData.res}
                onChange={e => setFormData({...formData, res: e.target.value as any})}
              >
                <option value="pending">Pendiente</option>
                <option value="win">Victoria</option>
                <option value="loss">Derrota</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sets (ej: 3-1)</label>
              <input
                type="text"
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                value={formData.sets}
                onChange={e => setFormData({...formData, sets: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-green-700 hover:bg-green-600 py-3 rounded-xl font-black text-sm transition-all mt-4">
            Guardar Partido
          </button>
        </form>
      </Modal>

      {/* Video manager modal */}
      <Modal
        isOpen={!!videoModalMatch}
        onClose={closeVideoModal}
        title={videoModalMatch ? `Videos · vs ${videoModalMatch.rival}` : 'Videos'}
      >
        {loadingVideos ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Linked videos */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Videos vinculados ({linkedVideos.length})</p>
              {linkedVideos.length === 0 ? (
                <p className="text-sm text-gray-600 italic">Ningún video vinculado todavía.</p>
              ) : (
                <div className="space-y-2">
                  {linkedVideos.map(mv => (
                    <div key={mv.id} className="flex items-center gap-3 bg-[#242424] rounded-lg p-2 border border-[#333]">
                      <img
                        src={ytThumb(mv.videos.yt_id)}
                        alt={mv.videos.title}
                        className="w-20 h-14 object-cover rounded-md shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{mv.videos.title}</p>
                        <p className="text-xs text-gray-500">{mv.videos.date}</p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleUnlinkVideo(mv.id, videoModalMatch!.id)}
                          className="shrink-0 p-1.5 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors"
                          title="Desvincular"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add videos — admin/dt only */}
            {isAdmin && unlinkedVideos.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Agregar video</p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {unlinkedVideos.map(v => (
                    <div key={v.id} className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg p-2 border border-[#2a2a2a] hover:border-purple-700/50 transition-colors">
                      <img
                        src={ytThumb(v.yt_id)}
                        alt={v.title}
                        className="w-20 h-14 object-cover rounded-md shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{v.title}</p>
                        <p className="text-xs text-gray-500">{v.date}</p>
                      </div>
                      <button
                        onClick={() => handleLinkVideo(v.id)}
                        disabled={addingVideo === v.id}
                        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-900/30 text-purple-300 text-xs font-bold border border-purple-700/50 hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                      >
                        {addingVideo === v.id ? (
                          <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Link2 size={12} />
                        )}
                        Vincular
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && unlinkedVideos.length === 0 && linkedVideos.length > 0 && (
              <p className="text-xs text-gray-600 italic text-center">Todos los videos ya están vinculados a este partido.</p>
            )}
            {allVideos.length === 0 && (
              <p className="text-xs text-gray-600 italic text-center">No hay videos cargados en el sistema todavía.</p>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default Fixture;
