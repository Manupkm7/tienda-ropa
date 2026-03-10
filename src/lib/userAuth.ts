/**
 * Auth para usuarios clientes (no admins)
 * Sistema separado del admin — cookies distintas, tablas distintas
 */
import bcrypt from 'bcryptjs';
import { db } from './db';
import { clientes, clienteSessions } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';
import type { APIContext } from 'astro';
import type { ClientePublico } from './db/schema';

export const USER_SESSION_COOKIE = 'user_session';
const SESSION_DURATION_DAYS = 30;

// ─── Password ─────────────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── Registro ─────────────────────────────────────────────────────────────────

export interface DatosRegistro {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
}

export type ResultadoRegistro =
  | { ok: true; clienteId: number }
  | { ok: false; error: 'email_en_uso' | 'error_interno' };

export async function registrarCliente(datos: DatosRegistro): Promise<ResultadoRegistro> {
  try {
    const existente = await db.query.clientes.findFirst({
      where: eq(clientes.email, datos.email.toLowerCase().trim()),
    });

    if (existente?.passwordHash) {
      return { ok: false, error: 'email_en_uso' };
    }

    const passwordHash = await hashPassword(datos.password);

    if (existente) {
      // El email ya existe (compró como invitado) — asociar cuenta
      await db.update(clientes)
        .set({
          passwordHash,
          nombre: datos.nombre,
          apellido: datos.apellido,
          telefono: datos.telefono ?? existente.telefono,
          emailVerificado: true, // simplificado — en prod enviar email
          actualizadoEn: new Date(),
        })
        .where(eq(clientes.id, existente.id));
      return { ok: true, clienteId: existente.id };
    }

    const [nuevo] = await db.insert(clientes).values({
      email: datos.email.toLowerCase().trim(),
      passwordHash,
      nombre: datos.nombre,
      apellido: datos.apellido,
      telefono: datos.telefono,
      emailVerificado: true,
    }).returning();

    return { ok: true, clienteId: nuevo.id };

  } catch (err) {
    console.error('[Auth] registrarCliente:', err);
    return { ok: false, error: 'error_interno' };
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export type ResultadoLogin =
  | { ok: true; clienteId: number; sessionId: string }
  | { ok: false; error: 'credenciales_invalidas' | 'sin_cuenta' | 'error_interno' };

export async function loginCliente(
  email: string,
  password: string,
  meta?: { userAgent?: string; ip?: string },
): Promise<ResultadoLogin> {
  try {
    const cliente = await db.query.clientes.findFirst({
      where: eq(clientes.email, email.toLowerCase().trim()),
    });

    if (!cliente) return { ok: false, error: 'credenciales_invalidas' };
    if (!cliente.passwordHash) return { ok: false, error: 'sin_cuenta' };

    const ok = await verifyPassword(password, cliente.passwordHash);
    if (!ok) return { ok: false, error: 'credenciales_invalidas' };

    const sessionId = await crearSesionCliente(cliente.id, meta);
    return { ok: true, clienteId: cliente.id, sessionId };

  } catch (err) {
    console.error('[Auth] loginCliente:', err);
    return { ok: false, error: 'error_interno' };
  }
}

// ─── Sesiones ─────────────────────────────────────────────────────────────────

export async function crearSesionCliente(
  clienteId: number,
  meta?: { userAgent?: string; ip?: string },
): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const [session] = await db.insert(clienteSessions).values({
    clienteId,
    expiresAt,
    userAgent: meta?.userAgent,
    ip: meta?.ip,
  }).returning();

  return session.id;
}

export async function verificarSesionCliente(sessionId: string): Promise<ClientePublico | null> {
  const session = await db.query.clienteSessions.findFirst({
    where: and(
      eq(clienteSessions.id, sessionId),
      gt(clienteSessions.expiresAt, new Date()),
    ),
  });

  if (!session) return null;

  const cliente = await db.query.clientes.findFirst({
    where: eq(clientes.id, session.clienteId),
  });

  if (!cliente) return null;

  // No exponer datos sensibles
  const { passwordHash, tokenVerificacion, tokenResetPassword, tokenResetExpira, ...publico } = cliente;
  return publico;
}

export async function getClienteFromCookies(
  cookies: APIContext['cookies'],
): Promise<ClientePublico | null> {
  const sessionId = cookies.get(USER_SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return verificarSesionCliente(sessionId);
}

export function setUserSessionCookie(cookies: APIContext['cookies'], sessionId: string) {
  cookies.set(USER_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });
}

export function clearUserSessionCookie(cookies: APIContext['cookies']) {
  cookies.delete(USER_SESSION_COOKIE, { path: '/' });
}

export async function cerrarSesionCliente(sessionId: string): Promise<void> {
  await db.delete(clienteSessions).where(eq(clienteSessions.id, sessionId));
}
