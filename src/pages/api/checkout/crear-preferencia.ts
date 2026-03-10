import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { ordenes, clientes } from '../../../lib/db/schema';
import { crearPreferencia } from '../../../lib/mercadopago';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const esquemaCheckout = z.object({
  items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
    picture_url: z.string().optional(),
  })),
  cliente: z.object({
    nombre: z.string().min(1),
    apellido: z.string().min(1),
    email: z.string().email(),
    telefono: z.string().optional(),
    direccionEnvio: z.object({
      calle: z.string(),
      numero: z.string(),
      piso: z.string().optional(),
      depto: z.string().optional(),
      ciudad: z.string(),
      provincia: z.string(),
      codigoPostal: z.string(),
      pais: z.string().default('Argentina'),
    }),
  }),
  envio: z.object({
    id: z.string(),
    proveedor: z.string().optional(),
    servicio: z.string().optional(),
    descripcion: z.string(),
    precio: z.number(),
    diasEstimados: z.number().optional(),
  }).optional(),
  notas: z.string().optional(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const data = esquemaCheckout.parse(body);

    const { items, cliente: clienteData, envio, notas } = data;

    // Subtotal + costo envío
    const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const costoEnvio = envio?.precio ?? 0;
    const total = subtotal + costoEnvio;

    // Upsert cliente
    const clienteExistente = await db.query.clientes.findFirst({
      where: eq(clientes.email, clienteData.email),
    });

    let clienteId: number;
    if (clienteExistente) {
      await db.update(clientes)
        .set({
          nombre: clienteData.nombre,
          apellido: clienteData.apellido,
          telefono: clienteData.telefono,
          direccionEnvio: clienteData.direccionEnvio,
          actualizadoEn: new Date(),
        })
        .where(eq(clientes.id, clienteExistente.id));
      clienteId = clienteExistente.id;
    } else {
      const [nuevo] = await db.insert(clientes).values({
        email: clienteData.email,
        nombre: clienteData.nombre,
        apellido: clienteData.apellido,
        telefono: clienteData.telefono,
        direccionEnvio: clienteData.direccionEnvio,
      }).returning();
      clienteId = nuevo.id;
    }

    // Crear orden
    const [orden] = await db.insert(ordenes).values({
      clienteId,
      estado: 'pendiente',
      subtotal: subtotal.toFixed(2),
      costoEnvio: costoEnvio.toFixed(2),
      total: total.toFixed(2),
      items: items.map(i => ({
        productoId: parseInt(i.id),
        nombre: i.title,
        precio: i.unit_price,
        cantidad: i.quantity,
        imagen: i.picture_url ?? '',
      })),
      datosEnvio: envio ? {
        metodo: (envio.proveedor as 'andreani' | 'oca' | 'retiro') ?? 'andreani',
        servicio: envio.servicio,
        estimadoDias: envio.diasEstimados,
        nombreDestinatario: `${clienteData.nombre} ${clienteData.apellido}`,
        direccion: {
          calle: clienteData.direccionEnvio.calle,
          numero: clienteData.direccionEnvio.numero,
          piso: clienteData.direccionEnvio.piso,
          depto: clienteData.direccionEnvio.depto,
          ciudad: clienteData.direccionEnvio.ciudad,
          provincia: clienteData.direccionEnvio.provincia,
          codigoPostal: clienteData.direccionEnvio.codigoPostal,
        },
      } : undefined,
      notasCliente: notas,
    }).returning();

    // Crear preferencia en MercadoPago
    const pref = await crearPreferencia(
      items,
      {
        nombre: clienteData.nombre,
        apellido: clienteData.apellido,
        email: clienteData.email,
        telefono: clienteData.telefono,
        direccion: {
          calle: clienteData.direccionEnvio.calle,
          numero: clienteData.direccionEnvio.numero,
          codigoPostal: clienteData.direccionEnvio.codigoPostal,
        },
      },
      orden.id,
      costoEnvio,
    );

    // Guardar preference ID
    await db.update(ordenes)
      .set({ mercadoPagoPreferenceId: pref.id })
      .where(eq(ordenes.id, orden.id));

    return new Response(JSON.stringify({
      ordenId: orden.id,
      preferenceId: pref.id,
      initPoint: pref.init_point,
      sandboxInitPoint: pref.sandbox_init_point,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error en checkout:', err);
    const message = err instanceof z.ZodError
      ? 'Datos inválidos: ' + err.errors.map(e => e.message).join(', ')
      : 'Error interno del servidor';

    return new Response(JSON.stringify({ error: message }), {
      status: err instanceof z.ZodError ? 400 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
