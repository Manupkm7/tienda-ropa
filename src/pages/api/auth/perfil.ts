import type { APIRoute } from 'astro';
import { getClienteFromCookies } from '../../../lib/userAuth';
import { db } from '../../../lib/db';
import { clientes } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const esquema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  telefono: z.string().optional(),
  calle: z.string().optional(),
  numero: z.string().optional(),
  piso: z.string().optional(),
  depto: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  codigoPostal: z.string().optional(),
});

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const cliente = await getClienteFromCookies(cookies);
  if (!cliente) return redirect('/cuenta/login');

  const form = await request.formData();
  const datos = esquema.safeParse(Object.fromEntries(form));
  if (!datos.success) return redirect('/cuenta/perfil?error=datos_invalidos');

  const { nombre, apellido, telefono, calle, numero, piso, depto, ciudad, provincia, codigoPostal } = datos.data;

  await db.update(clientes).set({
    nombre,
    apellido,
    telefono: telefono || null,
    direccionEnvio: calle ? {
      calle, numero: numero ?? '',
      piso: piso || undefined,
      depto: depto || undefined,
      ciudad: ciudad ?? '',
      provincia: provincia ?? '',
      codigoPostal: codigoPostal ?? '',
      pais: 'Argentina',
    } : cliente.direccionEnvio,
    actualizadoEn: new Date(),
  }).where(eq(clientes.id, cliente.id));

  return redirect('/cuenta/perfil?success=guardado');
};
