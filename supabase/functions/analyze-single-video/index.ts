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
      throw new Error('Solo admin o DT puede analizar videos');
    }

    const { video_id, title, notes, rival } = await req.json();
    if (!video_id) throw new Error('video_id requerido');

    const prompt = `Sos Flora, la asistente táctica del CAF Funes, equipo de vóley femenino categoría B de Liga Todo Voley Argentina (temporada 2026).

Analizá el siguiente partido basándote en los datos disponibles:

Partido: ${title}
Rival: ${rival || 'Desconocido'}
Notas del partido: ${notes || 'Sin notas adicionales'}

Generá un análisis táctico completo del partido con las siguientes secciones:

1. RESUMEN DEL PARTIDO
Contexto general, lectura del juego observado.

2. RENDIMIENTO COLECTIVO CAF
Aspectos positivos del equipo y aspectos a corregir. Sé concreta y específica.

3. ANÁLISIS DEL RIVAL (${rival || 'el rival'})
Patrones de juego observados, puntos fuertes y débiles, cómo atacaron y defendieron.

4. FUNDAMENTOS CLAVE
Evaluación por fundamento: saque, recepción, armado, ataque, bloqueo, defensa.

5. APRENDIZAJES Y PRÓXIMOS PASOS
3 acciones concretas de mejora para el próximo entrenamiento basadas en este partido.

Respondé en español. Sé directa, técnica y orientada a la acción. Usá terminología de vóley femenino categoría B Argentina. Sin asteriscos ni markdown. Máximo 600 palabras.`;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada en los secrets de Supabase');

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';

    const { error: updateError } = await supabase
      .from('videos')
      .update({ ai_analysis: analysisText })
      .eq('id', video_id);

    if (updateError) throw new Error(`Error al guardar análisis: ${updateError.message}`);

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
