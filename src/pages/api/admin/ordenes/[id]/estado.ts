import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { ordenes } from '../../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminFromCookies } from '../../../../../lib/auth';

const ESTADOS_VALIDOS = ['pendiente', 'pagado', 'procesando', 'empaquetado', 'enviado', 'entregado', 'cancelado', 'reembolsado'];

export const POST: APIRoute = async ({ params, request, cookies, redirect }) => {
  const admin = await getAdminFromCookies(cookies);
  if (!admin) return new Response('Unauthorized', { status: 401 });

  const { id } = params;
  if (!id) return redirect('/admin/ordenes');

  const form = await request.formData();
  const nuevoEstado = form.get('estado')?.toString();

  if (!nuevoEstado || !ESTADOS_VALIDOS.includes(nuevoEstado)) {
    return redirect(`/admin/ordenes/${id}?error=estado_invalido`);
  }

  await db.update(ordenes)
    .set({ estado: nuevoEstado, actualizadoEn: new Date() })
    .where(eq(ordenes.id, id));

  return redirect(`/admin/ordenes/${id}?success=estado_actualizado`);
};
