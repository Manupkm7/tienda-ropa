import type { APIRoute } from 'astro';
import { db } from '../../../../lib/db';
import { productos, variantes } from '../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminFromCookies } from '../../../../lib/auth';

async function procesarProducto(form: FormData, productoId?: number) {
  const nombre = form.get('nombre')?.toString() ?? '';
  const slug = form.get('slug')?.toString() ?? '';
  const precio = form.get('precio')?.toString() ?? '0';
  const precioOriginal = form.get('precioOriginal')?.toString() || null;
  const categoriaId = form.get('categoriaId')?.toString();
  const descripcion = form.get('descripcion')?.toString() || null;
  const descripcionCorta = form.get('descripcionCorta')?.toString() || null;
  const material = form.get('material')?.toString() || null;
  const genero = form.get('genero')?.toString() || null;
  const peso = form.get('peso')?.toString() || null;
  const activo = form.get('activo') === 'true';
  const destacado = form.get('destacado') === 'true';

  // Imágenes — leer del campo JSON serializado por el uploader
  let imagenesRaw: string[] = [];
  const imagenesJson = form.get('imagenesJson')?.toString();
  if (imagenesJson) {
    try { imagenesRaw = JSON.parse(imagenesJson).filter(Boolean); } catch {}
  }
  // Fallback a inputs múltiples (compatibilidad)
  if (imagenesRaw.length === 0) {
    imagenesRaw = form.getAll('imagenes').map(v => v.toString().trim()).filter(Boolean);
  }

  const datosProducto = {
    nombre, slug, descripcion, descripcionCorta, material,
    genero: genero || null,
    precio,
    precioOriginal: precioOriginal || null,
    categoriaId: categoriaId ? parseInt(categoriaId) : null,
    imagenes: imagenesRaw,
    activo, destacado,
    peso: peso || null,
    actualizadoEn: new Date(),
  };

  let prodId: number;
  if (productoId) {
    await db.update(productos).set(datosProducto).where(eq(productos.id, productoId));
    prodId = productoId;
  } else {
    const [nuevo] = await db.insert(productos).values(datosProducto).returning();
    prodId = nuevo.id;
  }

  // Procesar variantes
  const count = parseInt(form.get('variantesCount')?.toString() ?? '0');

  for (let i = 0; i < count; i++) {
    const color = form.get(`v_color_${i}`)?.toString().trim() || null;
    const codigoHex = form.get(`v_hex_${i}`)?.toString().trim() || null;
    const talla = form.get(`v_talla_${i}`)?.toString().trim() || null;
    const stock = parseInt(form.get(`v_stock_${i}`)?.toString() ?? '0');
    const sku = form.get(`v_sku_${i}`)?.toString().trim() || null;
    const precioExtra = form.get(`v_extra_${i}`)?.toString() ?? '0';
    const varId = form.get(`v_id_${i}`)?.toString().trim();

    if (!color && !talla) continue; // saltar vacíos

    const datosVariante = { color, codigoHex, talla, stock, sku, precioExtra, productoId: prodId };

    if (varId && !isNaN(parseInt(varId))) {
      await db.update(variantes).set(datosVariante).where(eq(variantes.id, parseInt(varId)));
    } else {
      await db.insert(variantes).values(datosVariante).onConflictDoNothing();
    }
  }

  return prodId;
}

// Crear nuevo producto
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const admin = await getAdminFromCookies(cookies);
  if (!admin) return new Response('Unauthorized', { status: 401 });

  try {
    const form = await request.formData();
    const { params } = request as any;
    const idParam = new URL(request.url).pathname.split('/').at(-2);

    if (idParam === 'crear') {
      const prodId = await procesarProducto(form);
      return redirect(`/admin/productos/${prodId}?success=1`);
    } else {
      const productoId = parseInt(idParam!);
      await procesarProducto(form, productoId);
      return redirect(`/admin/productos/${productoId}?success=1`);
    }
  } catch (err) {
    console.error('[Admin Productos]', err);
    return redirect('/admin/productos?error=1');
  }
};
