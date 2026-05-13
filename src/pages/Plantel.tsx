import React, { useEffect, useState, useRef } from 'react';
import { supabase, Player } from '../lib/supabase';
import { getCache, setCache, clearCache } from '../lib/cache';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { User, Plus, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Plantel = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'dt';

  const [formData, setFormData] = useState<Partial<Player>>({
    name: '',
    num: '',
    pos: 'Punta',
    notes: '',
    photo: ''
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    let photoUrl = formData.photo || '';

    if (photoFile) {
      const ext = photoFile.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('players')
        .upload(fileName, photoFile, { upsert: true });

      if (uploadError) {
        toast.error('Error al subir la foto');
        setUploading(false);
        return;
      }

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

  return (
    <Layout>
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black">Plantel <span className="text-green-500">CAF</span></h1>
          <p className="text-gray-400">Jugadoras activas temporada 2026</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all"
          >
            <Plus size={16} /> Nueva Jugadora
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {players.map((player) => (
            <div key={player.id} className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden group hover:border-green-600 transition-all relative">
              {isAdmin && (
                <button 
                  onClick={() => deletePlayer(player.id!)}
                  className="absolute top-2 right-2 z-10 p-2 bg-red-900/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <div className="aspect-square bg-[#242424] relative flex items-center justify-center overflow-hidden">
                {player.photo ? (
                  <img src={player.photo} alt={player.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <User size={64} className="text-gray-700" />
                )}
                <div className="absolute top-4 left-4 bg-green-600 text-white font-black px-3 py-1 rounded-lg shadow-xl">
                  #{player.num}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-black text-xl mb-1">{player.name}</h3>
                <p className="text-green-500 text-sm font-bold uppercase tracking-wider mb-3">{player.pos}</p>
                <p className="text-gray-400 text-xs line-clamp-2">{player.notes}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Agregar Jugadora">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
              <input 
                type="text" required
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label>
              <input 
                type="text" required
                className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
                value={formData.num}
                onChange={e => setFormData({...formData, num: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Posición</label>
            <select 
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.pos}
              onChange={e => setFormData({...formData, pos: e.target.value})}
            >
              <option value="Armadora">Armadora</option>
              <option value="Punta">Punta</option>
              <option value="Central">Central</option>
              <option value="Opuesta">Opuesta</option>
              <option value="Líbero">Líbero</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Foto (opcional)</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-[#242424] border border-dashed border-[#444] rounded-lg p-4 text-sm text-gray-500 cursor-pointer hover:border-green-500 hover:text-green-400 transition-all flex flex-col items-center gap-2"
            >
              {photoPreview ? (
                <img src={photoPreview} className="w-20 h-20 object-cover rounded-lg" />
              ) : (
                <>
                  <Upload size={20} />
                  <span className="text-xs">Subir foto desde tu dispositivo</span>
                </>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas / Perfil</label>
            <textarea 
              rows={3}
              className="w-full bg-[#242424] border border-[#333] rounded-lg p-2.5 text-sm outline-none focus:border-green-500"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          <button type="submit" disabled={uploading} className="w-full bg-green-700 hover:bg-green-600 py-3 rounded-xl font-black text-sm transition-all mt-4 disabled:opacity-50">
            {uploading ? 'Guardando...' : 'Guardar Jugadora'}
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default Plantel;