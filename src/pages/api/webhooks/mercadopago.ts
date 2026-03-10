import type { APIRoute } from 'astro';
import { mpPayment } from '../../../lib/mercadopago';
import { db } from '../../../lib/db';
import { ordenes, variantes } from '../../../lib/db/schema';
import { eq, sql } from 'drizzle-orm';

const ESTADO_MP: Record<string, string> = {
  approved:   'pagado',
  pending:    'pendiente',
  in_process: 'procesando',
  rejected:   'cancelado',
  refunded:   'reembolsado',
  cancelled:  'cancelado',
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    console.log('[MP Webhook]', body.type, body.data?.id);

    if (body.type !== 'payment') {
      return new Response('OK', { status: 200 });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return new Response('OK', { status: 200 });

    // Obtener detalle del pago desde MP
    const pago = await mpPayment.get({ id: paymentId });
    const ordenId = pago.external_reference;

    if (!ordenId) {
      console.warn('[MP Webhook] Sin external_reference en pago', paymentId);
      return new Response('OK', { status: 200 });
    }

    const nuevoEstado = ESTADO_MP[pago.status ?? ''] ?? 'pendiente';

    // Actualizar orden
    await db.update(ordenes)
      .set({
        estado: nuevoEstado,
        mercadoPagoId: String(paymentId),
        mercadoPagoStatus: pago.status,
        actualizadoEn: new Date(),
      })
      .where(eq(ordenes.id, ordenId));

    // Si se aprobó: descontar stock
    if (pago.status === 'approved') {
      const [orden] = await db.select().from(ordenes).where(eq(ordenes.id, ordenId));

      for (const item of orden?.items ?? []) {
        if (item.varianteId) {
          await db.update(variantes)
            .set({ stock: sql`GREATEST(0, stock - ${item.cantidad})` })
            .where(eq(variantes.id, item.varianteId));
        }
      }

      console.log(`[MP Webhook] Orden ${ordenId} pagada ✓`);
    }

    return new Response('OK', { status: 200 });

  } catch (err) {
    console.error('[MP Webhook] Error:', err);
    // Siempre retornar 200 para que MP no reintente
    return new Response('OK', { status: 200 });
  }
};
