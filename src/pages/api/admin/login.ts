import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { adminUsers } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { crearSesionAdmin, setSessionCookie, verificarPassword } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const email = form.get('email')?.toString().trim().toLowerCase();
  const password = form.get('password')?.toString();

  if (!email || !password) {
    return redirect('/admin/login?error=invalid');
  }

  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email),
  });

  if (!user) return redirect('/admin/login?error=invalid');
  if (!user.activo) return redirect('/admin/login?error=inactive');

  const ok = await verificarPassword(password, user.passwordHash);
  if (!ok) return redirect('/admin/login?error=invalid');

  const sessionId = await crearSesionAdmin(user.id);
  setSessionCookie(cookies, sessionId);

  await db.update(adminUsers)
    .set({ ultimoLogin: new Date() })
    .where(eq(adminUsers.id, user.id));

  return redirect('/admin');
};
