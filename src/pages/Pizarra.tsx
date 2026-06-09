import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  RefreshCw, Brain, AlertCircle, CheckCircle, Loader,
  Target, Zap, Shield, ChevronRight, Layers, LayoutGrid, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type Rotation = {
  label: string;
  description: string;
  positions: { id: string; x: number; y: number; role: string; color: string }[];
};

type Overlay = 'recepcion' | 'ataque' | 'saque' | 'defensa';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  S:   '#f59e0b',
  OP:  '#ef4444',
  M1:  '#3b82f6',
  OH1: '#22c55e',
  M2:  '#6366f1',
  OH2: '#10b981',
};

// Zone centres for OUR side (left half, x 10–309)
// Zones numbered standard volleyball: 1=back-right, 2=front-right, 3=front-mid, 4=front-left, 5=back-left, 6=back-mid
const ZONE_CENTERS: Record<number, [number, number]> = {
  1: [260, 265],
  2: [260,  95],
  3: [160,  95],
  4: [ 60,  95],
  5: [ 60, 265],
  6: [160, 265],
};

// 5-1 rotations: setter zone for R1–R6, plus full 6-player positions
const ROTATIONS: Rotation[] = [
  {
    label: 'R1 — Armadora zaguera',
    description: 'Armadora en zona 1. Opuesta en zona 2. OH1 y OH2 en puntas. Centrales en 3 y 6.',
    positions: [
      { id: 'S',   x: ZONE_CENTERS[1][0], y: ZONE_CENTERS[1][1], role: 'S',   color: ROLE_COLORS['S']   },
      { id: 'OP',  x: ZONE_CENTERS[2][0], y: ZONE_CENTERS[2][1], role: 'OP',  color: ROLE_COLORS['OP']  },
      { id: 'M1',  x: ZONE_CENTERS[3][0], y: ZONE_CENTERS[3][1], role: 'M1',  color: ROLE_COLORS['M1']  },
      { id: 'OH1', x: ZONE_CENTERS[4][0], y: ZONE_CENTERS[4][1], role: 'OH1', color: ROLE_COLORS['OH1'] },
      { id: 'M2',  x: ZONE_CENTERS[5][0], y: ZONE_CENTERS[5][1], role: 'M2',  color: ROLE_COLORS['M2']  },
      { id: 'OH2', x: ZONE_CENTERS[6][0], y: ZONE_CENTERS[6][1], role: 'OH2', color: ROLE_COLORS['OH2'] },
    ],
  },
  {
    label: 'R2 — Armadora rota a Z6',
    description: 'Armadora en zona 6. Opuesta al fondo derecho. Libero reemplaza central zaguera.',
    positions: [
      { id: 'OH1', x: ZONE_CENTERS[1][0], y: ZONE_CENTERS[1][1], role: 'OH1', color: ROLE_COLORS['OH1'] },
      { id: 'S',   x: ZONE_CENTERS[6][0], y: ZONE_CENTERS[6][1], role: 'S',   color: ROLE_COLORS['S']   },
      { id: 'OP',  x: ZONE_CENTERS[2][0], y: ZONE_CENTERS[2][1], role: 'OP',  color: ROLE_COLORS['OP']  },
      { id: 'M1',  x: ZONE_CENTERS[3][0], y: ZONE_CENTERS[3][1], role: 'M1',  color: ROLE_COLORS['M1']  },
      { id: 'OH2', x: ZONE_CENTERS[4][0], y: ZONE_CENTERS[4][1], role: 'OH2', color: ROLE_COLORS['OH2'] },
      { id: 'M2',  x: ZONE_CENTERS[5][0], y: ZONE_CENTERS[5][1], role: 'M2',  color: ROLE_COLORS['M2']  },
    ],
  },
  {
    label: 'R3 — Armadora en Z5',
    description: 'Armadora en zona 5 (zaguera izquierda). Opuesta delantera derecha.',
    positions: [
      { id: 'M2',  x: ZONE_CENTERS[1][0], y: ZONE_CENTERS[1][1], role: 'M2',  color: ROLE_COLORS['M2']  },
      { id: 'OH1', x: ZONE_CENTERS[6][0], y: ZONE_CENTERS[6][1], role: 'OH1', color: ROLE_COLORS['OH1'] },
      { id: 'S',   x: ZONE_CENTERS[5][0], y: ZONE_CENTERS[5][1], role: 'S',   color: ROLE_COLORS['S']   },
      { id: 'OP',  x: ZONE_CENTERS[2][0], y: ZONE_CENTERS[2][1], role: 'OP',  color: ROLE_COLORS['OP']  },
      { id: 'M1',  x: ZONE_CENTERS[3][0], y: ZONE_CENTERS[3][1], role: 'M1',  color: ROLE_COLORS['M1']  },
      { id: 'OH2', x: ZONE_CENTERS[4][0], y: ZONE_CENTERS[4][1], role: 'OH2', color: ROLE_COLORS['OH2'] },
    ],
  },
  {
    label: 'R4 — Armadora en Z4',
    description: 'Armadora en zona 4 (delantera izquierda). Opuesta en zona 5.',
    positions: [
      { id: 'OH2', x: ZONE_CENTERS[1][0], y: ZONE_CENTERS[1][1], role: 'OH2', color: ROLE_COLORS['OH2'] },
      { id: 'M2',  x: ZONE_CENTERS[6][0], y: ZONE_CENTERS[6][1], role: 'M2',  color: ROLE_COLORS['M2']  },
      { id: 'OH1', x: ZONE_CENTERS[5][0], y: ZONE_CENTERS[5][1], role: 'OH1', color: ROLE_COLORS['OH1'] },
      { id: 'S',   x: ZONE_CENTERS[4][0], y: ZONE_CENTERS[4][1], role: 'S',   color: ROLE_COLORS['S']   },
      { id: 'OP',  x: ZONE_CENTERS[2][0], y: ZONE_CENTERS[2][1], role: 'OP',  color: ROLE_COLORS['OP']  },
      { id: 'M1',  x: ZONE_CENTERS[3][0], y: ZONE_CENTERS[3][1], role: 'M1',  color: ROLE_COLORS['M1']  },
    ],
  },
  {
    label: 'R5 — Armadora en Z3',
    description: 'Armadora en zona 3 (delantera centro). Opuesta zaguera izquierda.',
    positions: [
      { id: 'M1',  x: ZONE_CENTERS[1][0], y: ZONE_CENTERS[1][1], role: 'M1',  color: ROLE_COLORS['M1']  },
      { id: 'OH2', x: ZONE_CENTERS[6][0], y: ZONE_CENTERS[6][1], role: 'OH2', color: ROLE_COLORS['OH2'] },
      { id: 'M2',  x: ZONE_CENTERS[5][0], y: ZONE_CENTERS[5][1], role: 'M2',  color: ROLE_COLORS['M2']  },
      { id: 'OH1', x: ZONE_CENTERS[4][0], y: ZONE_CENTERS[4][1], role: 'OH1', color: ROLE_COLORS['OH1'] },
      { id: 'S',   x: ZONE_CENTERS[3][0], y: ZONE_CENTERS[3][1], role: 'S',   color: ROLE_COLORS['S']   },
      { id: 'OP',  x: ZONE_CENTERS[2][0], y: ZONE_CENTERS[2][1], role: 'OP',  color: ROLE_COLORS['OP']  },
    ],
  },
  {
    label: 'R6 — Armadora en Z2',
    description: 'Armadora en zona 2 (delantera derecha). Opuesta zaguera centro.',
    positions: [
      { id: 'OP',  x: ZONE_CENTERS[1][0], y: ZONE_CENTERS[1][1], role: 'OP',  color: ROLE_COLORS['OP']  },
      { id: 'M1',  x: ZONE_CENTERS[6][0], y: ZONE_CENTERS[6][1], role: 'M1',  color: ROLE_COLORS['M1']  },
      { id: 'OH2', x: ZONE_CENTERS[5][0], y: ZONE_CENTERS[5][1], role: 'OH2', color: ROLE_COLORS['OH2'] },
      { id: 'M2',  x: ZONE_CENTERS[4][0], y: ZONE_CENTERS[4][1], role: 'M2',  color: ROLE_COLORS['M2']  },
      { id: 'OH1', x: ZONE_CENTERS[3][0], y: ZONE_CENTERS[3][1], role: 'OH1', color: ROLE_COLORS['OH1'] },
      { id: 'S',   x: ZONE_CENTERS[2][0], y: ZONE_CENTERS[2][1], role: 'S',   color: ROLE_COLORS['S']   },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  S:   'Armadora',
  OP:  'Opuesta',
  M1:  'Central 1',
  OH1: 'Punta 1',
  M2:  'Central 2',
  OH2: 'Punta 2',
};

// ─── SVG Court ────────────────────────────────────────────────────────────────

const CourtSVG = ({
  rotation,
  overlay,
}: {
  rotation: Rotation;
  overlay: Overlay;
}) => {
  // Court is 620×360 viewBox
  // Our side: x 10–308, opponent: x 312–610
  // Net: x 308–312
  // Attack line our side: x 208

  const renderOverlay = () => {
    if (overlay === 'recepcion') {
      // W-formation reception: 5 receivers in W pattern
      const pts = [
        [55, 290], [110, 250], [160, 280], [210, 250], [265, 290]
      ];
      return (
        <g opacity="0.7">
          {pts.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={12} fill="#22c55e" fillOpacity={0.2} stroke="#22c55e" strokeWidth={1.5} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize={9} fill="#22c55e" fontWeight="bold">R</text>
            </g>
          ))}
          {/* W connector lines */}
          <polyline
            points={pts.map(p => p.join(',')).join(' ')}
            fill="none" stroke="#22c55e" strokeWidth={1} strokeDasharray="4 3" opacity={0.5}
          />
          {/* Arrow from reception zone toward setter */}
          <line x1={160} y1={265} x2={255} y2={170} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5 3" markerEnd="url(#arrowGreen)" />
        </g>
      );
    }

    if (overlay === 'ataque') {
      const attacks = [
        { from: [60, 100], to: [560, 130], label: 'X-cross' },
        { from: [160, 100], to: [450, 80],  label: 'Pipe' },
        { from: [260, 100], to: [370, 200], label: 'Z-line' },
      ];
      return (
        <g opacity={0.8}>
          {attacks.map((a, i) => (
            <g key={i}>
              <line
                x1={a.from[0]} y1={a.from[1]}
                x2={a.to[0]}   y2={a.to[1]}
                stroke="#ef4444" strokeWidth={2} markerEnd="url(#arrowRed)"
              />
              <text x={(a.from[0] + a.to[0]) / 2} y={(a.from[1] + a.to[1]) / 2 - 6}
                fontSize={8} fill="#ef4444" textAnchor="middle" fontWeight="bold">
                {a.label}
              </text>
            </g>
          ))}
          {/* Quick set zone highlight */}
          <rect x={130} y={75} width={80} height={35} rx={4}
            fill="#f59e0b" fillOpacity={0.15} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 2" />
          <text x={170} y={98} textAnchor="middle" fontSize={8} fill="#f59e0b" fontWeight="bold">QUICK</text>
        </g>
      );
    }

    if (overlay === 'saque') {
      const zones = [
        { x: 530, y: 80,  w: 70, h: 70,  label: 'Z5', color: '#22c55e' },
        { x: 430, y: 80,  w: 70, h: 70,  label: 'Z6', color: '#f59e0b' },
        { x: 530, y: 200, w: 70, h: 70,  label: 'Z1', color: '#ef4444' },
      ];
      return (
        <g opacity={0.8}>
          {/* Serve origin */}
          <circle cx={160} cy={330} r={10} fill="#6366f1" fillOpacity={0.3} stroke="#6366f1" strokeWidth={2} />
          <text x={160} y={334} textAnchor="middle" fontSize={8} fill="#6366f1" fontWeight="bold">S</text>
          {zones.map((z, i) => (
            <g key={i}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={4}
                fill={z.color} fillOpacity={0.15} stroke={z.color} strokeWidth={1.5} />
              <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 4} textAnchor="middle"
                fontSize={10} fill={z.color} fontWeight="bold">{z.label}</text>
              <line x1={160} y1={325} x2={z.x + z.w / 2} y2={z.y + z.h / 2}
                stroke={z.color} strokeWidth={1} strokeDasharray="5 3" opacity={0.6} markerEnd={`url(#arrow${i})`} />
            </g>
          ))}
        </g>
      );
    }

    if (overlay === 'defensa') {
      const coverage = [
        { x: 55,  y: 250, label: 'D1' },
        { x: 160, y: 270, label: 'D6' },
        { x: 265, y: 250, label: 'D5' },
        { x: 55,  y: 110, label: 'D4' },
        { x: 265, y: 110, label: 'D2' },
      ];
      return (
        <g opacity={0.75}>
          {coverage.map((c, i) => (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r={14} fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={1.5} />
              <text x={c.x} y={c.y + 4} textAnchor="middle" fontSize={9} fill="#3b82f6" fontWeight="bold">{c.label}</text>
            </g>
          ))}
          {/* Block shadow zone */}
          <rect x={240} y={80} width={65} height={45} rx={4}
            fill="#6366f1" fillOpacity={0.15} stroke="#6366f1" strokeWidth={1} strokeDasharray="3 2" />
          <text x={272} y={107} textAnchor="middle" fontSize={8} fill="#6366f1" fontWeight="bold">BLOQUEO</text>
        </g>
      );
    }

    return null;
  };

  return (
    <svg viewBox="0 0 620 360" className="w-full h-full" style={{ maxHeight: '380px' }}>
      <defs>
        <marker id="arrowGreen" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#22c55e" />
        </marker>
        <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#ef4444" />
        </marker>
        <marker id="arrow0" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#22c55e" />
        </marker>
        <marker id="arrow1" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#f59e0b" />
        </marker>
        <marker id="arrow2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#ef4444" />
        </marker>
      </defs>

      {/* Court background */}
      <rect x={10} y={10} width={600} height={340} rx={4} fill="#1a2e1a" stroke="#2d4a2d" strokeWidth={2} />

      {/* Our half */}
      <rect x={10} y={10} width={299} height={340} fill="#162416" />
      {/* Opponent half */}
      <rect x={311} y={10} width={299} height={340} fill="#1a1a1a" />

      {/* Zone dividers — our side */}
      <line x1={10}  y1={180} x2={309} y2={180} stroke="#2d4a2d" strokeWidth={0.5} strokeDasharray="4 4" />
      <line x1={110} y1={10}  x2={110} y2={350} stroke="#2d4a2d" strokeWidth={0.5} strokeDasharray="4 4" />
      <line x1={210} y1={10}  x2={210} y2={350} stroke="#2d4a2d" strokeWidth={0.5} strokeDasharray="4 4" />

      {/* Zone labels */}
      {Object.entries(ZONE_CENTERS).map(([z, [cx, cy]]) => (
        <text key={z} x={cx} y={cy - 22} textAnchor="middle" fontSize={9}
          fill="#2a5a2a" fontWeight="bold" opacity={0.6}>Z{z}</text>
      ))}

      {/* Attack line our side */}
      <line x1={210} y1={10} x2={210} y2={350} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.4} />
      <text x={215} y={355} fontSize={8} fill="#f59e0b" opacity={0.5}>ataque</text>

      {/* Net */}
      <rect x={307} y={10} width={6} height={340} fill="#444" />
      <line x1={310} y1={10} x2={310} y2={350} stroke="#888" strokeWidth={1} />
      <text x={310} y={6} textAnchor="middle" fontSize={8} fill="#666">RED</text>

      {/* Court border */}
      <rect x={10} y={10} width={600} height={340} rx={4} fill="none" stroke="#2d4a2d" strokeWidth={2} />

      {/* Our side label */}
      <text x={160} y={355} textAnchor="middle" fontSize={8} fill="#22c55e" fontWeight="bold" opacity={0.6}>
        CAF FUNES
      </text>
      {/* Opponent label */}
      <text x={460} y={355} textAnchor="middle" fontSize={8} fill="#555" fontWeight="bold">
        RIVAL
      </text>

      {/* Opponent court zones (lighter) */}
      <line x1={311} y1={180} x2={610} y2={180} stroke="#252525" strokeWidth={0.5} strokeDasharray="4 4" />
      <line x1={411} y1={10}  x2={411} y2={350} stroke="#252525" strokeWidth={0.5} strokeDasharray="4 4" />
      <line x1={511} y1={10}  x2={511} y2={350} stroke="#252525" strokeWidth={0.5} strokeDasharray="4 4" />

      {/* Overlay */}
      {renderOverlay()}

      {/* Player tokens */}
      {rotation.positions.map((p) => (
        <g key={p.id}>
          <circle
            cx={p.x} cy={p.y} r={18}
            fill={p.color} fillOpacity={0.2}
            stroke={p.color} strokeWidth={2}
          />
          <circle cx={p.x} cy={p.y} r={14} fill={p.color} fillOpacity={0.85} />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={9}
            fill="white" fontWeight="black">{p.role}</text>
        </g>
      ))}
    </svg>
  );
};

// ─── Flora Analysis Panel ──────────────────────────────────────────────────────

const parseAnalysis = (content: string): { icon: React.ReactNode; text: string }[] => {
  const lines = content
    .split('\n')
    .map(l => l.replace(/^[-•*]\s*/, '').trim())
    .filter(l => l.length > 10);

  const icons = [
    <Target size={13} className="text-green-400 flex-shrink-0 mt-0.5" />,
    <Zap     size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" />,
    <Shield  size={13} className="text-blue-400 flex-shrink-0 mt-0.5"  />,
  ];
  return lines.slice(0, 9).map((text, i) => ({ icon: icons[i % 3], text }));
};

// ─── Main Component ────────────────────────────────────────────────────────────

const Pizarra = () => {
  const { session } = useAuth();

  const [rotationIdx, setRotationIdx] = useState(0);
  const [overlay, setOverlay]         = useState<Overlay>('recepcion');

  const [teamAnalysis, setTeamAnalysis]       = useState<{ content: string; match_count: number; generated_at: string } | null>(null);
  const [playedCount, setPlayedCount]         = useState(0);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [updating, setUpdating]               = useState(false);

  const hasNewContent = playedCount > (teamAnalysis?.match_count ?? 0) || !teamAnalysis;

  const fetchData = useCallback(async () => {
    setLoadingAnalysis(true);
    const [{ data: analysis }, { count }] = await Promise.all([
      supabase.from('team_analysis').select('content,match_count,generated_at').order('generated_at', { ascending: false }).limit(1).single(),
      supabase.from('matches26').select('id', { count: 'exact', head: true }).neq('res', 'pending'),
    ]);
    if (analysis) setTeamAnalysis(analysis as any);
    setPlayedCount(count ?? 0);
    setLoadingAnalysis(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refreshAnalysis = async () => {
    if (!session?.access_token) return;
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-team-analysis', {
        body: { force: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Análisis táctico actualizado por Flora');
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar el análisis');
    } finally {
      setUpdating(false);
    }
  };

  const overlayTabs: { id: Overlay; label: string; icon: React.ReactNode }[] = [
    { id: 'recepcion', label: 'Recepción', icon: <Shield size={13} />   },
    { id: 'ataque',    label: 'Ataque',    icon: <Zap size={13} />      },
    { id: 'saque',     label: 'Saque',     icon: <Target size={13} />   },
    { id: 'defensa',   label: 'Defensa',   icon: <Layers size={13} />   },
  ];

  const rotation = ROTATIONS[rotationIdx];
  const analysisBullets = teamAnalysis ? parseAnalysis(teamAnalysis.content) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-green-400 transition-colors mb-2"
          >
            <ArrowLeft size={12} /> Volver al menú
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <LayoutGrid size={22} className="text-green-500" />
            <h1 className="text-2xl font-black text-white">Pizarra Táctica</h1>
          </div>
          <p className="text-sm text-gray-500">Sistema 5-1 · Rotaciones · Análisis Flora IA</p>
        </div>
        <div className="flex items-center gap-2">
          {!loadingAnalysis && (
            hasNewContent ? (
              <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-1.5">
                <AlertCircle size={12} className="text-yellow-400" />
                <span className="text-[11px] text-yellow-400 font-bold">
                  {playedCount - (teamAnalysis?.match_count ?? 0)} partido{playedCount - (teamAnalysis?.match_count ?? 0) !== 1 ? 's' : ''} nuevo{playedCount - (teamAnalysis?.match_count ?? 0) !== 1 ? 's' : ''} sin analizar
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5">
                <CheckCircle size={12} className="text-green-400" />
                <span className="text-[11px] text-green-400 font-bold">Análisis al día</span>
              </div>
            )
          )}
          <button
            onClick={refreshAnalysis}
            disabled={updating || (!hasNewContent)}
            title={!hasNewContent ? 'No hay nuevos partidos para analizar' : 'Actualizar análisis con Flora IA'}
            className="flex items-center gap-2 bg-green-900/30 hover:bg-green-900/50 border border-green-800/40 text-green-400 px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {updating
              ? <><Loader size={13} className="animate-spin" /> Analizando...</>
              : <><RefreshCw size={13} /> Actualizar análisis</>
            }
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Court panel — 3 cols */}
        <div className="xl:col-span-3 space-y-4">

          {/* Overlay selector */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-4">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Sistema de entrenamiento</p>
            <div className="grid grid-cols-4 gap-2">
              {overlayTabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setOverlay(t.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    overlay === t.id
                      ? 'bg-green-700 text-white shadow-md shadow-green-900/20'
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222]'
                  }`}
                >
                  {t.icon}
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Court */}
          <div className="bg-[#0d1a0d] border border-[#1e2e1e] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                {overlayTabs.find(t => t.id === overlay)?.label} · {rotation.label}
              </p>
              <div className="flex items-center gap-1">
                {ROTATIONS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setRotationIdx(i)}
                    className={`w-6 h-6 rounded-full text-[9px] font-black transition-all ${
                      i === rotationIdx ? 'bg-green-600 text-white' : 'bg-[#1a2a1a] text-gray-500 hover:text-white'
                    }`}
                  >R{i + 1}</button>
                ))}
              </div>
            </div>
            <CourtSVG rotation={rotation} overlay={overlay} />
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">{rotation.description}</p>
          </div>

          {/* Legend */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-4">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Referencias posicionales</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ROLE_LABELS).map(([id, name]) => (
                <div key={id} className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
                    style={{ background: ROLE_COLORS[id] }}
                  >{id}</div>
                  <span className="text-xs text-gray-400">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flora analysis — 2 cols */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={15} className="text-purple-400" />
              <span className="text-xs font-black text-purple-400 uppercase tracking-widest">Indicaciones de Flora</span>
            </div>

            {loadingAnalysis ? (
              <div className="flex items-center justify-center py-12">
                <Loader size={20} className="animate-spin text-gray-600" />
              </div>
            ) : analysisBullets.length > 0 ? (
              <div className="space-y-3">
                {analysisBullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-2.5 group">
                    {b.icon}
                    <p className="text-xs text-gray-300 leading-relaxed">{b.text}</p>
                  </div>
                ))}
                <div className="pt-3 border-t border-[#1e1e1e]">
                  <p className="text-[10px] text-gray-600">
                    Basado en {teamAnalysis!.match_count} partido{teamAnalysis!.match_count !== 1 ? 's' : ''} · {
                      new Date(teamAnalysis!.generated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <Brain size={28} className="text-gray-700 mx-auto" />
                <p className="text-sm text-gray-500">Sin análisis disponible.</p>
                <p className="text-xs text-gray-600">
                  {playedCount > 0
                    ? 'Hacé click en "Actualizar análisis" para que Flora analice los partidos jugados.'
                    : 'Cargá partidos jugados y videos para que Flora genere indicaciones tácticas.'}
                </p>
              </div>
            )}
          </div>

          {/* Quick tactical tips per overlay */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
              Tips · {overlayTabs.find(t => t.id === overlay)?.label}
            </p>
            <div className="space-y-2.5">
              {OVERLAY_TIPS[overlay].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ChevronRight size={12} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-400 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const OVERLAY_TIPS: Record<Overlay, string[]> = {
  recepcion: [
    'Formación en W: 5 receptoras con Líbero en centro-fondo.',
    'Armadora sale desde zona 1 hacia el centro de red al recibir.',
    'Punta 1 cubre zona 5 en diagonal cruzada.',
    'Central 1 cubre zona 3, central 2 cubre zona 6 de apoyo.',
  ],
  ataque: [
    'Quick set para la central en zona 3 cuando defensa rival está adelantada.',
    'Opuesta remata en zona 2 contra bloqueo simple del rival.',
    'Pipe (zona 6 por atrás) como recurso ofensivo sorpresa.',
    'Punta 4: ataque en diagonal contra bloqueo abierto.',
  ],
  saque: [
    'Apuntar zona 5 rival (punta receptora débil).',
    'Saque flotante corto a zona 6 desestabiliza formación W.',
    'Zona 1 rival: saque potente si la opuesta no recepciona bien.',
    'Variar potencia y dirección cada 3 saques para no ser predecible.',
  ],
  defensa: [
    'Líbero en zona 6, responsable de todas las bolas al fondo centro.',
    'Punta zaguera cubre zona 1 (diagonal del remate rival zona 4).',
    'Bloqueo doble en zona 4 cuando rival ataca con punta dominante.',
    'Cobertura de bloqueo: las dos puntas delanteras caen al segundo metro.',
  ],
};

export default Pizarra;
