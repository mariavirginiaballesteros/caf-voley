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
      throw new Error('Solo admin o DT puede generar scouting');
    }

    const { rival, video_ids, match_notes, match_result } = await req.json();
    if (!rival) throw new Error('El nombre del rival es requerido');

    const prompt = `Sos Flora, asistente táctica del CAF Funes (vóley femenino categoría B, Liga Todo Voley Argentina 2026).

Generá un informe de scouting táctico del rival: "${rival}"

INFORMACIÓN DISPONIBLE:
- Observaciones del partido: ${match_notes || 'Sin observaciones específicas'}
- Resultado: ${match_result || 'No especificado'}
- Videos analizados: ${video_ids?.length > 0 ? `${video_ids.length} video(s) referenciados` : 'Sin videos asociados'}

Basándote en la información disponible, generá un informe de scouting con jugadoras clave del rival.
Si hay observaciones específicas, úsalas. Si no hay información, generá un análisis genérico típico de equipos de categoría B argentina.

Respondé ÚNICAMENTE con un JSON válido (sin texto antes ni después, sin markdown) con el siguiente formato exacto:

{
  "players": [
    {
      "player_num": "N",
      "player_pos": "POSICIÓN",
      "strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
      "weaknesses": ["debilidad 1", "debilidad 2"],
      "notes": "nota táctica breve"
    }
  ]
}

Reglas:
- Generá entre 3 y 6 jugadoras clave
- Posiciones en español: Armadora, Opuesta, Punta derecha, Punta izquierda, Central, Libero
- Fortalezas y debilidades: frases cortas y concretas (máximo 10 palabras cada una)
- Numeración realista (1-17)
- Notas: 1 oración táctica orientada a cómo neutralizar o explotar esta jugadora
- JSON puro, sin comentarios, sin texto adicional`;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada en los secrets de Supabase');

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    let parsed: { players: Array<{
      player_num: string;
      player_pos: string;
      strengths: string[];
      weaknesses: string[];
      notes: string;
    }> };

    try {
      const jsonText = rawText.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error('La IA no devolvió JSON válido. Intentá de nuevo.');
    }

    if (!parsed.players || !Array.isArray(parsed.players)) {
      throw new Error('Formato de respuesta inválido');
    }

    await supabase.from('rival_scouting').delete().eq('rival', rival);

    const rows = parsed.players.map(p => ({
      rival,
      player_num: p.player_num,
      player_pos: p.player_pos,
      strengths: p.strengths,
      weaknesses: p.weaknesses,
      notes: p.notes,
      ai_generated: true,
    }));

    const { error: insertError } = await supabase.from('rival_scouting').insert(rows);
    if (insertError) throw new Error(`Error al guardar: ${insertError.message}`);

    return new Response(JSON.stringify({ players_saved: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
