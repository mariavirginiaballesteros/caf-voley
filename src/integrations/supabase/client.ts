import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bvrotpmkazxhyiyohnle.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2cm90cG1rYXp4aHlpeW9obmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODgyMDEsImV4cCI6MjA5Mjk2NDIwMX0.mzevjc__9yQnX3r8QG-TTVhbIM5SgMTByUkhwWIDugA";

// Wrap fetch with 15s timeout. On timeout returns a 408 so Supabase
// returns { data: null, error } instead of hanging forever.
const fetchWithTimeout = (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  return fetch(url as string, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer))
    .catch(err => {
      if (err.name === 'AbortError') {
        return new Response(JSON.stringify({ message: 'Request timeout', code: 'TIMEOUT' }), {
          status: 408,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw err;
    });
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { fetch: fetchWithTimeout },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
