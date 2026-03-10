import type { APIRoute } from 'astro';
import { getClienteFromCookies, verifyPassword, hashPassword, USER_SESSION_COOKIE } from '../../../lib/userAuth';
import { db } from '../../../lib/db';
import { clientes } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const cliente = await getClienteFromCookies(cookies);
  if (!cliente) return redirect('/cuenta/login');

  const form = await request.formData();
  const actual = form.get('actual')?.toString() ?? '';
  const nueva = form.get('nueva')?.toString() ?? '';
  const confirmar = form.get('confirmar')?.toString() ?? '';

  // Validaciones
  if (!actual || !nueva || !confirmar) {
    return redirect('/cuenta/cambiar-password?error=' + encodeURIComponent('Todos los campos son requeridos'));
  }
  if (nueva.length < 8) {
    return redirect('/cuenta/cambiar-password?error=' + encodeURIComponent('La contraseña debe tener al menos 8 caracteres'));
  }
  if (nueva !== confirmar) {
    return redirect('/cuenta/cambiar-password?error=' + encodeURIComponent('Las contraseñas no coinciden'));
  }

  // Verificar contraseña actual
  const clienteCompleto = await db.query.clientes.findFirst({
    where: eq(clientes.id, cliente.id),
  });

  if (!clienteCompleto?.passwordHash) {
    return redirect('/cuenta/cambiar-password?error=' + encodeURIComponent('No podés cambiar la contraseña de una cuenta de invitado'));
  }

  const esValida = await verifyPassword(actual, clienteCompleto.passwordHash);
  if (!esValida) {
    return redirect('/cuenta/cambiar-password?error=' + encodeURIComponent('La contraseña actual es incorrecta'));
  }

  // Actualizar
  const nuevoHash = await hashPassword(nueva);
  await db.update(clientes)
    .set({ passwordHash: nuevoHash, actualizadoEn: new Date() })
    .where(eq(clientes.id, cliente.id));

  return redirect('/cuenta/cambiar-password?success=1');
};
