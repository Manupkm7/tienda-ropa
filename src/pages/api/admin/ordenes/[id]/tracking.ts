import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { ordenes, type Orden } from '../../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminFromCookies } from '../../../../../lib/auth';

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const admin = await getAdminFromCookies(cookies);
  if (!admin) return new Response('Unauthorized', { status: 401 });

  const { id } = params;
  if (!id) return new Response('Missing id', { status: 400 });

  const form = await request.formData();
  const trackingId = form.get('trackingId')?.toString().trim();

  const orden = await db.query.ordenes.findFirst({ where: eq(ordenes.id, id) });
  if (!orden) return new Response('Orden no encontrada', { status: 404 });

  if (!orden.datosEnvio) {
    return new Response('La orden no tiene datos de envío', { status: 400 });
  }

  type DatosEnvio = NonNullable<Orden['datosEnvio']>;

  const datosEnvioActualizado: DatosEnvio = {
    ...orden.datosEnvio,
    trackingId: trackingId || undefined,
  };

  await db.update(ordenes)
    .set({ datosEnvio: datosEnvioActualizado, actualizadoEn: new Date() })
    .where(eq(ordenes.id, id));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
