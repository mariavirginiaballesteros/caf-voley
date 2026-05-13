import React, { useEffect, useState } from 'react';
import { supabase, Torneo } from '../lib/supabase';
import { getCache, setCache, clearCache } from '../lib/cache';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Trophy, Plus, Trash2, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES = {
  active: 'bg-green-900/30 text-green-400',
  done: 'bg-blue-900/30 text-blue-400',
  future: 'bg-gray-800 text-gray-400',
};
const STATUS_LABELS = { active: 'En curso', done: 'Finalizado', future: 'Próximamente' };

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

  return (
    <Layout>
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black">Gestión de <span className="text-green-500">Torneos</span></h1>
          <p className="text-gray-400">Historial de competiciones del CAF</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all"
          >
            <Plus size={16} /> Nuevo Torneo
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : torneos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Trophy size={48} className="text-gray-700 mb-4" />
          <h3 className="font-black text-lg text-gray-600 mb-2">Sin torneos cargados</h3>
          {isAdmin && <p className="text-gray-500 text-sm">Usá el botón "Nuevo Torneo" para empezar.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {torneos.map((torneo) => (
            <div key={torneo.id} className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy size={18} className={torneo.status === 'done' ? 'text-yellow-500' : torneo.status === 'active' ? 'text-green-500' : 'text-gray-500'} />
                    <h3 className="font-black text-xl leading-tight">{torneo.name}</h3>
                  </div>
                  <p className="text-gray-400 text-sm font-medium">{torneo.cat} · {torneo.year}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_STYLES[torneo.status]}`}>
                    {STATUS_LABELS[torneo.status]}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => deleteTorneo(torneo.id!)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{torneo.notes}</p>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Trophy size={120} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agregar Torneo">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del torneo</label>
            <input
              type="text" required
              placeholder="ej: Liga Todo Vóley – Temporada 2026"
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Año</label>
              <input
                type="number" required
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
              <select
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
              >
                <option value="active">En curso</option>
                <option value="done">Finalizado</option>
                <option value="future">Próximamente</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
            <input
              type="text"
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción / Resultados</label>
            <textarea
              rows={3}
              placeholder="Resultados, logros, datos relevantes de la temporada..."
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <button type="submit" className="w-full bg-green-700 hover:bg-green-600 py-3 rounded-xl font-black text-sm transition-all">
            Guardar Torneo
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default Torneos;
