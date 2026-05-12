import React, { useEffect, useState } from 'react';
import { supabase, Torneo } from '../lib/supabase';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { Trophy, CheckCircle2, Clock, Calendar } from 'lucide-react';

const Torneos = () => {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTorneos = async () => {
      const { data, error } = await supabase
        .from('torneos')
        .select('*')
        .order('year', { ascending: false });
      
      if (error) toast.error('Error al cargar torneos');
      else setTorneos(data || []);
      setLoading(false);
    };
    fetchTorneos();
  }, []);

  return (
    <Layout>
      <header className="mb-8">
        <h1 className="text-3xl font-black">Historial de <span className="text-green-500">Torneos</span></h1>
        <p className="text-gray-400">Competiciones y logros del equipo</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {torneos.map((torneo) => (
            <div key={torneo.id} className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy size={18} className={torneo.status === 'done' ? 'text-yellow-500' : 'text-green-500'} />
                    <h3 className="font-black text-xl">{torneo.name}</h3>
                  </div>
                  <p className="text-gray-400 text-sm font-medium">{torneo.cat} · {torneo.year}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  torneo.status === 'active' ? 'bg-green-900/30 text-green-400' : 
                  torneo.status === 'done' ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-800 text-gray-400'
                }`}>
                  {torneo.status === 'active' ? 'En curso' : torneo.status === 'done' ? 'Finalizado' : 'Próximamente'}
                </span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{torneo.notes}</p>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Trophy size={120} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Torneos;