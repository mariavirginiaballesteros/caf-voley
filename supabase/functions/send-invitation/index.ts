import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, role, invitedBy } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'email y role son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client para generar el link de invitación
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verificar que el caller es admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No autorizado');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('No autorizado');
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') throw new Error('Solo admins pueden invitar');

    // Generar link de invitación de Supabase Auth
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { role } },
    });

    if (linkError) throw new Error(`Error generando link: ${linkError.message}`);

    const inviteUrl = linkData.properties?.action_link;

    // Enviar email via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CAF Voley <invitaciones@jengibreco.com>',
        to: [email],
        subject: 'Te invitaron a CAF Voley',
        html: buildEmailHtml({ email, role, invitedBy, inviteUrl }),
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      throw new Error(`Resend error: ${err}`);
    }

    const resendData = await resendRes.json();
    return new Response(JSON.stringify({ success: true, emailId: resendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error desconocido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildEmailHtml({ email, role, invitedBy, inviteUrl }: {
  email: string;
  role: string;
  invitedBy: string;
  inviteUrl: string;
}) {
  const roleLabel: Record<string, string> = { admin: 'Administrador', dt: 'Cuerpo técnico', player: 'Jugador/a' };
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;border:1px solid #222;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:#1a1a2e;padding:32px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">🏐 CAF Voley</div>
          <div style="color:#888;margin-top:6px;font-size:14px;">Sistema de gestión del equipo</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 32px;">
          <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">Te invitaron al sistema</h2>
          <p style="color:#aaa;line-height:1.6;margin:0 0 24px;">
            <strong style="color:#fff;">${invitedBy}</strong> te invitó a unirte a CAF Voley como
            <strong style="color:#6366f1;">${roleLabel[role] || role}</strong>.
          </p>
          <p style="color:#aaa;line-height:1.6;margin:0 0 32px;">
            Hacé clic en el botón para crear tu cuenta y acceder al sistema.
          </p>

          <!-- CTA -->
          <div style="text-align:center;margin-bottom:32px;">
            <a href="${inviteUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
              Aceptar invitación
            </a>
          </div>

          <p style="color:#555;font-size:12px;margin:0;">
            Si no esperabas esta invitación, podés ignorar este email. El link expira en 24 horas.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid #222;padding:20px 32px;text-align:center;">
          <p style="color:#444;font-size:12px;margin:0;">CAF Voley · Sistema interno de gestión</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
