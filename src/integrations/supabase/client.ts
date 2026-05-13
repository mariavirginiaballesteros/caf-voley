import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bvrotpmkazxhyiyohnle.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2cm90cG1rYXp4aHlpeW9obmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODgyMDEsImV4cCI6MjA5Mjk2NDIwMX0.mzevjc__9yQnX3r8QG-TTVhbIM5SgMTByUkhwWIDugA";

// Wrap fetch with 8s timeout. On any failure returns a 503 so Supabase
// returns { data: null, error } instead of hanging or throwing forever.
const fetchWithTimeout = (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer))
    .catch(err => new Response(
      JSON.stringify({
        message: err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Network error'),
        code: err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
        details: null,
        hint: null,
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    ));
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { fetch: fetchWithTimeout },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
