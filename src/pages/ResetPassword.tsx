import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Eye, EyeOff, CheckCircle2, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400">Sesión no válida. Pedí un nuevo enlace de recuperación.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message || 'Error al actualizar la contraseña');
      return;
    }

    setDone(true);
    setTimeout(() => navigate('/'), 2500);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-900/40 border border-green-700/50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-black text-white">Contraseña actualizada</h2>
          <p className="text-gray-400 text-sm">Redirigiendo al inicio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-900/40 border border-green-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound size={28} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-black text-white">Nueva contraseña</h1>
          <p className="text-gray-400 text-sm mt-1">Elegí una contraseña segura para tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#242424] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-green-600 transition-colors pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Confirmar contraseña
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repetí la contraseña"
              className={`w-full bg-[#242424] border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-green-600 transition-colors ${
                confirm && confirm !== password ? 'border-red-700' : 'border-[#333]'
              }`}
            />
            {confirm && confirm !== password && (
              <p className="text-red-400 text-xs mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <><Loader size={16} className="animate-spin" /> Actualizando...</>
            ) : (
              'Guardar contraseña'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
