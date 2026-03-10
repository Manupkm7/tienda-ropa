/**
 * Supabase Storage — subida de imágenes para productos
 *
 * Configuración en Supabase:
 *  1. Ir a Storage en el dashboard
 *  2. Crear un bucket llamado "productos" (o el nombre que prefieras)
 *  3. Marcar el bucket como PUBLIC para que las URLs sean accesibles
 *  4. En Storage → Policies, agregar política de INSERT para service_role
 *
 * Variables de entorno necesarias:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY  ← usa service_role, no anon, para bypass de RLS
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL        = import.meta.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = import.meta.env.SUPABASE_SERVICE_KEY ?? '';

// Cliente con service_role — solo se usa server-side (nunca exponer al browser)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Bucket donde se guardan las imágenes de productos
export const BUCKET = 'productos';

// Tipos MIME permitidos
const TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export interface SubidaOptions {
  carpeta?: 'productos' | 'categorias' | 'misc';
  productoSlug?: string;
}

export interface ResultadoSubida {
  url: string;
  path: string;
  size: number;
  tipo: string;
}

/**
 * Subir un archivo File a Supabase Storage.
 * Retorna la URL pública del archivo.
 */
export async function subirImagen(
  file: File,
  opts: SubidaOptions = {},
): Promise<ResultadoSubida> {
  if (!TIPOS_PERMITIDOS.has(file.type)) {
    throw new Error(`Tipo de archivo no permitido: ${file.type}. Usar JPEG, PNG, WebP o AVIF.`);
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`El archivo supera el límite de 8 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
  }

  const carpeta    = opts.carpeta ?? 'productos';
  const timestamp  = Date.now();
  const ext        = file.type.split('/')[1].replace('jpeg', 'jpg');
  const nombreBase = file.name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')       // quitar extensión
    .replace(/[^a-z0-9]/g, '-')   // solo alfanumérico + guiones
    .replace(/-+/g, '-')
    .slice(0, 40);

  // Path dentro del bucket: productos/remera-oversized/imagen-1234567890.jpg
  const path = [
    carpeta,
    opts.productoSlug ?? '_sin_slug',
    `${nombreBase}-${timestamp}.${ext}`,
  ].join('/');

  const arrayBuffer = await file.arrayBuffer();

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      cacheControl: '31536000', // 1 año
      upsert: false,
    });

  if (error) {
    throw new Error(`Error al subir imagen: ${error.message}`);
  }

  // Obtener URL pública
  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  return {
    url:  urlData.publicUrl,
    path: data.path,
    size: file.size,
    tipo: file.type,
  };
}

/**
 * Eliminar una imagen del bucket por su path o URL pública.
 */
export async function eliminarImagen(pathOrUrl: string): Promise<void> {
  // Extraer el path relativo si se pasó una URL completa
  const path = pathOrUrl.includes('/storage/v1/object/public/')
    ? pathOrUrl.split(`/storage/v1/object/public/${BUCKET}/`).at(-1) ?? pathOrUrl
    : pathOrUrl;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    // No lanzar error si el archivo no existe (409/404 son ok)
    if (!error.message.includes('Not Found') && !error.message.includes('not found')) {
      throw new Error(`Error al eliminar imagen: ${error.message}`);
    }
  }
}

/**
 * Listar imágenes de una carpeta (útil para limpiar imágenes huérfanas).
 */
export async function listarImagenes(carpeta: string) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .list(carpeta, { limit: 100, offset: 0 });

  if (error) throw new Error(error.message);
  return data ?? [];
}
