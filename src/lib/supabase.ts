import { supabase } from '../integrations/supabase/client';

export { supabase };

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'dt' | 'player';
  avatar_url: string | null;
  email: string | null;
  updated_at: string;
};

export type Video = {
  id?: string;
  yt_id: string;
  title: string;
  season: string;
  date: string;
  tags: string[];
  notes: string;
};

export type Match = {
  id?: string;
  rival: string;
  cond: 'Local' | 'Visitante';
  date: string;
  fase: string;
  res: 'win' | 'loss' | 'pending';
  sets: string;
  notes: string;
};

export type Torneo = {
  id?: string;
  name: string;
  year: number;
  cat: string;
  status: 'active' | 'done' | 'future';
  notes: string;
};

export type Player = {
  id?: string;
  name: string;
  num: string;
  pos: string;
  notes: string;
  biography?: string | null;
  photo: string | null;
  journal: any[];
  ai_analysis?: string | null;
  analysis_shared?: boolean;
  email?: string | null;
};

export type DTContext = {
  id?: string;
  type: 'text' | 'audio' | 'video';
  title: string;
  content: string;
  notes?: string;
  author: string;
  tags: string[];
  duration?: string;
  date: string;
};

export type AnalysisItem = {
  id?: string;
  type: 'strength' | 'weakness';
  text: string;
  detail: string;
  tac_type?: string;
};