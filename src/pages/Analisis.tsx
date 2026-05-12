import React, { useEffect, useState } from 'react';
import { supabase, AnalysisItem, DTContext } from '../lib/supabase';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Brain, Target, AlertTriangle, Plus, Trash2, Trophy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Item = AnalysisItem & { status?: 'active' | 'conquered'; conquered_at?: string };

const Analisis = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

  const [formData, setFormData] = useState<Partial<AnalysisItem>>({ type: 'strength', text: '', detail: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data } = await supabase.from('analysis_items').select('*').order('sort_order');
    if (data) setItems(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('analysis_items').insert([{ ...formData, status: 'active' }]);
    if (error) toast.error('Error al guardar');
    else { toast.success('Análisis actualizado'); setIsModalOpen(false); fetchData(); }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('analysis_items').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Eliminado'); fetchData(); }
  };

  const conquer = async (id: string) => {
    const { error } = await supabase.from('analysis_items').update({
      status: 'conquered',
      conquered_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) toast.error('Error');
    else { toast.success('¡Mejora conquistada! 🏆'); fetchData(); }
  };

  const reopen = async (id: string) => {
    const { error } = await supabase.from('analysis_items').update({ status: 'active', conquered_at: null }).eq('id', id);
    if (error) toast.error('Error');
    else { fetchData(); }
  };

  const active = items.filter(i => i.status !== 'conquered');
  const conquered = items.filter(i => i.status === 'conquered');
  const strengths = active.filter(i => i.type === 'strength');
  const weaknesses = active.filter(i => i.type === 'weakness');

  return (
    <Layout>
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black">Pizarra <span className="text-green-500">Táctica</span></h1>
          <p className="text-gray-400">Análisis de rendimiento del equipo</p>
        </div>
        {isAdmin && (
          <button onClick={() => setIsModalOpen(true)}
            className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all">
            <Plus size={16} /> Nuevo Análisis
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Activos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-400">
                <Target size={20} /> Fortalezas
              </h3>
              <div className="space-y-3">
                {strengths.length === 0 && <p className="text-gray-600 text-sm text-center py-4">Sin fortalezas cargadas</p>}
                {strengths.map(item => (
                  <div key={item.id} className="p-4 bg-green-900/10 border border-green-900/30 rounded-xl group relative">
                    <p className="font-bold text-sm text-green-400 mb-1">{item.text}</p>
                    <p className="text-xs text-gray-400">{item.detail}</p>
                    {isAdmin && (
                      <button onClick={() => deleteItem(item.id!)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-400">
                <AlertTriangle size={20} /> A Mejorar
              </h3>
              <div className="space-y-3">
                {weaknesses.length === 0 && <p className="text-gray-600 text-sm text-center py-4">¡Sin puntos pendientes!</p>}
                {weaknesses.map(item => (
                  <div key={item.id} className="p-4 bg-red-900/10 border border-red-900/30 rounded-xl group relative">
                    <p className="font-bold text-sm text-red-400 mb-1">{item.text}</p>
                    <p className="text-xs text-gray-400">{item.detail}</p>
                    {isAdmin && (
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => conquer(item.id!)}
                          title="Marcar como conquistado"
                          className="text-yellow-500 hover:text-yellow-400 transition-colors">
                          <CheckCircle2 size={16} />
                        </button>
                        <button onClick={() => deleteItem(item.id!)} className="text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Conquistados */}
          {conquered.length > 0 && (
            <div className="bg-gradient-to-r from-[#1a1a1a] to-[#111] border border-yellow-900/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
              <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-yellow-500 pl-3">
                <Trophy size={20} /> Mejoras Conquistadas
              </h3>
              <p className="text-gray-500 text-xs mb-5 pl-3">Debilidades que el equipo trabajó y superó</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {conquered.map(item => (
                  <div key={item.id}
                    className="p-4 bg-yellow-900/10 border border-yellow-900/30 rounded-xl flex items-start gap-3 group relative">
                    <Trophy size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-yellow-400">{item.text}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                      {item.conquered_at && (
                        <p className="text-[10px] text-gray-600 mt-1">
                          Conquistado el {new Date(item.conquered_at).toLocaleDateString('es-AR')}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <button onClick={() => reopen(item.id!)}
                        title="Reabrir"
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-400 transition-all text-[10px] font-bold flex-shrink-0">
                        reabrir
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-5">
                <Trophy size={120} />
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agregar Análisis">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
            <select className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
              <option value="strength">Fortaleza</option>
              <option value="weakness">Punto a Mejorar</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
            <input type="text" required
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.text} onChange={e => setFormData({ ...formData, text: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Detalle Táctico</label>
            <textarea rows={3}
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.detail} onChange={e => setFormData({ ...formData, detail: e.target.value })} />
          </div>
          <button type="submit" className="w-full bg-green-700 hover:bg-green-600 py-3 rounded-xl font-black text-sm transition-all mt-4">
            Guardar en Pizarra
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default Analisis;
