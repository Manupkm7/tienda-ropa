/**
 * ImagenUploader — componente de subida de imágenes a Supabase Storage
 * Se usa en el panel admin al crear/editar productos
 *
 * Props:
 *  - value: string[]          lista actual de URLs públicas
 *  - onChange?: (urls) => void callback al cambiar (opcional si se usa hiddenInputId)
 *  - hiddenInputId?: string   id del input hidden a sincronizar con JSON de URLs (para formularios Astro)
 *  - productoSlug?: string     para organizar en subcarpeta del bucket
 *  - max?: number              máximo de imágenes (default: 6)
 */
import { useState, useRef, useCallback } from 'react';
import { Upload, X, GripVertical, Loader, AlertCircle, Image } from 'lucide-react';

interface Props {
  value: string[];
  onChange?: (urls: string[]) => void;
  hiddenInputId?: string;
  productoSlug?: string;
  max?: number;
}

interface EstadoSubida {
  id: string;
  nombre: string;
  progreso: number; // 0-100
  error?: string;
  url?: string;
}

export default function ImagenUploader({ value = [], onChange, hiddenInputId, productoSlug, max = 6 }: Props) {
  const [subiendo, setSubiendo] = useState<EstadoSubida[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const notifyChange = useCallback((urls: string[]) => {
    onChange?.(urls);
    if (hiddenInputId) {
      const el = document.getElementById(hiddenInputId);
      if (el && 'value' in el) (el as HTMLInputElement).value = JSON.stringify(urls);
    }
  }, [onChange, hiddenInputId]);

  const subirArchivos = useCallback(async (files: FileList | File[]) => {
    const lista = Array.from(files).filter(f => f.type.startsWith('image/'));
    const disponibles = max - value.length;
    const aSubir = lista.slice(0, disponibles);

    if (aSubir.length === 0) return;

    // Crear estados de subida
    const nuevosEstados: EstadoSubida[] = aSubir.map(f => ({
      id: Math.random().toString(36).slice(2),
      nombre: f.name,
      progreso: 0,
    }));

    setSubiendo(prev => [...prev, ...nuevosEstados]);

    // Subir en paralelo
    await Promise.all(aSubir.map(async (file, i) => {
      const id = nuevosEstados[i].id;
      const form = new FormData();
      form.append('file', file);
      form.append('carpeta', 'productos');
      if (productoSlug) form.append('productoSlug', productoSlug);

      try {
        // Simular progreso mientras sube
        const progressInterval = setInterval(() => {
          setSubiendo(prev => prev.map(s =>
            s.id === id ? { ...s, progreso: Math.min(s.progreso + 15, 85) } : s
          ));
        }, 200);

        const res = await fetch('/api/admin/imagenes/subir', {
          method: 'POST',
          body: form,
        });

        clearInterval(progressInterval);

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
          throw new Error(err.error ?? 'Error al subir');
        }

        const data = await res.json();

        setSubiendo(prev => prev.map(s =>
          s.id === id ? { ...s, progreso: 100, url: data.url } : s
        ));

        // Agregar URL al listado
        notifyChange([...value, data.url]);

        // Limpiar estado después de 1 segundo
        setTimeout(() => {
          setSubiendo(prev => prev.filter(s => s.id !== id));
        }, 1000);

      } catch (err) {
        setSubiendo(prev => prev.map(s =>
          s.id === id ? { ...s, error: err instanceof Error ? err.message : 'Error' } : s
        ));
      }
    }));
  }, [value, notifyChange, productoSlug, max]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files) subirArchivos(e.dataTransfer.files);
  }, [subirArchivos]);

  const eliminarImagen = async (url: string, index: number) => {
    // Extraer el path relativo del bucket desde la URL pública de Supabase
    // URL pública: https://[ref].supabase.co/storage/v1/object/public/productos/productos/slug/img.jpg
    const path = url.includes('/storage/v1/object/public/productos/')
      ? url.split('/storage/v1/object/public/productos/').at(-1)
      : url;

    notifyChange(value.filter((_, i) => i !== index));

    // Eliminar de Supabase Storage en background (best effort)
    if (path && path !== url) {
      fetch('/api/admin/imagenes/subir', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      }).catch(() => { });
    }
  };

  const moverImagen = (from: number, to: number) => {
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    notifyChange(next);
  };

  const hayLugar = value.length + subiendo.filter(s => !s.error && !s.url).length < max;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Grid de imágenes existentes */}
      {value.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
          {value.map((url, i) => (
            <div
              key={url}
              draggable
              onDragStart={e => e.dataTransfer.setData('text/plain', String(i))}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const from = parseInt(e.dataTransfer.getData('text/plain'));
                moverImagen(from, i);
              }}
              style={{
                position: 'relative', aspectRatio: '1',
                background: '#1a1a1a', overflow: 'hidden', cursor: 'grab',
              }}
            >
              <img
                src={url}
                alt={`Imagen ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Badge principal */}
              {i === 0 && (
                <span style={{
                  position: 'absolute', top: 4, left: 4,
                  background: '#0D0D0D', color: '#F5F2ED',
                  fontSize: 9, padding: '2px 5px', letterSpacing: '0.1em',
                }}>
                  PRINCIPAL
                </span>
              )}
              {/* Botón eliminar */}
              <button
                type="button"
                onClick={() => eliminarImagen(url, i)}
                style={{
                  position: 'absolute', top: 4, right: 4,
                  background: 'rgba(196,82,42,0.85)', color: '#fff',
                  border: 'none', width: 20, height: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 11,
                }}
              >
                <X size={10} />
              </button>
              {/* Handle drag */}
              <div style={{
                position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.5)',
              }}>
                <GripVertical size={12} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estados de subida en progreso */}
      {subiendo.map(s => (
        <div key={s.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', background: '#111', border: '1px solid #1a1a1a',
        }}>
          {s.error ? (
            <AlertCircle size={14} color="#C4522A" style={{ flexShrink: 0 }} />
          ) : s.progreso === 100 ? (
            <span style={{ fontSize: 12, color: '#00a050' }}>✓</span>
          ) : (
            <Loader size={14} color="#555" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.nombre}
            </div>
            {!s.error && s.progreso < 100 && (
              <div style={{ height: 2, background: '#222', marginTop: 4, borderRadius: 1 }}>
                <div style={{
                  height: '100%', background: '#F5F2ED',
                  width: `${s.progreso}%`, transition: 'width 0.2s',
                  borderRadius: 1,
                }} />
              </div>
            )}
            {s.error && <div style={{ fontSize: 10, color: '#C4522A', marginTop: 2 }}>{s.error}</div>}
          </div>
          {s.error && (
            <button
              type="button"
              onClick={() => setSubiendo(prev => prev.filter(x => x.id !== s.id))}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 0 }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}

      {/* Zona de drop / botón subir */}
      {hayLugar && (
        <div
          onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `1px dashed ${arrastrando ? '#F5F2ED' : '#333'}`,
            padding: '24px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            cursor: 'pointer', transition: 'border-color 0.15s',
            background: arrastrando ? 'rgba(245,242,237,0.03)' : 'transparent',
          }}
        >
          <Upload size={20} color={arrastrando ? '#F5F2ED' : '#555'} />
          <p style={{ fontSize: 11, color: '#555', textAlign: 'center', margin: 0 }}>
            {arrastrando
              ? 'Soltá para subir'
              : `Arrastrá imágenes o hacé click para seleccionar`
            }
          </p>
          <p style={{ fontSize: 10, color: '#333', margin: 0 }}>
            JPEG, PNG, WebP o AVIF · máx. 8 MB · {value.length}/{max} imágenes · Supabase Storage
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            style={{ display: 'none' }}
            onChange={e => e.target.files && subirArchivos(e.target.files)}
          />
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
