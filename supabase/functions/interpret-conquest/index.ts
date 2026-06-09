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

    const { item_text, item_detail } = await req.json();
    if (!item_text) throw new Error('item_text requerido');

    const prompt = `Sos Flora, asistente táctica del CAF Funes (vóley femenino categoría B, Liga Todo Voley Argentina 2026).

El equipo acaba de marcar como "conquistada" una debilidad que venían trabajando. Escribí una nota motivacional corta (máximo 2 oraciones) que celebre este logro y lo ancle tácticamente.

Debilidad superada: "${item_text}"
Detalle: "${item_detail || 'Sin detalle adicional'}"

La nota debe:
- Reconocer el trabajo detrás del logro (sin ser genérica)
- Mencionar el impacto táctico concreto de haber superado esto
- Tono directo, cálido, profesional — como una DT que conoce al equipo
- En español, sin asteriscos ni markdown

Solo la nota, sin introducción ni firma.`;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada en los secrets de Supabase');

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const note = response.content[0].type === 'text' ? response.content[0].text : '';

    return new Response(JSON.stringify({ note }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
