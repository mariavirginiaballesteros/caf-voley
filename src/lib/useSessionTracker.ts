import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

export function useSessionTracker(userId: string | undefined | null) {
  const sessionIdRef = useRef<string | null>(null);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = async () => {
    if (!sessionIdRef.current) return;
    const mins = +((Date.now() - startRef.current) / 60000).toFixed(2);
    await supabase
      .from('session_logs')
      .update({ ended_at: new Date().toISOString(), duration_minutes: mins })
      .eq('id', sessionIdRef.current);
  };

  useEffect(() => {
    if (!userId) return;

    startRef.current = Date.now();

    supabase
      .from('session_logs')
      .insert({ user_id: userId })
      .select('id')
      .single()
      .then(({ data }) => { if (data?.id) sessionIdRef.current = data.id; });

    timerRef.current = setInterval(flush, 120_000);

    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [userId]);
}
