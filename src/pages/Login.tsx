import React, { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { session, loading } = useAuth();
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
      if (event === 'USER_UPDATED') setIsRecovery(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (session && !isRecovery) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-800 rounded-2xl flex items-center justify-center font-bold text-yellow-500 text-2xl mx-auto mb-4">CAF</div>
          <h1 className="text-2xl font-black text-white">Acceso al Club</h1>
          <p className="text-gray-400 text-sm">Ingresa tus credenciales para continuar</p>
        </div>
        
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#1B5E20',
                  brandAccent: '#2E7D32',
                  inputBackground: '#242424',
                  inputText: 'white',
                  inputPlaceholder: '#666',
                }
              }
            }
          }}
          theme="dark"
          providers={[]}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Correo electrónico',
                password_label: 'Contraseña',
                button_label: 'Iniciar Sesión',
                loading_button_label: 'Iniciando sesión...',
                email_input_placeholder: 'tu@email.com',
                password_input_placeholder: 'Tu contraseña',
                link_text: '¿No tenés cuenta? Registrate',
              },
              sign_up: {
                email_label: 'Correo electrónico',
                password_label: 'Contraseña',
                button_label: 'Registrarse',
                loading_button_label: 'Registrando...',
                link_text: '¿Ya tenés cuenta? Iniciá sesión',
              },
              forgotten_password: {
                link_text: '¿Olvidaste tu contraseña?',
                email_label: 'Correo electrónico',
                email_input_placeholder: 'tu@email.com',
                button_label: 'Enviar instrucciones',
                loading_button_label: 'Enviando...',
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default Login;