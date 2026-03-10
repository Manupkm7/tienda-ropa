import type { APIRoute } from 'astro';
import { clearUserSessionCookie, cerrarSesionCliente, USER_SESSION_COOKIE } from '../../../lib/userAuth';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const sessionId = cookies.get(USER_SESSION_COOKIE)?.value;
  if (sessionId) await cerrarSesionCliente(sessionId);
  clearUserSessionCookie(cookies);
  return redirect('/cuenta/login?msg=logout');
};

export const POST: APIRoute = async ({ cookies }) => {
  const sessionId = cookies.get(USER_SESSION_COOKIE)?.value;
  if (sessionId) await cerrarSesionCliente(sessionId);
  clearUserSessionCookie(cookies);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
