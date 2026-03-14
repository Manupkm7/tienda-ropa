import type { APIRoute } from 'astro';
import { db } from '../../../../../lib/db';
import { ordenes } from '../../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminFromCookies } from '../../../../../lib/auth';

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const admin = await getAdminFromCookies(cookies);
  if (!admin) return new Response('Unauthorized', { status: 401 });

  const { id } = params;
  if (!id) return new Response('Missing id', { status: 400 });

  const form = await request.formData();
  const nota = form.get('nota')?.toString().trim();

  await db.update(ordenes)
    .set({ notasAdmin: nota || null, actualizadoEn: new Date() })
    .where(eq(ordenes.id, id));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
