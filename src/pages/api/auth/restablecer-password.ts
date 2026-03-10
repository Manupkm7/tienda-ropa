import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { clientes } from '../../../lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { hashPassword } from '../../../lib/userAuth';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const token = form.get('token')?.toString() ?? '';
  const nueva = form.get('nueva')?.toString() ?? '';
  const confirmar = form.get('confirmar')?.toString() ?? '';

  if (!token) {
    return redirect(
      '/cuenta/recuperar?error=' +
        encodeURIComponent('El enlace para restablecer la contraseña no es válido o ya fue usado.'),
    );
  }

  if (!nueva || !confirmar) {
    return redirect(
      `/cuenta/restablecer?token=${encodeURIComponent(token)}&error=` +
        encodeURIComponent('Todos los campos son requeridos'),
    );
  }

  if (nueva.length < 8) {
    return redirect(
      `/cuenta/restablecer?token=${encodeURIComponent(token)}&error=` +
        encodeURIComponent('La contraseña debe tener al menos 8 caracteres'),
    );
  }

  if (nueva !== confirmar) {
    return redirect(
      `/cuenta/restablecer?token=${encodeURIComponent(token)}&error=` +
        encodeURIComponent('Las contraseñas no coinciden'),
    );
  }

  const ahora = new Date();

  const cliente = await db.query.clientes.findFirst({
    where: and(eq(clientes.tokenResetPassword, token), gt(clientes.tokenResetExpira, ahora)),
  });

  if (!cliente) {
    return redirect(
      '/cuenta/recuperar?error=' +
        encodeURIComponent('El enlace para restablecer la contraseña no es válido o ya fue usado.'),
    );
  }

  const nuevoHash = await hashPassword(nueva);

  await db
    .update(clientes)
    .set({
      passwordHash: nuevoHash,
      tokenResetPassword: null,
      tokenResetExpira: null,
      actualizadoEn: new Date(),
    })
    .where(eq(clientes.id, cliente.id));

  return redirect('/cuenta/login?msg=reset_ok');
};

export const GET: APIRoute = ({ redirect }) => redirect('/cuenta/recuperar');

