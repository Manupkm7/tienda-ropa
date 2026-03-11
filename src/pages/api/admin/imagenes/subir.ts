/**
 * POST /api/admin/imagenes/subir
 * Recibe multipart/form-data, sube la imagen a Supabase Storage y retorna la URL pública.
 *
 * Body:
 *   file          File    — imagen a subir
 *   carpeta       string  — 'productos' | 'categorias' | 'misc' (default: 'productos')
 *   productoSlug  string  — organiza en subcarpeta dentro del bucket (opcional)
 *
 * DELETE /api/admin/imagenes/subir
 * Body JSON: { path: string }  — path relativo dentro del bucket
 */
import type { APIRoute } from 'astro';
import { subirImagen, eliminarImagen } from '../../../../lib/supabase';
import { getAdminFromCookies } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const admin = await getAdminFromCookies(cookies);
  if (!admin) return jsonError('No autorizado', 401);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError('Formato de request inválido', 400);
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return jsonError('No se recibió ningún archivo en el campo "file"', 400);
  }

  const carpeta = (formData.get('carpeta')?.toString() ?? 'productos') as 'productos' | 'categorias' | 'misc';
  const productoSlug = formData.get('productoSlug')?.toString();

  try {
    const resultado = await subirImagen(file, { carpeta, productoSlug });
    return new Response(JSON.stringify({
      url: resultado.url,
      path: resultado.path,
      size: resultado.size,
      tipo: resultado.tipo,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al subir la imagen';
    console.error('[Supabase Storage upload]', err);
    return jsonError(message, 500);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const admin = await getAdminFromCookies(cookies);
  if (!admin) return jsonError('No autorizado', 401);

  const body = await request.json().catch(() => ({}));
  const path = body.path ?? body.key;
  if (!path) return jsonError('Se requiere el campo "path"', 400);

  try {
    await eliminarImagen(path);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al eliminar';
    return jsonError(message, 500);
  }
};

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
