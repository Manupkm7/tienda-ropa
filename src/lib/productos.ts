import { db } from './db';
import { productos, variantes, categorias } from './db/schema';
import { eq, and, or, gte, lte, ilike, inArray, sql, desc, asc } from 'drizzle-orm';
import type { ProductoConVariantes } from './db/schema';

export interface FiltrosProducto {
  categoria?: string;
  genero?: string;
  colores?: string[];
  tallas?: string[];
  precioMin?: number;
  precioMax?: number;
  busqueda?: string;
  soloDestacados?: boolean;
  soloConStock?: boolean;
  pagina?: number;
  porPagina?: number;
  orden?: 'precio_asc' | 'precio_desc' | 'nuevo' | 'destacado';
}

export interface ResultadoCatalogo {
  productos: ProductoConVariantes[];
  total: number;
  paginas: number;
  pagina: number;
}

export async function obtenerProductos(filtros: FiltrosProducto = {}): Promise<ResultadoCatalogo> {
  const {
    pagina = 1,
    porPagina = 12,
    orden = 'nuevo',
  } = filtros;

  const condiciones = [eq(productos.activo, true)];

  if (filtros.categoria) {
    const cat = await db.query.categorias.findFirst({
      where: eq(categorias.slug, filtros.categoria),
    });
    if (cat) condiciones.push(eq(productos.categoriaId, cat.id));
  }

  if (filtros.genero) condiciones.push(eq(productos.genero, filtros.genero));
  if (filtros.soloDestacados) condiciones.push(eq(productos.destacado, true));
  if (filtros.precioMin) condiciones.push(gte(sql`${productos.precio}::numeric`, filtros.precioMin));
  if (filtros.precioMax) condiciones.push(lte(sql`${productos.precio}::numeric`, filtros.precioMax));

  if (filtros.busqueda) {
    const term = `%${filtros.busqueda}%`;
    condiciones.push(
      or(
        ilike(productos.nombre, term),
        ilike(productos.descripcionCorta, term),
        ilike(productos.material, term),
      )!
    );
  }

  const orderBy = {
    precio_asc: asc(sql`${productos.precio}::numeric`),
    precio_desc: desc(sql`${productos.precio}::numeric`),
    nuevo: desc(productos.creadoEn),
    destacado: desc(productos.destacado),
  }[orden];

  const offset = (pagina - 1) * porPagina;

  // Total
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productos)
    .where(and(...condiciones));

  // Productos paginados
  const rows = await db.query.productos.findMany({
    where: and(...condiciones),
    with: {
      variantes: { where: eq(variantes.activa, true) },
      categoria: true,
    },
    orderBy: [orderBy],
    limit: porPagina,
    offset,
  });

  // Filtrar por color/talla (post-query ya que está en variantes)
  let resultado = rows as ProductoConVariantes[];

  if (filtros.colores?.length) {
    resultado = resultado.filter(p =>
      p.variantes.some(v => filtros.colores!.includes(v.color ?? ''))
    );
  }
  if (filtros.tallas?.length) {
    resultado = resultado.filter(p =>
      p.variantes.some(v => filtros.tallas!.includes(v.talla ?? '') && v.stock > 0)
    );
  }
  if (filtros.soloConStock) {
    resultado = resultado.filter(p =>
      p.variantes.some(v => v.stock > 0)
    );
  }

  return {
    productos: resultado,
    total: count,
    paginas: Math.ceil(count / porPagina),
    pagina,
  };
}

export async function obtenerProductoPorSlug(slug: string): Promise<ProductoConVariantes | null> {
  const prod = await db.query.productos.findFirst({
    where: and(eq(productos.slug, slug), eq(productos.activo, true)),
    with: {
      variantes: { where: eq(variantes.activa, true) },
      categoria: true,
    },
  });
  return prod as ProductoConVariantes | null;
}

export async function obtenerColoresDisponibles(): Promise<{ color: string; hex: string }[]> {
  const rows = await db
    .selectDistinct({ color: variantes.color, hex: variantes.codigoHex })
    .from(variantes)
    .where(and(eq(variantes.activa, true), sql`${variantes.color} IS NOT NULL`));

  return rows
    .filter(r => r.color)
    .map(r => ({ color: r.color!, hex: r.hex ?? '#000' }));
}

export async function obtenerTallasDisponibles(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ talla: variantes.talla })
    .from(variantes)
    .where(and(eq(variantes.activa, true), sql`${variantes.talla} IS NOT NULL`));

  const orden = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  return rows
    .map(r => r.talla!)
    .filter(Boolean)
    .sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
}
