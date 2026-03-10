/**
 * Módulo de envíos — Andreani + OCA
 * 
 * Documentación:
 *  - Andreani API: https://developers.andreani.com/
 *  - OCA e-Pak API: https://www.oca.com.ar/empresas/epak-api
 */

export interface DimensionesBulto {
  pesoKg: number;
  altoCm: number;
  anchoCm: number;
  largoCm: number;
}

export interface DireccionEnvio {
  calle: string;
  numero: string;
  piso?: string;
  depto?: string;
  codigoPostal: string;
  localidad: string;
  provincia: string;
}

export interface OpcionEnvio {
  id: string;
  proveedor: 'andreani' | 'oca';
  servicio: string;
  descripcion: string;
  precio: number;
  diasEstimados: number;
  logo: string;
}

// ─── Andreani ─────────────────────────────────────────────────────────────────

async function getAndreaniToken(): Promise<string | null> {
  const user = import.meta.env.ANDREANI_USER;
  const pass = import.meta.env.ANDREANI_PASS;
  if (!user || !pass) return null;

  try {
    const res = await fetch('https://apis.andreani.com/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: user, password: pass }),
    });
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

async function cotizarAndreani(
  destino: DireccionEnvio,
  bulto: DimensionesBulto,
  cpOrigen: string = '1414' // Buenos Aires
): Promise<OpcionEnvio[]> {
  const token = await getAndreaniToken();
  if (!token) {
    // Estimación offline si no hay credenciales
    return estimacionOfflineAndreani(destino, bulto);
  }

  try {
    const clienteNum = import.meta.env.ANDREANI_CLIENT_NUMBER;
    const res = await fetch(
      `https://apis.andreani.com/v2/tarifas?` +
      `cpDestino=${destino.codigoPostal}&` +
      `cpOrigen=${cpOrigen}&` +
      `bultos[0][peso]=${bulto.pesoKg}&` +
      `bultos[0][alto]=${bulto.altoCm}&` +
      `bultos[0][ancho]=${bulto.anchoCm}&` +
      `bultos[0][largo]=${bulto.largoCm}&` +
      `contrato=${clienteNum}`,
      { headers: { 'x-authorization-token': token } }
    );

    if (!res.ok) return estimacionOfflineAndreani(destino, bulto);

    const data = await res.json();
    return (data.tarifas ?? []).map((t: any) => ({
      id: `andreani-${t.contrato}`,
      proveedor: 'andreani' as const,
      servicio: t.servicio,
      descripcion: t.descripcion ?? 'Envío Andreani',
      precio: Math.ceil(t.tarifaConIva),
      diasEstimados: t.diasHabiles ?? 5,
      logo: '/images/andreani-logo.svg',
    }));
  } catch {
    return estimacionOfflineAndreani(destino, bulto);
  }
}

function estimacionOfflineAndreani(destino: DireccionEnvio, bulto: DimensionesBulto): OpcionEnvio[] {
  // Estimación sin API: precio base + peso
  const base = destino.provincia.toLowerCase().includes('buenos aires') ? 2500 : 4000;
  const porPeso = bulto.pesoKg * 800;
  return [
    {
      id: 'andreani-estandar',
      proveedor: 'andreani',
      servicio: 'Estándar',
      descripcion: 'Andreani Estándar (estimado)',
      precio: Math.ceil(base + porPeso),
      diasEstimados: 5,
      logo: '/images/andreani-logo.svg',
    },
    {
      id: 'andreani-express',
      proveedor: 'andreani',
      servicio: 'Express',
      descripcion: 'Andreani Express (estimado)',
      precio: Math.ceil((base + porPeso) * 1.5),
      diasEstimados: 2,
      logo: '/images/andreani-logo.svg',
    },
  ];
}

// ─── OCA ──────────────────────────────────────────────────────────────────────

async function cotizarOCA(
  destino: DireccionEnvio,
  bulto: DimensionesBulto,
  cpOrigen: string = '1414'
): Promise<OpcionEnvio[]> {
  const cuit = import.meta.env.OCA_CUIT;
  const user = import.meta.env.OCA_USER;
  const pass = import.meta.env.OCA_PASS;

  if (!cuit || !user || !pass) {
    return estimacionOfflineOCA(destino, bulto);
  }

  try {
    // OCA usa SOAP / XML — simplificado aquí
    const body = `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <Tarifar_Envio_Corporativo xmlns="http://200.105.107.172/OcaWebService/">
            <PesoTotal>${bulto.pesoKg}</PesoTotal>
            <VolumenTotal>${(bulto.altoCm * bulto.anchoCm * bulto.largoCm) / 1000000}</VolumenTotal>
            <CodigoPostalOrigen>${cpOrigen}</CodigoPostalOrigen>
            <CodigoPostalDestino>${destino.codigoPostal}</CodigoPostalDestino>
            <CantidadPaquetes>1</CantidadPaquetes>
            <Cuit>${cuit}</Cuit>
          </Tarifar_Envio_Corporativo>
        </soap:Body>
      </soap:Envelope>`;

    const res = await fetch('http://200.105.107.172/OcaWebService/OcaWebService.asmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        SOAPAction: 'http://200.105.107.172/OcaWebService/Tarifar_Envio_Corporativo',
      },
      body,
    });

    if (!res.ok) return estimacionOfflineOCA(destino, bulto);

    // Parsear XML response (simplificado)
    const text = await res.text();
    const precioMatch = text.match(/<Precio>(\d+\.?\d*)<\/Precio>/);
    const diasMatch = text.match(/<Plazo>(\d+)<\/Plazo>/);

    if (precioMatch) {
      return [{
        id: 'oca-epak',
        proveedor: 'oca',
        servicio: 'OCA e-Pak',
        descripcion: 'OCA e-Pak a domicilio',
        precio: Math.ceil(parseFloat(precioMatch[1])),
        diasEstimados: diasMatch ? parseInt(diasMatch[1]) : 5,
        logo: '/images/oca-logo.svg',
      }];
    }

    return estimacionOfflineOCA(destino, bulto);
  } catch {
    return estimacionOfflineOCA(destino, bulto);
  }
}

function estimacionOfflineOCA(destino: DireccionEnvio, bulto: DimensionesBulto): OpcionEnvio[] {
  const base = destino.provincia.toLowerCase().includes('buenos aires') ? 2200 : 3800;
  const porPeso = bulto.pesoKg * 700;
  return [{
    id: 'oca-epak',
    proveedor: 'oca',
    servicio: 'OCA e-Pak',
    descripcion: 'OCA e-Pak a domicilio (estimado)',
    precio: Math.ceil(base + porPeso),
    diasEstimados: 5,
    logo: '/images/oca-logo.svg',
  }];
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function cotizarEnvios(
  destino: DireccionEnvio,
  bulto: DimensionesBulto,
): Promise<OpcionEnvio[]> {
  const [andreani, oca] = await Promise.allSettled([
    cotizarAndreani(destino, bulto),
    cotizarOCA(destino, bulto),
  ]);

  const opciones: OpcionEnvio[] = [];
  if (andreani.status === 'fulfilled') opciones.push(...andreani.value);
  if (oca.status === 'fulfilled') opciones.push(...oca.value);

  // Retiro en local siempre disponible
  opciones.push({
    id: 'retiro-local',
    proveedor: 'andreani',
    servicio: 'Retiro en local',
    descripcion: 'Retirá en nuestro local — Av. Santa Fe 1234, CABA',
    precio: 0,
    diasEstimados: 0,
    logo: '/images/store-logo.svg',
  });

  return opciones.sort((a, b) => a.precio - b.precio);
}

export function calcularBultoPedido(items: Array<{
  peso?: string | null;
  alto?: string | null;
  ancho?: string | null;
  largo?: string | null;
  cantidad: number;
}>): DimensionesBulto {
  let pesoTotal = 0;
  let volumenTotal = 0;

  for (const item of items) {
    const peso = parseFloat(item.peso ?? '0.3');
    const alto = parseFloat(item.alto ?? '5');
    const ancho = parseFloat(item.ancho ?? '30');
    const largo = parseFloat(item.largo ?? '40');

    pesoTotal += peso * item.cantidad;
    volumenTotal += (alto * ancho * largo) * item.cantidad;
  }

  // Peso volumétrico: volumen / 4000 (estándar courier)
  const pesoVolumetrico = volumenTotal / 4000;
  const pesoCobrable = Math.max(pesoTotal, pesoVolumetrico);

  return {
    pesoKg: Math.max(pesoCobrable, 0.1),
    altoCm: 30,
    anchoCm: 30,
    largoCm: Math.ceil(volumenTotal / (30 * 30)),
  };
}
