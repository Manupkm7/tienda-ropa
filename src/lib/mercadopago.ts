import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const accessToken = import.meta.env.MP_ACCESS_TOKEN;

if (!accessToken) {
  console.warn('⚠️  MP_ACCESS_TOKEN no definido — MercadoPago desactivado');
}

export const mpConfig = new MercadoPagoConfig({
  accessToken: accessToken ?? 'TEST-token',
  options: { timeout: 5000 },
});

export const mpPreference = new Preference(mpConfig);
export const mpPayment = new Payment(mpConfig);

export function esSandbox(): boolean {
  return (accessToken ?? '').startsWith('TEST-');
}

export interface ItemMP {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  picture_url?: string;
  description?: string;
  category_id?: string;
}

export interface DatosPagador {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  direccion?: {
    calle: string;
    numero: string;
    codigoPostal: string;
  };
}

export async function crearPreferencia(
  items: ItemMP[],
  pagador: DatosPagador,
  ordenId: string,
  costoEnvio: number = 0,
) {
  const siteUrl = import.meta.env.SITE_URL ?? 'http://localhost:4321';

  const itemsConEnvio = [...items];
  if (costoEnvio > 0) {
    itemsConEnvio.push({
      id: 'envio',
      title: 'Costo de envío',
      quantity: 1,
      unit_price: costoEnvio,
    });
  }

  const pref = await mpPreference.create({
    body: {
      items: itemsConEnvio.map(i => ({
        id: i.id,
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unit_price,
        currency_id: 'ARS',
        picture_url: i.picture_url,
        description: i.description,
        category_id: i.category_id ?? 'fashion',
      })),
      payer: {
        name: pagador.nombre,
        surname: pagador.apellido,
        email: pagador.email,
        phone: pagador.telefono ? { number: pagador.telefono } : undefined,
        address: pagador.direccion ? {
          street_name: pagador.direccion.calle,
          street_number: pagador.direccion.numero,
          zip_code: pagador.direccion.codigoPostal,
        } : undefined,
      },
      back_urls: {
        success: `${siteUrl}/orden/${ordenId}?status=success`,
        failure: `${siteUrl}/checkout?status=failed&orden=${ordenId}`,
        pending: `${siteUrl}/orden/${ordenId}?status=pending`,
      },
      notification_url: `${siteUrl}/api/webhooks/mercadopago`,
      external_reference: ordenId,
      statement_descriptor: 'TIENDA ONLINE',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  return pref;
}
