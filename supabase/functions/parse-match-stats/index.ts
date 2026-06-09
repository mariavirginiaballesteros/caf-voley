import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PlayerInput = {
  id: string;
  name: string;
  num: string;
  pos: string;
};

type ParsedStats = {
  player_id: string;
  saques_total: number;
  saques_punto: number;
  saques_error: number;
  recepciones_total: number;
  recepciones_perfectas: number;
  recepciones_error: number;
  pases_acertados: number;
  pases_errados: number;
  remates_total: number;
  remates_punto: number;
  remates_error: number;
  armados_arriba: number;
  armados_abajo: number;
  bloqueos_punto: number;
  bloqueos_error: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No autorizado');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('No autorizado');
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'dt'].includes(profile.role)) throw new Error('Solo admin o DT puede usar esta función');

    const { text, players } = await req.json() as { text: string; players: PlayerInput[] };
    if (!text?.trim()) throw new Error('Texto vacío');
    if (!players?.length) throw new Error('Lista de jugadoras vacía');

    const playerList = players.map(p =>
      `- ID: ${p.id} | #${p.num} ${p.name} (${p.pos})`
    ).join('\n');

    const prompt = `Sos Flora, asistente táctica de CAF Voley. El DT escribió un resumen libre del partido. Extraé las estadísticas individuales de cada jugadora mencionada.

## Jugadoras del plantel
${playerList}

## Resumen del partido escrito por el DT
${text}

## Instrucciones
- Analizá el texto y asigná estadísticas a cada jugadora identificada (por nombre, apodo o número de camiseta).
- Si una jugadora no se menciona, dejá todos sus valores en 0.
- Inferí totales cuando sea posible. Por ejemplo: si dice "3 saques, 2 punto y 1 error" → saques_total=3, saques_punto=2, saques_error=1.
- Si solo dice "3 saques punto" sin total → saques_punto=3, saques_total=3.
- "Armadas" = armados; "arriba" = armados_arriba; "abajo" o "bump" = armados_abajo.
- "Bloqueo" = bloqueos_punto si fue punto, bloqueos_error si fue rechazado o fallido.
- Respondé ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown, sin explicaciones.

## Formato de respuesta (array JSON)
[
  {
    "player_id": "<id exacto de la jugadora>",
    "saques_total": 0,
    "saques_punto": 0,
    "saques_error": 0,
    "recepciones_total": 0,
    "recepciones_perfectas": 0,
    "recepciones_error": 0,
    "pases_acertados": 0,
    "pases_errados": 0,
    "remates_total": 0,
    "remates_punto": 0,
    "remates_error": 0,
    "armados_arriba": 0,
    "armados_abajo": 0,
    "bloqueos_punto": 0,
    "bloqueos_error": 0
  }
]

Incluí SOLO las jugadoras que tienen al menos un stat mayor a 0. Usá los IDs exactos de la lista de jugadoras.`;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada');

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';

    // Parse JSON — strip any accidental markdown fences
    const cleaned = rawText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed: ParsedStats[] = JSON.parse(cleaned);

    return new Response(JSON.stringify({ stats: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
