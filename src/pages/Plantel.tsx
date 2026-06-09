import React, { useEffect, useState, useRef } from 'react';
import { supabase, Player, PlayerMatchStats, PlayerAnalysis } from '../lib/supabase';
import { getCache, setCache, clearCache } from '../lib/cache';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { User, Plus, Trash2, Upload, Sparkles, Loader, Brain, Share2, Lock, X, Mail, CheckCircle, Shield, Edit2, FileText, Save, BarChart2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type DTProfile = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string | null;
  email?: string;
};

const POSITIONS = ['Armadora', 'Punta', 'Central', 'Opuesta', 'Líbero'];

const Plantel = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [dtProfiles, setDtProfiles] = useState<DTProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [modalEmail, setModalEmail] = useState('');

  // Flora stats analysis
  const [playerAnalysis, setPlayerAnalysis] = useState<PlayerAnalysis | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerMatchStats[]>([]);
  const [generatingStatsAnalysis, setGeneratingStatsAnalysis] = useState(false);
  const [statsAnalysisError, setStatsAnalysisError] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

  // Add player form
  const [formData, setFormData] = useState<Partial<Player>>({ name: '', num: '', pos: 'Punta', notes: '', biography: '', photo: '' });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Player>>({});
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Bulk upload
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => { fetchPlayers(); fetchDT(); }, []);
  useEffect(() => {
    setModalEmail(selectedPlayer?.email || '');
    if (selectedPlayer?.id) {
      // Fetch existing flora stats analysis and stats count
      setPlayerAnalysis(null);
      setPlayerStats([]);
      setStatsAnalysisError(null);
      Promise.all([
        supabase.from('player_analysis').select('*').eq('player_id', selectedPlayer.id).maybeSingle(),
        supabase.from('player_match_stats').select('*').eq('player_id', selectedPlayer.id),
      ]).then(([anaRes, statsRes]) => {
        if (anaRes.data) setPlayerAnalysis(anaRes.data as PlayerAnalysis);
        if (statsRes.data) setPlayerStats(statsRes.data as PlayerMatchStats[]);
      });
    }
  }, [selectedPlayer?.id]);

  const fetchPlayers = async () => {
    const cached = getCache<Player[]>('players');
    if (cached) { setPlayers(cached); setLoading(false); }
    try {
      const { data, error } = await supabase.from('players').select('*').order('num', { ascending: true });
      if (error) { if (!cached) toast.error('Error al cargar el plantel'); }
      else { setPlayers(data || []); setCache('players', data || []); }
    } catch { if (!cached) toast.error('Error de conexión'); }
    finally { setLoading(false); }
  };

  const fetchDT = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, avatar_url, email')
      .in('role', ['dt', 'admin']);
    if (data) setDtProfiles(data as DTProfile[]);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoFile(file);
    setEditPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    let photoUrl = formData.photo || '';
    if (photoFile) {
      const ext = photoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('players').upload(fileName, photoFile, { upsert: true });
      if (uploadError) { toast.error('Error al subir la foto'); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from('players').getPublicUrl(fileName);
      photoUrl = urlData.publicUrl;
    }
    const { error } = await supabase.from('players').insert([{ ...formData, photo: photoUrl }]);
    setUploading(false);
    if (error) toast.error('Error al guardar jugadora');
    else {
      toast.success('Jugadora añadida al plantel');
      setIsModalOpen(false);
      setPhotoFile(null);
      setPhotoPreview('');
      clearCache('players');
      fetchPlayers();
    }
  };

  const deletePlayer = async (id: string) => {
    if (!confirm('¿Eliminar jugadora?')) return;
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Jugadora eliminada'); clearCache('players'); fetchPlayers(); }
  };

  const analyzePlayer = async (player: Player) => {
    if (!player.id) return;
    setAnalyzingId(player.id);
    const message = `Realizá un análisis técnico-táctico individual y confidencial para esta jugadora de vóley femenino:
Nombre: ${player.name}
Posición: ${player.pos}
Número: #${player.num}
Notas del DT: ${player.notes || 'Sin notas adicionales.'}

Incluí en el análisis:
1. Perfil técnico para la posición de ${player.pos}
2. Fortalezas a potenciar
3. Áreas de trabajo y mejora específicas
4. 2-3 recomendaciones concretas de entrenamiento individual

Sé honesto pero constructivo, orientado al desarrollo individual. Específico para vóley femenino categoría B Argentina.`;

    try {
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { message, history: [] }
      });
      if (error) throw error;
      const analysis = data.response;
      await supabase.from('players').update({ ai_analysis: analysis }).eq('id', player.id);
      const updated = { ...player, ai_analysis: analysis };
      setPlayers(prev => prev.map(p => p.id === player.id ? updated : p));
      setSelectedPlayer(updated);
      clearCache('players');
      toast.success('Análisis generado');
    } catch (e: any) {
      let msg = 'Error al generar el análisis';
      try {
        const body = await e?.context?.json?.();
        if (body?.error) msg = body.error;
      } catch { /* ignore */ }
      toast.error(msg);
    } finally {
      setAnalyzingId(null);
    }
  };

  const generatePlayerStatsAnalysis = async (player: Player) => {
    if (!player.id) return;
    setGeneratingStatsAnalysis(true);
    setStatsAnalysisError(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-player-analysis', {
        body: { player_id: player.id }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const newAnalysis: PlayerAnalysis = {
        player_id: player.id,
        content: data.analysis,
        match_count: data.match_count,
        generated_at: new Date().toISOString(),
      };
      setPlayerAnalysis(newAnalysis);
      toast.success('Análisis de estadísticas generado por Flora');
    } catch (e: any) {
      let msg = 'Error al generar el análisis';
      try {
        const body = await e?.context?.json?.();
        if (body?.error) msg = body.error;
      } catch { /* ignore */ }
      if (e?.message) msg = e.message;
      setStatsAnalysisError(msg);
      toast.error(msg);
    } finally {
      setGeneratingStatsAnalysis(false);
    }
  };

  const createAccount = async () => {
    if (!selectedPlayer?.id || !modalEmail.trim()) return;
    setCreatingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-player-account', {
        body: { email: modalEmail.trim().toLowerCase(), player_id: selectedPlayer.id }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const updated = { ...selectedPlayer, email: modalEmail.trim().toLowerCase() };
      setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? updated : p));
      setSelectedPlayer(updated);
      clearCache('players');
      toast.success(`Cuenta creada para ${modalEmail.trim()}`);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la cuenta');
    } finally {
      setCreatingAccount(false);
    }
  };

  const toggleShare = async (player: Player, shared: boolean) => {
    if (!player.id) return;
    await supabase.from('players').update({ analysis_shared: shared }).eq('id', player.id);
    const updated = { ...player, analysis_shared: shared };
    setPlayers(prev => prev.map(p => p.id === player.id ? updated : p));
    setSelectedPlayer(updated);
    clearCache('players');
    toast.success(shared ? 'Análisis compartido con la jugadora' : 'Análisis marcado como privado');
  };

  const startEdit = () => {
    if (!selectedPlayer) return;
    setEditData({
      name: selectedPlayer.name,
      num: selectedPlayer.num,
      pos: selectedPlayer.pos,
      notes: selectedPlayer.notes,
      biography: selectedPlayer.biography ?? '',
      photo: selectedPlayer.photo,
    });
    setEditPhotoFile(null);
    setEditPhotoPreview('');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditData({});
    setEditPhotoFile(null);
    setEditPhotoPreview('');
  };

  const updatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer?.id) return;
    setSaving(true);
    let photoUrl = editData.photo || '';
    if (editPhotoFile) {
      const ext = editPhotoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('players').upload(fileName, editPhotoFile, { upsert: true });
      if (uploadError) { toast.error('Error al subir la foto'); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from('players').getPublicUrl(fileName);
      photoUrl = urlData.publicUrl;
    }
    const updates = { name: editData.name, num: editData.num, pos: editData.pos, notes: editData.notes, biography: editData.biography, photo: photoUrl };
    const { error } = await supabase.from('players').update(updates).eq('id', selectedPlayer.id);
    setSaving(false);
    if (error) { toast.error('Error al guardar cambios'); return; }
    const updated = { ...selectedPlayer, ...updates } as Player;
    setPlayers(prev => prev.map(p => p.id === selectedPlayer.id ? updated : p));
    setSelectedPlayer(updated);
    clearCache('players');
    cancelEdit();
    toast.success('Datos actualizados');
  };

  const handleBulkUpload = async () => {
    const lines = bulkText.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) { toast.error('El texto está vacío'); return; }
    setBulkLoading(true);
    const toInsert: Partial<Player>[] = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',').map(s => s.trim());
      const [name, num, pos = 'Punta'] = parts;
      if (!name || !num) {
        toast.error(`Línea ${i + 1}: nombre y número son obligatorios`);
        setBulkLoading(false);
        return;
      }
      toInsert.push({ name, num, pos, notes: '', photo: null, journal: [] });
    }
    const { error } = await supabase.from('players').insert(toInsert);
    setBulkLoading(false);
    if (error) { toast.error('Error al cargar el plantel'); return; }
    toast.success(`${toInsert.length} jugadora${toInsert.length !== 1 ? 's' : ''} añadida${toInsert.length !== 1 ? 's' : ''}`);
    setIsBulkOpen(false);
    setBulkText('');
    clearCache('players');
    fetchPlayers();
  };

  const closePlayerModal = () => {
    setSelectedPlayer(null);
    cancelEdit();
  };

  return (
    <Layout>
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black">Plantel <span className="text-green-500">CAF</span></h1>
          <p className="text-gray-400">Jugadoras activas temporada 2026</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsBulkOpen(true)}
              className="bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all"
            >
              <FileText size={14} /> Carga masiva
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all"
            >
              <Plus size={16} /> Nueva Jugadora
            </button>
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
        {/* Cuerpo Técnico */}
        {dtProfiles.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield size={14} className="text-green-500" /> Cuerpo Técnico
            </h2>
            <div className="flex flex-wrap gap-4">
              {dtProfiles.map(dt => (
                <div key={dt.id} className="flex items-center gap-4 bg-[#1a1a1a] border border-[#333] rounded-2xl px-5 py-4 min-w-[220px]">
                  <div className="w-14 h-14 rounded-full bg-[#242424] overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-green-600/40">
                    {dt.avatar_url
                      ? <img src={dt.avatar_url} alt={dt.first_name} className="w-full h-full object-cover" />
                      : <User size={28} className="text-gray-600" />
                    }
                  </div>
                  <div>
                    <p className="font-black text-base leading-tight">{dt.first_name} {dt.last_name}</p>
                    <p className="text-green-500 text-xs font-bold uppercase tracking-wider mt-0.5">
                      {dt.role === 'admin' ? 'Admin / DT' : 'Director Técnico'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <User size={14} className="text-green-500" /> Plantel ({players.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {players.map((player) => (
            <div
              key={player.id}
              onClick={() => setSelectedPlayer(player)}
              className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden group hover:border-green-600 transition-all relative flex items-center gap-3 p-3 cursor-pointer"
            >
              <div className="w-14 h-14 bg-[#242424] rounded-lg flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                {player.photo
                  ? <img src={player.photo} alt={player.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <User size={24} className="text-gray-700" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="bg-green-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded">#{player.num}</span>
                  {player.ai_analysis && (
                    <span className="flex items-center gap-0.5 text-[9px] font-black text-purple-400">
                      <Sparkles size={8} />{player.analysis_shared ? 'Compartido' : 'IA'}
                    </span>
                  )}
                </div>
                <p className="font-black text-sm leading-tight truncate">{player.name}</p>
                <p className="text-green-500 text-[11px] font-bold uppercase tracking-wide">{player.pos}</p>
                {player.notes && <p className="text-gray-600 text-[10px] truncate mt-0.5">{player.notes}</p>}
              </div>
              {isAdmin && (
                <button
                  onClick={e => { e.stopPropagation(); deletePlayer(player.id!); }}
                  className="p-1.5 text-red-600/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
        </>
      )}

      {/* Player detail + analysis modal */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={closePlayerModal}
        >
          <div
            className="bg-[#1a1a1a] border border-[#333] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex justify-between items-center p-5 border-b border-[#333]">
              <div className="flex items-center gap-3">
                <Brain size={18} className="text-purple-400" />
                <h3 className="text-lg font-black">
                  {isEditing ? 'Editando datos' : selectedPlayer.name}
                  {!isEditing && (
                    <span className="text-gray-500 font-normal text-base ml-2">#{selectedPlayer.num}</span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && isAdmin && (
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 text-[11px] font-black bg-[#242424] hover:bg-[#2a2a2a] border border-[#444] text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                )}
                {isEditing && (
                  <button
                    onClick={cancelEdit}
                    className="text-[11px] font-black text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                )}
                <button onClick={closePlayerModal} className="text-gray-500 hover:text-white transition-colors">
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="p-5 max-h-[80vh] overflow-y-auto space-y-5">

              {/* EDIT MODE */}
              {isEditing ? (
                <form onSubmit={updatePlayer} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre completo</label>
                      <input
                        type="text" required
                        className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                        value={editData.name || ''}
                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label>
                      <input
                        type="text" required
                        className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                        value={editData.num || ''}
                        onChange={e => setEditData({ ...editData, num: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Posición</label>
                    <select
                      className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                      value={editData.pos || 'Punta'}
                      onChange={e => setEditData({ ...editData, pos: e.target.value })}
                    >
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Foto</label>
                    <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditPhotoChange} />
                    <div
                      onClick={() => editFileInputRef.current?.click()}
                      className="w-full bg-[#242424] border border-dashed border-[#444] rounded-lg p-4 text-sm text-gray-500 cursor-pointer hover:border-green-500 hover:text-green-400 transition-all flex flex-col items-center gap-2"
                    >
                      {(editPhotoPreview || editData.photo) ? (
                        <img
                          src={editPhotoPreview || editData.photo || ''}
                          className="w-20 h-20 object-cover rounded-lg"
                          alt="Preview"
                        />
                      ) : (
                        <>
                          <Upload size={20} />
                          <span className="text-xs">Cambiar foto</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas / Perfil (DT)</label>
                    <textarea
                      rows={3}
                      className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 resize-none transition-colors"
                      value={editData.notes || ''}
                      onChange={e => setEditData({ ...editData, notes: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Historia de la jugadora</label>
                    <textarea
                      rows={4}
                      placeholder="Trayectoria, clubes anteriores, logros, datos personales..."
                      className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 resize-none transition-colors placeholder-gray-700"
                      value={editData.biography || ''}
                      onChange={e => setEditData({ ...editData, biography: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                  >
                    {saving ? <><Loader size={14} className="animate-spin" /> Guardando...</> : <><Save size={14} /> Guardar cambios</>}
                  </button>
                </form>
              ) : (
                /* READ MODE */
                <>
                  {/* Player info row */}
                  <div className="flex gap-4 items-start">
                    <div className="w-20 h-20 bg-[#242424] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {selectedPlayer.photo
                        ? <img src={selectedPlayer.photo} alt={selectedPlayer.name} className="w-full h-full object-cover" />
                        : <User size={32} className="text-gray-700" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-green-500 text-sm font-bold uppercase tracking-wider">{selectedPlayer.pos}</p>
                      {selectedPlayer.notes && <p className="text-gray-400 text-sm mt-1">{selectedPlayer.notes}</p>}
                    </div>
                  </div>

                  {/* Biography */}
                  {selectedPlayer.biography && (
                    <div className="bg-[#111] border border-[#222] rounded-xl p-4">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Historia</p>
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{selectedPlayer.biography}</p>
                    </div>
                  )}

                  {/* AI Analysis — admin only */}
                  {isAdmin && <div className="bg-[#111] border border-[#222] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={13} className="text-purple-400" />
                        <span className="text-xs font-black text-purple-400 uppercase tracking-widest">Análisis IA Individual</span>
                      </div>
                      <button
                        onClick={() => analyzePlayer(selectedPlayer)}
                        disabled={analyzingId === selectedPlayer.id}
                        className="flex items-center gap-1.5 text-[10px] font-black bg-purple-900/30 hover:bg-purple-900/50 border border-purple-900/40 text-purple-400 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                      >
                        {analyzingId === selectedPlayer.id
                          ? <><Loader size={11} className="animate-spin" /> Analizando...</>
                          : selectedPlayer.ai_analysis
                            ? 'Re-analizar'
                            : <><Sparkles size={11} /> Generar análisis</>
                        }
                      </button>
                    </div>

                    {selectedPlayer.ai_analysis ? (
                      <>
                        <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line bg-[#0a0a0a] border border-purple-900/20 rounded-xl p-4 mb-3">
                          {selectedPlayer.ai_analysis}
                        </div>
                        <div className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            {selectedPlayer.analysis_shared
                              ? <Share2 size={13} className="text-green-400" />
                              : <Lock size={13} className="text-gray-500" />
                            }
                            <span className="text-xs text-gray-400">
                              {selectedPlayer.analysis_shared
                                ? 'Visible para la jugadora en Mi Perfil'
                                : 'Privado — solo DT y Admin'}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleShare(selectedPlayer, !selectedPlayer.analysis_shared)}
                            className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all ${
                              selectedPlayer.analysis_shared
                                ? 'bg-[#242424] text-gray-400 hover:bg-[#333]'
                                : 'bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-800/40'
                            }`}
                          >
                            {selectedPlayer.analysis_shared ? 'Hacer privado' : 'Compartir con jugadora'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-600 text-center py-6">
                        Generá el análisis técnico-táctico individual para esta jugadora.
                      </p>
                    )}
                  </div>}

                  {/* Flora Stats Analysis — admin only */}
                  {isAdmin && (
                    <div className="bg-[#111] border border-[#222] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <BarChart2 size={13} className="text-green-400" />
                          <span className="text-xs font-black text-green-400 uppercase tracking-widest">Flora · Análisis por Estadísticas</span>
                          {playerStats.length > 0 && (
                            <span className="text-[9px] font-black bg-green-900/30 text-green-400 border border-green-800/40 px-1.5 py-0.5 rounded-full">
                              {playerStats.length} partido{playerStats.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => generatePlayerStatsAnalysis(selectedPlayer!)}
                          disabled={generatingStatsAnalysis || playerStats.length === 0}
                          title={playerStats.length === 0 ? 'Cargá estadísticas del partido primero' : ''}
                          className="flex items-center gap-1.5 text-[10px] font-black bg-green-900/30 hover:bg-green-900/50 border border-green-800/40 text-green-400 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {generatingStatsAnalysis
                            ? <><Loader size={11} className="animate-spin" /> Analizando...</>
                            : playerAnalysis
                              ? <><RefreshCw size={11} /> Re-generar</>
                              : <><Sparkles size={11} /> Generar análisis</>
                          }
                        </button>
                      </div>

                      {playerStats.length === 0 && !playerAnalysis && (
                        <p className="text-xs text-gray-600 text-center py-4">
                          No hay estadísticas cargadas para esta jugadora.<br />
                          <span className="text-gray-700">Cargalas desde el Fixture → Stats.</span>
                        </p>
                      )}

                      {playerStats.length > 0 && !playerAnalysis && !generatingStatsAnalysis && (
                        <div className="bg-[#0a0a0a] border border-green-900/20 rounded-xl p-3 mb-3">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Resumen de datos</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {[
                              { label: 'Partidos', value: playerStats.length },
                              { label: 'Saques', value: playerStats.reduce((a, s) => a + (s.saques_total || 0), 0) },
                              { label: 'Remates', value: playerStats.reduce((a, s) => a + (s.remates_total || 0), 0) },
                            ].map(({ label, value }) => (
                              <div key={label} className="bg-[#111] rounded-lg p-2">
                                <p className="text-lg font-black text-white">{value}</p>
                                <p className="text-[9px] text-gray-500 uppercase">{label}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-600 text-center mt-2">Presioná "Generar análisis" para que Flora analice estos datos.</p>
                        </div>
                      )}

                      {statsAnalysisError && (
                        <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/30 rounded-lg p-3 text-center">{statsAnalysisError}</p>
                      )}

                      {playerAnalysis && (
                        <div>
                          <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line bg-[#0a0a0a] border border-green-900/20 rounded-xl p-4 max-h-80 overflow-y-auto">
                            {playerAnalysis.content}
                          </div>
                          <p className="text-[10px] text-gray-600 mt-2 text-right">
                            Basado en {playerAnalysis.match_count} partido{playerAnalysis.match_count !== 1 ? 's' : ''} · {playerAnalysis.generated_at ? new Date(playerAnalysis.generated_at).toLocaleDateString('es-AR') : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cuenta de acceso — admin only */}
                  {isAdmin && <div className="bg-[#111] border border-[#222] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Mail size={13} className="text-blue-400" />
                      <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Cuenta de acceso</span>
                      {selectedPlayer.email && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-green-400 font-bold">
                          <CheckCircle size={11} /> Activa
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={modalEmail}
                        onChange={e => setModalEmail(e.target.value)}
                        placeholder="email@ejemplo.com"
                        className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
                      />
                      <button
                        onClick={createAccount}
                        disabled={creatingAccount || !modalEmail.trim()}
                        className="flex items-center gap-1.5 text-[11px] font-black bg-blue-900/30 hover:bg-blue-900/50 border border-blue-900/40 text-blue-400 px-3 py-2 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
                      >
                        {creatingAccount ? <Loader size={12} className="animate-spin" /> : <Mail size={12} />}
                        {creatingAccount ? 'Creando...' : selectedPlayer.email ? 'Actualizar' : 'Crear cuenta'}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-2">
                      {selectedPlayer.email
                        ? `Contraseña: Panteras2026 · Email: ${selectedPlayer.email}`
                        : 'La cuenta se crea con contraseña Panteras2026 y queda vinculada automáticamente.'}
                    </p>
                  </div>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar jugadora */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agregar Jugadora">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
              <input
                type="text" required
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label>
              <input
                type="text" required
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                value={formData.num}
                onChange={e => setFormData({ ...formData, num: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Posición</label>
            <select
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.pos}
              onChange={e => setFormData({ ...formData, pos: e.target.value })}
            >
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Foto (opcional)</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-[#242424] border border-dashed border-[#444] rounded-lg p-4 text-sm text-gray-500 cursor-pointer hover:border-green-500 hover:text-green-400 transition-all flex flex-col items-center gap-2"
            >
              {photoPreview
                ? <img src={photoPreview} className="w-20 h-20 object-cover rounded-lg" alt="Preview" />
                : <><Upload size={20} /><span className="text-xs">Subir foto desde tu dispositivo</span></>
              }
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas / Perfil</label>
            <textarea
              rows={3}
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Historia de la jugadora</label>
            <textarea
              rows={3}
              placeholder="Trayectoria, clubes anteriores, logros..."
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 resize-none transition-colors placeholder-gray-700"
              value={formData.biography || ''}
              onChange={e => setFormData({ ...formData, biography: e.target.value })}
            />
          </div>
          <button type="submit" disabled={uploading} className="w-full bg-green-700 hover:bg-green-600 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50">
            {uploading ? 'Guardando...' : 'Guardar Jugadora'}
          </button>
        </form>
      </Modal>

      {/* Modal carga masiva */}
      <Modal isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} title="Carga masiva del plantel">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Pegá una jugadora por línea con el formato:
          </p>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 font-mono text-xs text-green-400">
            Nombre Completo, Número, Posición
          </div>
          <p className="text-[11px] text-gray-600">
            Posiciones válidas: Armadora, Punta, Central, Opuesta, Líbero. La posición es opcional (default: Punta).
          </p>
          <textarea
            rows={10}
            placeholder={`María González, 7, Armadora\nLaura Pérez, 12, Punta\nAna García, 3, Central\nSofía Torres, 5, Líbero`}
            className="w-full bg-[#242424] border border-[#333] rounded-lg p-3 text-sm font-mono outline-none focus:border-green-500 resize-none transition-colors"
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
          />
          <button
            onClick={handleBulkUpload}
            disabled={bulkLoading || !bulkText.trim()}
            className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50"
          >
            {bulkLoading
              ? <><Loader size={14} className="animate-spin" /> Cargando...</>
              : <><FileText size={14} /> Cargar plantel</>
            }
          </button>
        </div>
      </Modal>
    </Layout>
  );
};

export default Plantel;
