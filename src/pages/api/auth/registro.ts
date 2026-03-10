import type { APIRoute } from 'astro';
import { registrarCliente, crearSesionCliente, setUserSessionCookie } from '../../../lib/userAuth';
import { z } from 'zod';

const esquema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  telefono: z.string().optional(),
});

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const isJson = request.headers.get('content-type')?.includes('application/json');

  let datos: z.infer<typeof esquema>;
  try {
    const raw = isJson ? await request.json() : Object.fromEntries(await request.formData());
    datos = esquema.parse(raw);
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors[0].message : 'Datos inválidos';
    if (isJson) return jsonRes({ error: message }, 400);
    return redirect(`/cuenta/registro?error=${encodeURIComponent(message)}`);
  }

  const resultado = await registrarCliente(datos);

  if (!resultado.ok) {
    const msg = resultado.error === 'email_en_uso'
      ? 'Ya existe una cuenta con ese email. ¿Querés iniciar sesión?'
      : 'Error al crear la cuenta. Intentá de nuevo.';
    if (isJson) return jsonRes({ error: msg, code: resultado.error }, 400);
    return redirect(`/cuenta/registro?error=${encodeURIComponent(msg)}`);
  }

  const sessionId = await crearSesionCliente(resultado.clienteId, {
    userAgent: request.headers.get('user-agent') ?? undefined,
  });
  setUserSessionCookie(cookies, sessionId);

  if (isJson) return jsonRes({ ok: true });
  return redirect('/cuenta');
};

function jsonRes(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
