import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { clientes } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { sendEmail } from '../../../lib/email';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const email = form.get('email')?.toString().trim().toLowerCase() ?? '';

  if (!email) {
    return redirect('/cuenta/recuperar?error=' + encodeURIComponent('El email es obligatorio'));
  }

  const ahora = new Date();
  const expira = new Date(ahora.getTime() + 60 * 60 * 1000); // 1 hora

  try {
    const cliente = await db.query.clientes.findFirst({
      where: eq(clientes.email, email),
    });

    if (cliente?.passwordHash) {
      const token = randomUUID();

      await db
        .update(clientes)
        .set({
          tokenResetPassword: token,
          tokenResetExpira: expira,
          actualizadoEn: new Date(),
        })
        .where(eq(clientes.id, cliente.id));

      const siteUrl = import.meta.env.SITE_URL ?? 'http://localhost:4321';
      const resetUrl = `${siteUrl}/cuenta/restablecer?token=${token}`;

      await sendEmail({
        to: email,
        subject: 'Recuperar contraseña - Tienda',
        text:
          'Hola,\n\n' +
          'Recibimos una solicitud para restablecer la contraseña de tu cuenta.\n\n' +
          `Para continuar, hacé clic en el siguiente enlace (válido por 1 hora):\n${resetUrl}\n\n` +
          'Si no solicitaste este cambio, podés ignorar este mensaje.\n\n' +
          '– Tienda',
      });

      console.log('[Auth] Enlace de reset enviado a', email, 'URL:', resetUrl);
    }
  } catch (err) {
    console.error('[Auth] Error al generar reset password:', err);
    // Respuesta genérica para no filtrar información
  }

  return redirect('/cuenta/recuperar?success=1');
};

export const GET: APIRoute = ({ redirect }) => redirect('/cuenta/recuperar');

