import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { User, BookOpen, Brain, Plus, Trash2, Sparkles, ToggleLeft, ToggleRight, Loader } from 'lucide-react';

type JournalEntry = { id: string; date: string; content: string };
type PlayerData = { name: string; num: string; pos: string; photo: string | null; ai_analysis?: string | null; analysis_shared?: boolean };

const MiPerfil = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [wantsAI, setWantsAI] = useState(true);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [newEntry, setNewEntry] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiRec, setAiRec] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('first_name, last_name, wants_ai_coaching, journal, player_id')
      .eq('id', user!.id)
      .single();

    if (data) {
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setWantsAI(data.wants_ai_coaching ?? true);
      setJournal(data.journal || []);

      if (data.player_id) {
        const { data: player } = await supabase
          .from('players')
          .select('name, num, pos, photo, ai_analysis, analysis_shared')
          .eq('id', data.player_id)
          .single();
        if (player) setPlayerData(player);
      }
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName, updated_at: new Date().toISOString() })
      .eq('id', user!.id);
    setSaving(false);
    if (error) toast.error('Error al guardar');
    else toast.success('Perfil actualizado');
  };

  const toggleAI = async () => {
    const next = !wantsAI;
    setWantsAI(next);
    await supabase.from('profiles').update({ wants_ai_coaching: next }).eq('id', user!.id);
    toast.success(next ? 'Recomendaciones IA activadas' : 'Recomendaciones IA desactivadas');
    if (!next) setAiRec('');
  };

  const addJournalEntry = async () => {
    if (!newEntry.trim()) return;
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      content: newEntry.trim(),
    };
    const updated = [entry, ...journal];
    setJournal(updated);
    setNewEntry('');
    await supabase.from('profiles').update({ journal: updated }).eq('id', user!.id);
  };

  const deleteEntry = async (id: string) => {
    const updated = journal.filter(e => e.id !== id);
    setJournal(updated);
    await supabase.from('profiles').update({ journal: updated }).eq('id', user!.id);
  };

  const getAIRecommendation = async () => {
    setLoadingAI(true);
    setAiRec('');
    const recentJournal = journal.slice(0, 5).map(e => `${e.date}: ${e.content}`).join('\n');
    const message = `Dame una recomendación personal y motivadora para mí como jugadora de vóley.
Mi posición: ${playerData?.pos || 'no especificada'}.
Mis últimas notas de diario: ${recentJournal || 'Sin notas aún'}.
Nombre: ${firstName || 'Jugadora del CAF'}.
Sé breve (máximo 3 oraciones), positiva y orientada al crecimiento personal y deportivo. No des diagnósticos negativos.`;

    try {
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { message, history: [] }
      });
      if (error) throw error;
      setAiRec(data.response);
    } catch {
      toast.error('No se pudo obtener la recomendación');
    } finally {
      setLoadingAI(false);
    }
  };

  if (loading) return (
    <Layout>
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <header className="mb-8">
        <h1 className="text-3xl font-black">Mi <span className="text-green-500">Perfil</span></h1>
        <p className="text-gray-400 text-sm">Tu espacio personal dentro del CAF</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda — datos y foto */}
        <div className="space-y-4">

          {/* Card de jugadora vinculada */}
          {playerData ? (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden">
              <div className="aspect-square bg-[#242424] relative flex items-center justify-center">
                {playerData.photo
                  ? <img src={playerData.photo} alt={playerData.name} className="w-full h-full object-cover" />
                  : <User size={64} className="text-gray-700" />}
                <div className="absolute top-4 left-4 bg-green-600 text-white font-black px-3 py-1 rounded-lg shadow-xl">
                  #{playerData.num}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-black text-xl">{playerData.name}</h3>
                <p className="text-green-500 text-sm font-bold uppercase tracking-wider">{playerData.pos}</p>
              </div>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-dashed border-[#333] rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-16 h-16 bg-[#242424] rounded-full flex items-center justify-center">
                <User size={32} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm">Tu cuenta todavía no está vinculada a una ficha del plantel. Pedile a la DT o admin que te vincule.</p>
            </div>
          )}

          {/* Nombre editable */}
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Tus datos</h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Nombre</label>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Apellido</label>
              <input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                placeholder="Tu apellido"
              />
            </div>
            <p className="text-xs text-gray-600">{user?.email}</p>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full bg-green-700 hover:bg-green-600 py-2 rounded-xl font-black text-sm transition-all disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* Columna derecha — diario + IA */}
        <div className="lg:col-span-2 space-y-6">

          {/* Análisis técnico compartido por DT */}
          {playerData && (
            <div className={`rounded-2xl p-5 ${playerData.analysis_shared && playerData.ai_analysis ? 'bg-purple-900/10 border border-purple-800/40' : 'bg-[#1a1a1a] border border-[#333]'}`}>
              <h3 className="font-black text-base flex items-center gap-2 mb-3">
                <Sparkles size={18} className={playerData.analysis_shared && playerData.ai_analysis ? 'text-purple-400' : 'text-gray-600'} />
                Análisis técnico individual
              </h3>
              {playerData.analysis_shared && playerData.ai_analysis ? (
                <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Compartido por tu DT</p>
                  {playerData.ai_analysis}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Tu DT todavía no compartió tu análisis individual.</p>
              )}
            </div>
          )}

          {/* Toggle IA */}
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <Brain size={18} className="text-green-500" /> Entrenadora IA personal
                </h3>
                <p className="text-gray-500 text-xs mt-1">
                  {wantsAI
                    ? 'Activada — podés pedir recomendaciones personales cuando quieras.'
                    : 'Desactivada — no recibirás sugerencias individuales de la IA.'}
                </p>
              </div>
              <button onClick={toggleAI} className="text-green-500 hover:text-green-400 transition-colors">
                {wantsAI ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-gray-600" />}
              </button>
            </div>

            {wantsAI && (
              <div className="mt-4">
                {aiRec ? (
                  <div className="bg-green-900/10 border border-green-900/30 rounded-xl p-4 text-sm text-gray-200 leading-relaxed">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Sparkles size={10} /> Recomendación personal
                    </p>
                    {aiRec}
                  </div>
                ) : (
                  <button
                    onClick={getAIRecommendation}
                    disabled={loadingAI}
                    className="w-full flex items-center justify-center gap-2 bg-green-900/20 hover:bg-green-900/30 border border-green-800/40 text-green-400 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-50"
                  >
                    {loadingAI ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {loadingAI ? 'Generando recomendación...' : 'Pedir recomendación personal'}
                  </button>
                )}
                {aiRec && (
                  <button
                    onClick={getAIRecommendation}
                    disabled={loadingAI}
                    className="mt-2 text-xs text-gray-600 hover:text-gray-400 transition-colors w-full text-center"
                  >
                    Pedir otra recomendación
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Diario personal */}
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-5">
            <h3 className="font-black text-base flex items-center gap-2 mb-4">
              <BookOpen size={18} className="text-yellow-500" /> Mi diario
              <span className="text-[10px] font-bold text-gray-600 ml-1">Solo lo ves vos</span>
            </h3>

            <div className="flex gap-2 mb-5">
              <textarea
                value={newEntry}
                onChange={e => setNewEntry(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addJournalEntry(); } }}
                rows={2}
                placeholder="¿Cómo te sentiste hoy en el entrenamiento o partido? Escribí lo que quieras..."
                className="flex-1 bg-[#242424] border border-[#333] rounded-xl p-3 text-sm outline-none focus:border-yellow-500 resize-none transition-all"
              />
              <button
                onClick={addJournalEntry}
                disabled={!newEntry.trim()}
                className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-500 p-3 rounded-xl transition-all self-end disabled:opacity-30"
              >
                <Plus size={20} />
              </button>
            </div>

            {journal.length === 0 ? (
              <p className="text-center text-gray-600 text-sm py-6">Todavía no escribiste nada. Este espacio es tuyo.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {journal.map(entry => (
                  <div key={entry.id} className="group bg-[#242424] border border-[#333] rounded-xl p-4 relative">
                    <p className="text-[10px] text-gray-600 font-bold mb-1">{entry.date}</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{entry.content}</p>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MiPerfil;
