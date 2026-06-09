import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Smile,
  Meh,
  Frown,
  Star,
  Trophy,
  Zap,
  Brain,
  Calendar,
  CheckCircle2,
  Pencil,
  Trash2,
} from 'lucide-react';

type DiaryEntry = {
  id: string;
  match_date: string;
  rival: string;
  result: string | null;
  sets: string | null;
  mood: string | null;
  technical_notes: string | null;
  emotional_notes: string | null;
  highlights: string | null;
  improvements: string | null;
  created_at: string;
};

type Step = 'match' | 'mood' | 'technical' | 'emotional' | 'done';

const MOODS = [
  { value: 'excelente', label: 'Excelente', icon: <Star size={28} className="text-yellow-400" />, desc: 'Me sentí increíble', bg: 'border-yellow-500/40 bg-yellow-900/10' },
  { value: 'bien', label: 'Bien', icon: <Smile size={28} className="text-green-400" />, desc: 'Jugué bien', bg: 'border-green-500/40 bg-green-900/10' },
  { value: 'regular', label: 'Regular', icon: <Meh size={28} className="text-yellow-600" />, desc: 'Dia normal', bg: 'border-yellow-700/40 bg-yellow-900/5' },
  { value: 'mal', label: 'Mal', icon: <Frown size={28} className="text-red-400" />, desc: 'Fue un día difícil', bg: 'border-red-500/40 bg-red-900/10' },
];

const RESULT_OPTS = [
  { value: 'win', label: 'Victoria', color: 'border-green-500/50 bg-green-900/15 text-green-400' },
  { value: 'loss', label: 'Derrota', color: 'border-red-500/50 bg-red-900/15 text-red-400' },
  { value: 'draw', label: 'Empate', color: 'border-gray-500/50 bg-[#1e1e1e] text-gray-400' },
];

const Diario = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<Step>('match');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [rival, setRival] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState('');
  const [sets, setSets] = useState('');
  const [mood, setMood] = useState('');
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [emotionalNotes, setEmotionalNotes] = useState('');
  const [highlights, setHighlights] = useState('');
  const [improvements, setImprovements] = useState('');

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoadingEntries(true);
    const { data } = await supabase
      .from('match_diary')
      .select('*')
      .order('match_date', { ascending: false });
    if (data) setEntries(data);
    setLoadingEntries(false);
  };

  const resetForm = () => {
    setRival(''); setMatchDate(new Date().toISOString().split('T')[0]);
    setResult(''); setSets(''); setMood('');
    setTechnicalNotes(''); setEmotionalNotes('');
    setHighlights(''); setImprovements('');
    setStep('match'); setEditId(null);
  };

  const openNew = () => { resetForm(); setShowForm(true); };

  const openEdit = (e: DiaryEntry) => {
    setRival(e.rival); setMatchDate(e.match_date);
    setResult(e.result ?? ''); setSets(e.sets ?? '');
    setMood(e.mood ?? ''); setTechnicalNotes(e.technical_notes ?? '');
    setEmotionalNotes(e.emotional_notes ?? '');
    setHighlights(e.highlights ?? ''); setImprovements(e.improvements ?? '');
    setEditId(e.id); setStep('match'); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta entrada del diario?')) return;
    const { error } = await supabase.from('match_diary').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Entrada eliminada'); fetchEntries(); }
  };

  const handleSave = async () => {
    if (!rival.trim() || !matchDate) { toast.error('Completá el rival y la fecha'); return; }
    setSaving(true);
    const payload = {
      user_id: user!.id,
      rival: rival.trim(),
      match_date: matchDate,
      result: result || null,
      sets: sets.trim() || null,
      mood: mood || null,
      technical_notes: technicalNotes.trim() || null,
      emotional_notes: emotionalNotes.trim() || null,
      highlights: highlights.trim() || null,
      improvements: improvements.trim() || null,
    };
    let error;
    if (editId) {
      ({ error } = await supabase.from('match_diary').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('match_diary').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success(editId ? 'Entrada actualizada' : '¡Entrada guardada!');
    setStep('done');
    fetchEntries();
  };

  const StepDots = () => (
    <div className="flex gap-1.5 justify-center mb-6">
      {(['match', 'mood', 'technical', 'emotional'] as Step[]).map((s, i) => (
        <div key={s} className={`rounded-full transition-all ${step === s ? 'w-6 h-2 bg-green-500' : i < ['match','mood','technical','emotional'].indexOf(step) ? 'w-2 h-2 bg-green-700' : 'w-2 h-2 bg-[#333]'}`} />
      ))}
    </div>
  );

  if (showForm) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto">
          <button onClick={() => { setShowForm(false); resetForm(); }} className="flex items-center gap-2 text-gray-500 hover:text-white text-xs font-bold mb-6 transition-colors">
            <ChevronLeft size={16} /> Volver al diario
          </button>

          {step === 'done' ? (
            <div className="bg-[#141414] border border-[#222] rounded-2xl p-10 text-center">
              <div className="w-20 h-20 bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-black mb-2">¡Entrada guardada!</h2>
              <p className="text-gray-400 text-sm mb-8">Flora va a usar tus notas para conocer mejor al equipo y darte análisis más precisos.</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => { resetForm(); setShowForm(false); }} className="bg-green-700 hover:bg-green-600 px-6 py-3 rounded-xl font-black text-sm transition-all">Ver mis entradas</button>
                <button onClick={() => navigate('/ai-coach')} className="bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2">
                  <Brain size={16} /> Consultar a Flora
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#141414] border border-[#222] rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-[#222] text-center">
                <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">
                  {editId ? 'Editando entrada' : 'Nueva entrada'}
                </p>
                <h2 className="text-xl font-black">
                  {step === 'match' && '¿Qué partido jugaron?'}
                  {step === 'mood' && '¿Cómo te sentiste?'}
                  {step === 'technical' && 'Notas técnicas'}
                  {step === 'emotional' && 'Notas emocionales'}
                </h2>
              </div>

              <div className="p-6">
                <StepDots />

                {step === 'match' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Rival *</label>
                      <input
                        type="text"
                        value={rival}
                        onChange={e => setRival(e.target.value)}
                        placeholder="Ej: Club Argentino, UPCN, Santa Rosa..."
                        className="w-full bg-[#0d0d0d] border border-[#333] rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-gray-600 focus:outline-none focus:border-green-600"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Fecha *</label>
                      <input
                        type="date"
                        value={matchDate}
                        onChange={e => setMatchDate(e.target.value)}
                        className="w-full bg-[#0d0d0d] border border-[#333] rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-green-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Resultado</label>
                      <div className="grid grid-cols-3 gap-2">
                        {RESULT_OPTS.map(r => (
                          <button key={r.value} onClick={() => setResult(result === r.value ? '' : r.value)}
                            className={`py-2.5 rounded-xl border text-xs font-black transition-all ${result === r.value ? r.color : 'border-[#333] bg-[#1a1a1a] text-gray-500 hover:border-[#444]'}`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {result && (
                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Sets (opcional)</label>
                        <input
                          type="text"
                          value={sets}
                          onChange={e => setSets(e.target.value)}
                          placeholder="Ej: 3-1, 2-3..."
                          className="w-full bg-[#0d0d0d] border border-[#333] rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-gray-600 focus:outline-none focus:border-green-600"
                        />
                      </div>
                    )}
                    <button
                      onClick={() => { if (rival.trim()) setStep('mood'); else toast.error('Ingresá el rival'); }}
                      className="w-full bg-green-700 hover:bg-green-600 px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      Continuar <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {step === 'mood' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {MOODS.map(m => (
                        <button key={m.value} onClick={() => setMood(mood === m.value ? '' : m.value)}
                          className={`p-4 rounded-xl border text-center transition-all ${mood === m.value ? m.bg + ' border-opacity-100' : 'border-[#333] bg-[#1a1a1a] hover:border-[#444]'}`}>
                          <div className="flex justify-center mb-2">{m.icon}</div>
                          <p className="text-sm font-black">{m.label}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{m.desc}</p>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => setStep('match')} className="flex-1 bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] px-4 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2">
                        <ChevronLeft size={16} /> Atrás
                      </button>
                      <button onClick={() => setStep('technical')} className="flex-1 bg-green-700 hover:bg-green-600 px-4 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2">
                        Continuar <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {step === 'technical' && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 font-medium">Hablá de lo táctico: saque, recepción, armado, remate, bloqueo, defensa. Cualquier cosa técnica que quieras recordar.</p>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 flex items-center gap-1.5"><Zap size={12} /> ¿Qué salió bien?</label>
                      <textarea
                        value={highlights}
                        onChange={e => setHighlights(e.target.value)}
                        rows={3}
                        placeholder="Ej: El saque de potencia funcionó bien, tuve buena lectura en bloqueo..."
                        className="w-full bg-[#0d0d0d] border border-[#333] rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-gray-600 focus:outline-none focus:border-green-600 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2 flex items-center gap-1.5"><Brain size={12} /> ¿Qué hay que mejorar?</label>
                      <textarea
                        value={improvements}
                        onChange={e => setImprovements(e.target.value)}
                        rows={3}
                        placeholder="Ej: La recepción de primer tiempo estuvo errática, debo mejorar la posición base..."
                        className="w-full bg-[#0d0d0d] border border-[#333] rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-gray-600 focus:outline-none focus:border-green-600 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Notas técnicas generales</label>
                      <textarea
                        value={technicalNotes}
                        onChange={e => setTechnicalNotes(e.target.value)}
                        rows={3}
                        placeholder="Cualquier otra nota táctica o técnica del partido..."
                        className="w-full bg-[#0d0d0d] border border-[#333] rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-gray-600 focus:outline-none focus:border-green-600 resize-none"
                      />
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => setStep('mood')} className="flex-1 bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] px-4 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2">
                        <ChevronLeft size={16} /> Atrás
                      </button>
                      <button onClick={() => setStep('emotional')} className="flex-1 bg-green-700 hover:bg-green-600 px-4 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2">
                        Continuar <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {step === 'emotional' && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500 font-medium">Esta parte es personal. ¿Cómo fue el clima del equipo? ¿Cómo te sentiste vos? Solo vos y Flora van a leer esto.</p>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Notas emocionales / grupales</label>
                      <textarea
                        value={emotionalNotes}
                        onChange={e => setEmotionalNotes(e.target.value)}
                        rows={6}
                        placeholder="Ej: Hoy el equipo estuvo muy unido a pesar de la derrota. Personalmente me costó mantener la concentración en el tercer set. Necesito trabajar la cabeza en momentos de presión..."
                        className="w-full bg-[#0d0d0d] border border-[#333] rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-gray-600 focus:outline-none focus:border-green-600 resize-none"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => setStep('technical')} className="flex-1 bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] px-4 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2">
                        <ChevronLeft size={16} /> Atrás
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 px-4 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2"
                      >
                        {saving ? 'Guardando...' : <><CheckCircle2 size={16} /> Guardar entrada</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Diario <span className="text-green-500">de partido</span></h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Tus notas técnicas y emocionales · Flora las usa para conocerte mejor</p>
        </div>
        <button
          onClick={openNew}
          className="bg-green-700 hover:bg-green-600 px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all shadow-lg shadow-green-900/20"
        >
          <Pencil size={15} /> Nueva entrada
        </button>
      </header>

      {loadingEntries ? (
        <div className="flex items-center justify-center py-20 text-gray-600">Cargando...</div>
      ) : entries.length === 0 ? (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-16 text-center">
          <div className="w-20 h-20 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#333]">
            <BookOpen size={40} className="text-gray-600" />
          </div>
          <h3 className="text-xl font-black mb-2">Sin entradas todavía</h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">Después de cada partido, dejá tus notas aquí. Flora va a leerlas para entender mejor al equipo.</p>
          <button onClick={openNew} className="bg-green-700 hover:bg-green-600 px-6 py-3 rounded-xl font-black text-sm transition-all">
            Escribir primera entrada
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <EntryCard key={entry.id} entry={entry} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </Layout>
  );
};

const EntryCard = ({ entry, onEdit, onDelete }: { entry: DiaryEntry; onEdit: (e: DiaryEntry) => void; onDelete: (id: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const moodObj = MOODS.find(m => m.value === entry.mood);
  const resultMap: Record<string, { label: string; cls: string }> = {
    win: { label: 'Victoria', cls: 'text-green-400 bg-green-900/15 border-green-900/30' },
    loss: { label: 'Derrota', cls: 'text-red-400 bg-red-900/15 border-red-900/30' },
    draw: { label: 'Empate', cls: 'text-gray-400 bg-[#1e1e1e] border-[#333]' },
  };
  const res = entry.result ? resultMap[entry.result] : null;

  return (
    <div className="bg-[#141414] border border-[#222] rounded-2xl overflow-hidden hover:border-[#333] transition-colors">
      <div className="p-5 flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="w-12 h-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center justify-center shrink-0">
          {moodObj ? moodObj.icon : <BookOpen size={22} className="text-gray-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-sm">vs {entry.rival}</p>
            {res && <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${res.cls}`}>{res.label}{entry.sets ? ` ${entry.sets}` : ''}</span>}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
            <Calendar size={11} /> {entry.match_date}
            {entry.mood && <span className="ml-2">· {moodObj?.label}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit(entry); }} className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-[#222] transition-all">
            <Pencil size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(entry.id); }} className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/10 transition-all">
            <Trash2 size={14} />
          </button>
          <ChevronRight size={16} className={`text-gray-600 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#1e1e1e] p-5 space-y-4">
          {entry.highlights && (
            <div>
              <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Zap size={11} /> Lo que salió bien</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{entry.highlights}</p>
            </div>
          )}
          {entry.improvements && (
            <div>
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Brain size={11} /> A mejorar</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{entry.improvements}</p>
            </div>
          )}
          {entry.technical_notes && (
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Notas técnicas</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{entry.technical_notes}</p>
            </div>
          )}
          {entry.emotional_notes && (
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Notas emocionales</p>
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{entry.emotional_notes}</p>
            </div>
          )}
          {!entry.highlights && !entry.improvements && !entry.technical_notes && !entry.emotional_notes && (
            <p className="text-sm text-gray-600 italic">Sin notas detalladas.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Diario;
