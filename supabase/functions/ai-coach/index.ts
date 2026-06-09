import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No autorizado');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('No autorizado');

    const { message, history = [] } = await req.json();
    if (!message) throw new Error('Mensaje requerido');

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada en los secrets de Supabase');

    // Fetch last 10 diary entries for the user
    const { data: diaryEntries } = await supabase
      .from('match_diary')
      .select('match_date, rival, result, sets, mood, technical_notes, emotional_notes, highlights, improvements')
      .eq('user_id', user.id)
      .order('match_date', { ascending: false })
      .limit(10);

    let diaryContext = '';
    if (diaryEntries && diaryEntries.length > 0) {
      const formatted = diaryEntries.map((e) => {
        const lines = [`Partido: vs ${e.rival} (${e.match_date})`];
        if (e.result) lines.push(`Resultado: ${e.result === 'win' ? 'Victoria' : e.result === 'loss' ? 'Derrota' : 'Empate'}${e.sets ? ` ${e.sets}` : ''}`);
        if (e.mood) lines.push(`Estado de ánimo: ${e.mood}`);
        if (e.highlights) lines.push(`Lo que salió bien: ${e.highlights}`);
        if (e.improvements) lines.push(`A mejorar: ${e.improvements}`);
        if (e.technical_notes) lines.push(`Notas técnicas: ${e.technical_notes}`);
        if (e.emotional_notes) lines.push(`Notas emocionales: ${e.emotional_notes}`);
        return lines.join('\n');
      }).join('\n\n---\n\n');
      diaryContext = `\n\nDIARIO DE PARTIDO DE LA JUGADORA/DT (últimas ${diaryEntries.length} entradas):\n${formatted}`;
    }

    const client = new Anthropic({ apiKey });

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map((h: { role: string; content: string }) => ({
        role: (h.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    const systemPrompt = `Sos Flora, la asistente táctica inteligente del CAF Funes, equipo de vóley femenino categoría B de Liga Todo Voley Argentina (temporada 2026).
Tu rol es dar análisis técnico-tácticos concretos, orientados al rendimiento individual y colectivo.
Respondé siempre en español. Sé directa, honesta y constructiva. Usá terminología de vóley femenino nivel categoría B Argentina.
Cuando analizás jugadoras individuales, sé específica por posición. No uses asteriscos ni markdown — texto plano con estructura clara.
Cuando la jugadora o el DT te pregunta sobre su rendimiento o el del equipo, usá las notas del diario como contexto principal para dar respuestas personalizadas.${diaryContext}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    return new Response(JSON.stringify({ response: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
