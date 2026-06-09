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
      throw new Error('Solo admin o DT puede generar análisis individuales');
    }

    const { player_id } = await req.json();
    if (!player_id) throw new Error('player_id requerido');

    // Fetch player info
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .select('*')
      .eq('id', player_id)
      .single();
    if (playerErr || !player) throw new Error('Jugadora no encontrada');

    // Fetch all stats for this player across all matches
    const { data: statsRows, error: statsErr } = await supabase
      .from('player_match_stats')
      .select(`
        *,
        matches26 ( rival, date, res, sets, fase, cond )
      `)
      .eq('player_id', player_id)
      .order('created_at', { ascending: true });

    if (statsErr) throw new Error('Error al obtener estadísticas');
    const stats = statsRows || [];

    if (stats.length === 0) {
      throw new Error('No hay estadísticas cargadas para esta jugadora todavía');
    }

    // Build stats summary per match
    const matchStatsText = stats.map((s: any) => {
      const m = s.matches26;
      const matchLabel = m
        ? `${m.date} – vs ${m.rival} (${m.cond}) → ${m.res === 'win' ? 'Victoria' : m.res === 'loss' ? 'Derrota' : 'Pendiente'} ${m.sets || ''}`
        : 'Partido desconocido';

      const lines = [
        `  Partido: ${matchLabel}`,
        `  Saques: ${s.saques_total} total, ${s.saques_punto} punto, ${s.saques_error} error`,
        `  Recepciones: ${s.recepciones_total} total, ${s.recepciones_perfectas} perfectas, ${s.recepciones_error} error`,
        `  Pases: ${s.pases_acertados} acertados, ${s.pases_errados} errados`,
        `  Remates: ${s.remates_total} total, ${s.remates_punto} punto, ${s.remates_error} error`,
        `  Armados: ${s.armados_arriba} arriba, ${s.armados_abajo} abajo`,
        `  Bloqueos: ${s.bloqueos_punto} punto, ${s.bloqueos_error} error`,
      ];
      return lines.join('\n');
    }).join('\n\n');

    // Build aggregated totals
    const totals = stats.reduce((acc: any, s: any) => {
      acc.saques_total += s.saques_total || 0;
      acc.saques_punto += s.saques_punto || 0;
      acc.saques_error += s.saques_error || 0;
      acc.recepciones_total += s.recepciones_total || 0;
      acc.recepciones_perfectas += s.recepciones_perfectas || 0;
      acc.recepciones_error += s.recepciones_error || 0;
      acc.pases_acertados += s.pases_acertados || 0;
      acc.pases_errados += s.pases_errados || 0;
      acc.remates_total += s.remates_total || 0;
      acc.remates_punto += s.remates_punto || 0;
      acc.remates_error += s.remates_error || 0;
      acc.armados_arriba += s.armados_arriba || 0;
      acc.armados_abajo += s.armados_abajo || 0;
      acc.bloqueos_punto += s.bloqueos_punto || 0;
      acc.bloqueos_error += s.bloqueos_error || 0;
      return acc;
    }, {
      saques_total: 0, saques_punto: 0, saques_error: 0,
      recepciones_total: 0, recepciones_perfectas: 0, recepciones_error: 0,
      pases_acertados: 0, pases_errados: 0,
      remates_total: 0, remates_punto: 0, remates_error: 0,
      armados_arriba: 0, armados_abajo: 0,
      bloqueos_punto: 0, bloqueos_error: 0,
    });

    const eficienciaSaque = totals.saques_total > 0
      ? `${Math.round((totals.saques_punto / totals.saques_total) * 100)}% punto, ${Math.round((totals.saques_error / totals.saques_total) * 100)}% error`
      : 'sin datos';
    const eficienciaRecepcion = totals.recepciones_total > 0
      ? `${Math.round((totals.recepciones_perfectas / totals.recepciones_total) * 100)}% perfectas, ${Math.round((totals.recepciones_error / totals.recepciones_total) * 100)}% error`
      : 'sin datos';
    const eficienciaPase = (totals.pases_acertados + totals.pases_errados) > 0
      ? `${Math.round((totals.pases_acertados / (totals.pases_acertados + totals.pases_errados)) * 100)}% acertados`
      : 'sin datos';
    const eficienciaRemate = totals.remates_total > 0
      ? `${Math.round((totals.remates_punto / totals.remates_total) * 100)}% punto, ${Math.round((totals.remates_error / totals.remates_total) * 100)}% error`
      : 'sin datos';

    const prompt = `Sos Flora, asistente táctica de CAF Voley femenino categoría B Liga Todo Voley Argentina. Analizá en detalle el rendimiento individual de la siguiente jugadora y dales indicaciones de mejora concretas al DT.

## Jugadora
- Nombre: ${player.name}
- Número: #${player.num}
- Posición: ${player.pos}
${player.notes ? `- Perfil DT: ${player.notes}` : ''}
${player.biography ? `- Historia: ${player.biography}` : ''}

## Estadísticas por partido (${stats.length} partido${stats.length !== 1 ? 's' : ''})
${matchStatsText}

## Totales acumulados
- Saques: ${totals.saques_total} totales | ${totals.saques_punto} punto | ${totals.saques_error} error | Eficiencia: ${eficienciaSaque}
- Recepciones: ${totals.recepciones_total} totales | ${totals.recepciones_perfectas} perfectas | ${totals.recepciones_error} error | Eficiencia: ${eficienciaRecepcion}
- Pases: ${totals.pases_acertados} acertados | ${totals.pases_errados} errados | Eficiencia: ${eficienciaPase}
- Remates: ${totals.remates_total} totales | ${totals.remates_punto} punto | ${totals.remates_error} error | Eficiencia: ${eficienciaRemate}
- Armados: ${totals.armados_arriba} arriba | ${totals.armados_abajo} abajo (total ${totals.armados_arriba + totals.armados_abajo})
- Bloqueos: ${totals.bloqueos_punto} punto | ${totals.bloqueos_error} error

Generá un análisis individual que incluya:
1. **Resumen del rendimiento** – síntesis general de la jugadora (máximo 2 párrafos)
2. **Fortalezas detectadas** – qué está haciendo bien con datos concretos (3 puntos)
3. **Áreas críticas a mejorar** – en qué necesita trabajar más urgente (3 puntos con ejercicios o indicaciones específicas)
4. **Tendencia por partido** – si mejoró, empeoró o mantuvo el nivel entre partidos
5. **Recomendación puntual del DT** – una sola acción concreta para la próxima semana de entrenamiento

Sé específico y usá los números. Hablá en términos de vóley femenino categoría B. Tono profesional y directo. Estructura con títulos en negrita. Máximo 600 palabras.`;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada');

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Upsert into player_analysis
    const { data: existing } = await supabase
      .from('player_analysis')
      .select('id')
      .eq('player_id', player_id)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from('player_analysis').update({
        content: analysisText,
        match_count: stats.length,
        generated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('player_analysis').insert({
        player_id,
        content: analysisText,
        match_count: stats.length,
      });
    }

    return new Response(JSON.stringify({ analysis: analysisText, match_count: stats.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
