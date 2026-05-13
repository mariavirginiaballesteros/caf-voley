import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  Video,
  Microscope,
  Brain,
  Users,
  History,
  LogOut,
  ShieldCheck,
  ListOrdered,
  Radar,
  CircleUser,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getCache, setCache } from '../lib/cache';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { role, user } = useAuth();

  // Initialize badge counts from cache immediately, then refresh once
  const [videosCount, setVideosCount] = useState<string>(() => {
    const c = getCache<unknown[]>('videos'); return c ? String(c.length) : '';
  });
  const [playersCount, setPlayersCount] = useState<string>(() => {
    const c = getCache<unknown[]>('players'); return c ? String(c.length) : '';
  });
  const [fixtureCount, setFixtureCount] = useState<string>(() => {
    const c = getCache<unknown[]>('matches26'); return c ? String(c.length) : '';
  });

  useEffect(() => {
    // Only fetch counts if not already in cache
    if (!videosCount) {
      supabase.from('videos').select('id', { count: 'exact', head: true })
        .then(({ count }) => { if (count) setVideosCount(String(count)); });
    }
    if (!playersCount) {
      supabase.from('players').select('id', { count: 'exact', head: true })
        .then(({ count }) => { if (count) setPlayersCount(String(count)); });
    }
    if (!fixtureCount) {
      supabase.from('matches26').select('id', { count: 'exact', head: true })
        .then(({ count }) => { if (count) setFixtureCount(String(count)); });
    }
  }, []);

  const menuGroups = [
    {
      label: "PRINCIPAL",
      items: [
        { icon: <LayoutDashboard size={18} />, label: "Dashboard", path: "/", roles: ['admin', 'dt', 'player'] },
        { icon: <Trophy size={18} />, label: "Gestión de Torneos", path: "/torneos", roles: ['admin', 'dt', 'player'] },
      ]
    },
    {
      label: "TEMPORADA 2026",
      items: [
        { icon: <Calendar size={18} />, label: "Fixture 2026", path: "/fixture", roles: ['admin', 'dt', 'player'], badge: fixtureCount },
        { icon: <ListOrdered size={18} />, label: "Tabla de Posiciones", path: "/tabla", roles: ['admin', 'dt', 'player'] },
      ]
    },
    {
      label: "ANÁLISIS",
      items: [
        { icon: <Video size={18} />, label: "Videos & Jugadas", path: "/videos", roles: ['admin', 'dt', 'player'], badge: videosCount },
        { icon: <Microscope size={18} />, label: "Análisis Táctico", path: "/analisis", roles: ['admin', 'dt', 'player'] },
        { icon: <Radar size={18} />, label: "Scout Rivales", path: "/scout", roles: ['admin', 'dt', 'player'] },
      ]
    },
    {
      label: "COACHING",
      items: [
        { icon: <Brain size={18} />, label: "Entrenadora IA", path: "/ai-coach", roles: ['admin', 'dt', 'player'] },
        { icon: <Users size={18} />, label: "Plantel", path: "/plantel", roles: ['admin', 'dt', 'player'], badge: playersCount },
        { icon: <CircleUser size={18} />, label: "Mi Perfil", path: "/mi-perfil", roles: ['admin', 'dt', 'player'] },
      ]
    },
    {
      label: "ADMINISTRACIÓN",
      items: [
        { icon: <ShieldCheck size={18} />, label: "Gestión de Usuarios", path: "/usuarios", roles: ['admin'] },
      ]
    },
    {
      label: "HISTORIAL",
      items: [
        { icon: <History size={18} />, label: "Temporada 2025", path: "/history-2025", roles: ['admin', 'dt', 'player'], badge: "3°" },
      ]
    }
  ];

  const handleSignOut = () => {
    // Clear Supabase session from localStorage immediately — no network wait
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k));
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0d0d0d] border-r border-[#1e1e1e] fixed h-full hidden md:flex flex-col z-50">
        <div className="p-6 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-800 rounded-lg flex items-center justify-center font-bold text-yellow-500 shadow-lg border border-green-700">CAF</div>
            <div>
              <h2 className="text-sm font-black leading-tight">Funes C</h2>
              <p className="text-[10px] text-green-500 font-medium">Maxi Vóley Femenino</p>
            </div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-0.5 inline-block">
            <p className="text-[9px] text-yellow-500 font-black uppercase tracking-tighter">✨ CAT. B 2026</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {menuGroups.map((group, idx) => {
            // Show item if role matches, or if authenticated but role not yet loaded (show player-level items as fallback)
            const visibleItems = group.items.filter(item => !item.roles || item.roles.includes(role as string) || item.roles.includes('player'));
            if (visibleItems.length === 0) return null;
            
            return (
              <div key={idx}>
                <p className="text-[10px] font-black text-gray-500 mb-2 px-3 tracking-widest">{group.label}</p>
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between p-2.5 rounded-lg transition-all group ${
                        location.pathname === item.path 
                          ? 'bg-green-700 text-white shadow-md shadow-green-900/20' 
                          : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={location.pathname === item.path ? 'text-white' : 'text-gray-500 group-hover:text-green-500 transition-colors'}>
                          {item.icon}
                        </span>
                        <span className="text-xs font-bold">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          location.pathname === item.path ? 'bg-white/20 text-white' : 'bg-green-900/30 text-green-500'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom Badge Section */}
        <div className="p-4 border-t border-[#1e1e1e] bg-[#0a0a0a]">
          <div className="bg-[#141414] border border-[#222] rounded-xl p-3 mb-4">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Temporada Activa</p>
            <p className="text-xs font-black text-yellow-500">Liga Todo Vóley 2026</p>
            <p className="text-[9px] text-gray-400">Categoría B · Debut histórico</p>
          </div>
          
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-[10px] font-bold border border-[#333]">
              {user?.email?.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold truncate text-gray-200">{user?.email}</p>
              <p className="text-[9px] text-green-500 uppercase font-black tracking-tighter">{role}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg text-red-400 hover:bg-red-900/10 transition-all text-xs font-bold"
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;