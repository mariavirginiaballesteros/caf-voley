import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { Brain, Send, Sparkles, Shield, Target, Zap, Wifi } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

type Message = { role: 'user' | 'ai'; content: string };

const SUGGESTIONS = [
  '¿Cuáles son nuestras principales debilidades en 2026?',
  '¿Cómo jugamos contra CAI Azul la próxima vez?',
  '¿Cómo mejorar la recepción en zona 5?',
  'Estrategias de ataque contra bloqueo alto',
  '¿Qué jugadora rival debemos neutralizar vs CAI Rojo?',
];

const AICoach = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: '¡Hola! Soy tu Entrenadora IA del CAF. Tengo acceso a todos los datos del equipo: plantel, partidos, scouting de rivales y análisis táctico. ¿En qué trabajamos hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const history = messages.slice(1); // exclude initial greeting
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { message: userMsg, history }
      });

      if (error) throw error;
      setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
    } catch {
      toast.error('Error al conectar con la IA');
      setMessages(prev => [...prev, { role: 'ai', content: 'Hubo un error al procesar tu consulta. Intentá de nuevo.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Layout>
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-green-800 rounded-2xl flex items-center justify-center text-yellow-500 shadow-lg border border-green-700">
            <Brain size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black">Entrenadora <span className="text-green-500">IA</span></h1>
            <div className="flex items-center gap-2">
              <p className="text-gray-400 text-sm">Análisis táctico con inteligencia artificial</p>
              <span className="flex items-center gap-1 text-[10px] font-black text-green-500 bg-green-900/20 px-2 py-0.5 rounded-full border border-green-800/40">
                <Wifi size={10} /> EN VIVO
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)]">
        <div className="lg:col-span-3 bg-[#141414] border border-[#222] rounded-3xl flex flex-col overflow-hidden shadow-2xl">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 bg-green-800 rounded-xl flex items-center justify-center mr-3 mt-1 flex-shrink-0 border border-green-700">
                    <Brain size={16} className="text-yellow-500" />
                  </div>
                )}
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-green-700 text-white rounded-tr-none'
                    : 'bg-[#242424] border border-[#333] text-gray-200 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-8 h-8 bg-green-800 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 border border-green-700">
                  <Brain size={16} className="text-yellow-500" />
                </div>
                <div className="bg-[#242424] border border-[#333] p-4 rounded-2xl rounded-tl-none">
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-[#1a1a1a] border-t border-[#222] flex gap-3">
            <input
              type="text"
              placeholder="Preguntá sobre táctica, rivales, plantel o análisis de partidos..."
              className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white p-3 rounded-xl transition-all shadow-lg shadow-green-900/20"
            >
              <Send size={20} />
            </button>
          </form>
        </div>

        <div className="space-y-4 overflow-y-auto">
          <div className="bg-[#1a1a1a] border border-[#333] p-5 rounded-2xl">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-500" /> Consultas rápidas
            </h3>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="w-full text-left p-3 bg-[#242424] hover:bg-[#2a2a2a] border border-[#333] rounded-xl text-xs font-bold text-gray-300 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-green-900/10 border border-green-900/30 p-5 rounded-2xl">
            <h3 className="text-xs font-black text-green-500 uppercase tracking-widest mb-3">Datos conectados</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                <Shield size={12} className="text-green-500" /> Plantel 2026
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                <Target size={12} className="text-yellow-500" /> Fixture y resultados
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                <Zap size={12} className="text-blue-500" /> Scouting de rivales
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                <Brain size={12} className="text-purple-400" /> Análisis táctico propio
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AICoach;
