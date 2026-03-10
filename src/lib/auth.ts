import bcrypt from 'bcryptjs';
import { db } from './db';
import { adminUsers, adminSessions } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';
import type { APIContext } from 'astro';

const SESSION_COOKIE = 'admin_session';
const SESSION_DURATION_DAYS = 7;

export async function verificarPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function hacerHash(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function crearSesionAdmin(userId: number): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const [session] = await db.insert(adminSessions).values({
    userId,
    expiresAt,
  }).returning();

  return session.id;
}

export async function verificarSesionAdmin(sessionId: string) {
  const session = await db.query.adminSessions.findFirst({
    where: and(
      eq(adminSessions.id, sessionId),
      gt(adminSessions.expiresAt, new Date())
    ),
  });

  if (!session) return null;

  const user = await db.query.adminUsers.findFirst({
    where: and(eq(adminUsers.id, session.userId!), eq(adminUsers.activo, true)),
  });

  return user ?? null;
}

export async function getAdminFromCookies(cookies: APIContext['cookies']) {
  const sessionId = cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return verificarSesionAdmin(sessionId);
}

export function setSessionCookie(cookies: APIContext['cookies'], sessionId: string) {
  cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/admin',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(cookies: APIContext['cookies']) {
  cookies.delete(SESSION_COOKIE, { path: '/admin' });
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
