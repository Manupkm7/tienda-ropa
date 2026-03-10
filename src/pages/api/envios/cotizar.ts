import type { APIRoute } from 'astro';
import { cotizarEnvios, calcularBultoPedido } from '../../../lib/envios';
import { z } from 'zod';

const esquema = z.object({
  destino: z.object({
    codigoPostal: z.string().min(4),
    localidad: z.string(),
    provincia: z.string(),
    calle: z.string().default(''),
    numero: z.string().default(''),
  }),
  items: z.array(z.object({
    pesoKg: z.number().optional().default(0.3),
    cantidad: z.number().int().positive(),
    alto: z.string().optional(),
    ancho: z.string().optional(),
    largo: z.string().optional(),
  })),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const data = esquema.parse(body);

    const bulto = calcularBultoPedido(
      data.items.map(i => ({
        peso: String(i.pesoKg),
        alto: i.alto,
        ancho: i.ancho,
        largo: i.largo,
        cantidad: i.cantidad,
      }))
    );

    const opciones = await cotizarEnvios(data.destino, bulto);

    return new Response(JSON.stringify(opciones), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[Envíos API]', err);
    // Fallback con estimación
    const fallback = [
      { id: 'andreani-std', proveedor: 'andreani', servicio: 'Estándar', descripcion: 'Andreani Estándar', precio: 3500, diasEstimados: 5 },
      { id: 'oca-epak', proveedor: 'oca', servicio: 'e-Pak', descripcion: 'OCA e-Pak', precio: 3200, diasEstimados: 5 },
      { id: 'retiro-local', proveedor: 'andreani', servicio: 'Retiro', descripcion: 'Retiro en local — Av. Santa Fe 1234, CABA', precio: 0, diasEstimados: 0 },
    ];
    return new Response(JSON.stringify(fallback), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
