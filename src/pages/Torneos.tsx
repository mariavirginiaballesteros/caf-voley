import React, { useEffect, useState } from 'react';
import { supabase, Torneo } from '../lib/supabase';
import { getCache, setCache, clearCache } from '../lib/cache';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Trophy, Plus, Trash2, ExternalLink, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const COPAFACIL_URL = 'https://copafacil.com/-nz-9dqhz8ogimj9ap9y@20lb';

const STATUS_CFG = {
  active:  { label: 'En curso',      cls: 'bg-green-500/20 text-green-400 border-green-500/30',  Icon: Zap },
  done:    { label: 'Finalizado',    cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30',      Icon: CheckCircle2 },
  future:  { label: 'Próximamente', cls: 'bg-gray-700/50 text-gray-400 border-gray-600/30',      Icon: Clock },
};

const Torneos = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Torneo>>({
    name: '', year: new Date().getFullYear(), cat: 'Categoría B Maxi Femenino', status: 'active', notes: ''
  });

  useEffect(() => { fetchTorneos(); }, []);

  const fetchTorneos = async () => {
    const cached = getCache<Torneo[]>('torneos');
    if (cached) { setTorneos(cached); setLoading(false); }
    try {
      const { data, error } = await supabase.from('torneos').select('*').order('year', { ascending: false });
      if (error) { if (!cached) toast.error('Error al cargar torneos'); }
      else { setTorneos(data || []); setCache('torneos', data || []); }
    } catch { if (!cached) toast.error('Error de conexión'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('torneos').insert([form]);
    if (error) toast.error('Error al guardar torneo');
    else {
      toast.success('Torneo agregado');
      setIsModalOpen(false);
      setForm({ name: '', year: new Date().getFullYear(), cat: 'Categoría B Maxi Femenino', status: 'active', notes: '' });
      clearCache('torneos');
      fetchTorneos();
    }
  };

  const deleteTorneo = async (id: string) => {
    if (!confirm('¿Eliminar torneo?')) return;
    const { error } = await supabase.from('torneos').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Torneo eliminado'); clearCache('torneos'); fetchTorneos(); }
  };

  const active = torneos.find(t => t.status === 'active');
  const rest = torneos.filter(t => t.status !== 'active');

  return (
    <Layout>
      {/* Header compacto */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black">Torneos <span className="text-green-500">CAF</span></h1>
          <p className="text-gray-500 text-xs mt-0.5">{torneos.length} competicion{torneos.length !== 1 ? 'es' : ''} registrada{torneos.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={COPAFACIL_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#111] border border-[#2a2a2a] hover:border-green-700/50 rounded-lg text-[11px] font-bold text-gray-400 hover:text-green-400 transition-all"
          >
            <ExternalLink size={12} /> Copa Fácil
          </a>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-[11px] font-black transition-all"
            >
              <Plus size={13} /> Nuevo
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : torneos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Trophy size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm font-bold">Sin torneos cargados</p>
          {isAdmin && <p className="text-gray-600 text-xs mt-1">Agregá el primero con el botón "Nuevo"</p>}
        </div>
      ) : (
        <div className="space-y-3">

          {/* TORNEO ACTIVO — Destacado */}
          {active && (
            <div className="relative bg-gradient-to-br from-green-950/40 to-[#0f1a0f] border border-green-800/50 rounded-2xl p-5 overflow-hidden">
              {/* Brillo de fondo */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                      <Zap size={9} fill="currentColor" /> En curso
                    </span>
                  </div>
                  <h2 className="font-black text-lg leading-tight text-white">{active.name}</h2>
                  <p className="text-gray-400 text-xs mt-0.5">{active.cat} · {active.year}</p>
                  {active.notes && (
                    <p className="text-gray-400 text-xs mt-2 leading-relaxed">{active.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={COPAFACIL_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700/30 hover:bg-green-700/50 border border-green-700/40 rounded-lg text-[11px] font-bold text-green-400 transition-all"
                  >
                    <ExternalLink size={11} /> Ver fixture
                  </a>
                  {isAdmin && (
                    <button onClick={() => deleteTorneo(active.id!)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Pulso "en vivo" */}
              <div className="absolute top-4 right-4 w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </div>
            </div>
          )}

          {/* RESTO DE TORNEOS */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {rest.map(torneo => {
                const cfg = STATUS_CFG[torneo.status];
                const Icon = cfg.Icon;
                return (
                  <div key={torneo.id} className="group bg-[#111] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-xl p-4 flex items-start gap-3 transition-all">
                    <div className="w-9 h-9 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Trophy size={15} className={torneo.status === 'done' ? 'text-yellow-600' : 'text-gray-600'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm leading-tight truncate">{torneo.name}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{torneo.cat} · {torneo.year}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wider border px-1.5 py-0.5 rounded-full ${cfg.cls}`}>
                            <Icon size={8} /> {cfg.label}
                          </span>
                          {isAdmin && (
                            <button onClick={() => deleteTorneo(torneo.id!)} className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      {torneo.notes && <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed">{torneo.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Link Copa Fácil al pie */}
          <div className="flex items-center justify-center pt-2">
            <a
              href={COPAFACIL_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-[11px] text-gray-600 hover:text-green-400 transition-colors"
            >
              <ExternalLink size={11} />
              Datos del torneo en tiempo real → Copa Fácil · Femenino C
            </a>
          </div>
        </div>
      )}

      {/* Modal agregar torneo */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agregar Torneo">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Nombre del torneo</label>
            <input
              type="text" required
              placeholder="ej: Liga Todo Vóley – Temporada 2026"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Año</label>
              <input
                type="number" required
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Estado</label>
              <select
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
                value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
              >
                <option value="active">En curso</option>
                <option value="done">Finalizado</option>
                <option value="future">Próximamente</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Categoría</label>
            <input
              type="text"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 transition-colors"
              value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Notas / Resultados</label>
            <textarea
              rows={3}
              placeholder="Resultados, logros, datos relevantes..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2.5 text-sm outline-none focus:border-green-500 resize-none transition-colors placeholder-gray-700"
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <button type="submit" className="w-full bg-green-700 hover:bg-green-600 py-2.5 rounded-xl font-black text-sm transition-all">
            Guardar Torneo
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default Torneos;
