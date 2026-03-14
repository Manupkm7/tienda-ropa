import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { ordenes } from '../../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminFromCookies } from '../../../../../lib/auth';

const ESTADOS_VALIDOS = ['pendiente', 'pagado', 'procesando', 'empaquetado', 'enviado', 'entregado', 'cancelado', 'reembolsado'];

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const admin = await getAdminFromCookies(cookies);
  if (!admin) return new Response('Unauthorized', { status: 401 });

  const { id } = params;
  if (!id) return new Response('Missing id', { status: 400 });

  const form = await request.formData();
  const nuevoEstado = form.get('estado')?.toString();

  if (!nuevoEstado || !ESTADOS_VALIDOS.includes(nuevoEstado)) {
    return new Response(JSON.stringify({ error: 'estado_invalido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.update(ordenes)
    .set({ estado: nuevoEstado, actualizadoEn: new Date() })
    .where(eq(ordenes.id, id));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
