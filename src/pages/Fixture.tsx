import React, { useEffect, useState } from 'react';
import { supabase, Match } from '../lib/supabase';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Calendar, MapPin, Trophy, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Fixture = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

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
    const { data, error } = await supabase
      .from('matches26')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) toast.error('Error al cargar el fixture');
    else setMatches(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('matches26').insert([formData]);
    if (error) toast.error('Error al guardar el partido');
    else {
      toast.success('Partido guardado correctamente');
      setIsModalOpen(false);
      fetchMatches();
    }
  };

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
          {matches.map((match) => (
            <div key={match.id} className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                  match.res === 'win' ? 'bg-green-900/30 text-green-400' : 
                  match.res === 'loss' ? 'bg-red-900/30 text-red-400' : 'bg-gray-800 text-gray-400'
                }`}>
                  {match.res === 'win' ? 'V' : match.res === 'loss' ? 'D' : '-'}
                </div>
                <div>
                  <h3 className="font-bold text-lg">vs {match.rival}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {match.date}</span>
                    <span className="flex items-center gap-1"><MapPin size={12}/> {match.cond}</span>
                    <span className="flex items-center gap-1"><Trophy size={12}/> {match.fase}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white">{match.sets || 'vs'}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Resultado</p>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </Layout>
  );
};

export default Fixture;