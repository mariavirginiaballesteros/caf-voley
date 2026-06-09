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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !['admin', 'dt'].includes(profile.role)) {
      throw new Error('Solo admin o DT puede regenerar el análisis global');
    }

    const [matchesRes, itemsRes, videosRes] = await Promise.all([
      supabase.from('matches26').select('*').order('date', { ascending: false }),
      supabase.from('analysis_items').select('*').order('sort_order'),
      supabase
        .from('videos')
        .select('title, ai_analysis, date')
        .not('ai_analysis', 'is', null)
        .order('date', { ascending: false })
        .limit(5),
    ]);

    const matches = matchesRes.data || [];
    const items = itemsRes.data || [];
    const analyzedVideos = videosRes.data || [];

    const playedMatches = matches.filter((m: any) => m.res === 'win' || m.res === 'loss');

    const matchSummary = matches.map((m: any) => {
      const resLabel = m.res === 'win' ? 'Victoria' : m.res === 'loss' ? 'Derrota' : 'Pendiente';
      return `- ${m.date}: vs ${m.rival} (${m.cond}) → ${resLabel} ${m.sets ? m.sets : ''} [${m.fase || 'Liga'}]`;
    }).join('\n');

    const strengths = items
      .filter((i: any) => i.type === 'strength' && i.status !== 'conquered')
      .map((i: any) => `- ${i.text}${i.detail ? `: ${i.detail}` : ''}`)
      .join('\n');

    const weaknesses = items
      .filter((i: any) => i.type === 'weakness' && i.status !== 'conquered')
      .map((i: any) => `- ${i.text}${i.detail ? `: ${i.detail}` : ''}`)
      .join('\n');

    const conqueredItems = items
      .filter((i: any) => i.status === 'conquered')
      .map((i: any) => `- ${i.text}`)
      .join('\n');

    const videoSection = analyzedVideos.length > 0
      ? `## Análisis de partidos grabados\n${analyzedVideos.map((v: any) => `[${v.date}] ${v.title}:\n${v.ai_analysis}`).join('\n\n---\n\n')}`
      : '';

    const prompt = `Sos Flora, la asistente táctica de CAF Voley femenino categoría B de Liga Todo Voley Argentina. Generá un análisis global del equipo basándote en los siguientes datos de la temporada 2026.

## Fixture y resultados
${matchSummary || 'Sin partidos registrados aún.'}

## Fortalezas identificadas
${strengths || 'No hay fortalezas cargadas.'}

## Áreas a mejorar
${weaknesses || 'No hay puntos de mejora cargados.'}

## Mejoras ya conquistadas
${conqueredItems || 'Ninguna todavía.'}

${videoSection}

Generá un análisis global del equipo que incluya:
1. **Estado del equipo** – síntesis del momento actual (máximo 2 párrafos)
2. **Patrones de rendimiento** – qué se repite en los datos disponibles
3. **3 prioridades tácticas** para las próximas semanas
4. **Proyección** – perspectiva para el resto de la temporada

Sé específico, orientado a la acción, tono profesional pero directo. Hablá en términos de vóley femenino categoría B Argentina. Estructura con títulos claros en negrita. Máximo 500 palabras.`;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada en los secrets de Supabase');

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
    const lastMatchDate = playedMatches[0]?.date ?? null;

    const { data: existing } = await supabase
      .from('team_analysis')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from('team_analysis').update({
        content: analysisText,
        match_count: playedMatches.length,
        last_match_date: lastMatchDate,
        generated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('team_analysis').insert({
        content: analysisText,
        match_count: playedMatches.length,
        last_match_date: lastMatchDate,
      });
    }

    return new Response(JSON.stringify({ analysis: analysisText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
