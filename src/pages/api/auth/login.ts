import type { APIRoute } from 'astro';
import { loginCliente, setUserSessionCookie } from '../../../lib/userAuth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const isJson = request.headers.get('content-type')?.includes('application/json');

  let email: string, password: string, next: string;
  if (isJson) {
    const body = await request.json().catch(() => ({}));
    email = body.email?.trim().toLowerCase();
    password = body.password;
    next = body.next ?? '/cuenta';
  } else {
    const form = await request.formData();
    email = form.get('email')?.toString().trim().toLowerCase() ?? '';
    password = form.get('password')?.toString() ?? '';
    next = form.get('next')?.toString() ?? '/cuenta';
  }

  if (!email || !password) {
    if (isJson) return jsonRes({ error: 'Email y contraseña requeridos' }, 400);
    return redirect('/cuenta/login?error=campos_requeridos');
  }

  const resultado = await loginCliente(email, password, {
    userAgent: request.headers.get('user-agent') ?? undefined,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined,
  });

  if (!resultado.ok) {
    const msgs: Record<string, string> = {
      credenciales_invalidas: 'Email o contraseña incorrectos',
      sin_cuenta: 'No existe cuenta con ese email. ¿Querés registrarte?',
      error_interno: 'Error al iniciar sesión',
    };
    const msg = msgs[resultado.error] ?? 'Error al iniciar sesión';
    if (isJson) return jsonRes({ error: msg, code: resultado.error }, 401);
    return redirect(`/cuenta/login?error=${encodeURIComponent(msg)}`);
  }

  setUserSessionCookie(cookies, resultado.sessionId);

  if (isJson) return jsonRes({ ok: true });
  return redirect(next.startsWith('/') ? next : '/cuenta');
};

export const GET: APIRoute = ({ redirect }) => redirect('/cuenta/login');

function jsonRes(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
