import React, { useState } from 'react';
import Layout from '../components/Layout';
import { ExternalLink, X } from 'lucide-react';

const COPAFACIL_URL = 'https://copafacil.com/-nz-9dqhz8ogimj9ap9y@20lb';

const Standings = () => {
  const [iframeLoading, setIframeLoading] = useState(true);

  return (
    <Layout>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-black">Tabla de <span className="text-green-500">Posiciones</span></h1>
        <p className="text-gray-500 text-xs mt-0.5">Temporada 2026 · Cat. B Maxi Femenino · Liga Todo Vóley</p>
      </div>

      {/* Panel Copa Fácil embebido */}
      <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        {/* Barra superior */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            <span className="text-[11px] font-bold text-gray-400">Copa Fácil · Liga Todo Vóley 2026</span>
          </div>
          <a
            href={COPAFACIL_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-green-400 transition-colors"
          >
            <ExternalLink size={10} /> Abrir en pestaña
          </a>
        </div>

        {/* iframe */}
        <div className="relative" style={{ height: '600px' }}>
          {iframeLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0d0d0d] z-10">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500">Cargando Copa Fácil...</p>
            </div>
          )}
          <iframe
            src={COPAFACIL_URL}
            title="Copa Fácil"
            className="w-full h-full border-0"
            style={{ height: '600px' }}
            onLoad={() => setIframeLoading(false)}
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </Layout>
  );
};

export default Standings;
