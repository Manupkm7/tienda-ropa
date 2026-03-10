import { useState, useCallback } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';

interface Categoria {
  slug: string;
  nombre: string;
}

interface Props {
  categorias: Categoria[];
  colores: { color: string; hex: string }[];
  tallas: string[];
  filtrosActivos: {
    categoria?: string;
    genero?: string;
    colores?: string[];
    tallas?: string[];
    precioMin?: number;
    precioMax?: number;
    busqueda?: string;
    orden?: string;
  };
  total: number;
}

export default function FiltrosSidebar({ categorias, colores, tallas, filtrosActivos, total }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const buildUrl = useCallback((overrides: Record<string, any>) => {
    const params = new URLSearchParams();
    const merged = { ...filtrosActivos, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return;
      if (Array.isArray(v)) params.set(k, v.join(','));
      else params.set(k, String(v));
    });
    params.delete('pagina');
    return `/productos?${params.toString()}`;
  }, [filtrosActivos]);

  const toggleArray = (key: 'colores' | 'tallas', value: string) => {
    const current = filtrosActivos[key] ?? [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    window.location.href = buildUrl({ [key]: next });
  };

  const hayFiltros = Object.entries(filtrosActivos).some(([k, v]) => {
    if (k === 'orden') return false;
    return v && (Array.isArray(v) ? v.length > 0 : true);
  });

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Resultados */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-ash tracking-wider uppercase">
          {total} producto{total !== 1 ? 's' : ''}
        </p>
        {hayFiltros && (
          <a href="/productos" className="text-xs text-ash hover:text-rust transition-colors underline underline-offset-2">
            Limpiar filtros
          </a>
        )}
      </div>

      {/* Ordenar */}
      <div>
        <p className="text-xs font-mono tracking-widest uppercase mb-3 text-ink">Ordenar</p>
        <div className="space-y-1.5">
          {[
            { value: 'nuevo', label: 'Más reciente' },
            { value: 'precio_asc', label: 'Precio: menor a mayor' },
            { value: 'precio_desc', label: 'Precio: mayor a menor' },
            { value: 'destacado', label: 'Destacados' },
          ].map(({ value, label }) => (
            <a
              key={value}
              href={buildUrl({ orden: value })}
              className={`block text-sm transition-colors ${(filtrosActivos.orden ?? 'nuevo') === value
                  ? 'text-ink font-medium'
                  : 'text-ash hover:text-ink'
                }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-dust" />

      {/* Categorías */}
      <div>
        <p className="text-xs font-mono tracking-widest uppercase mb-3 text-ink">Categoría</p>
        <div className="space-y-1.5">
          <a
            href={buildUrl({ categoria: undefined })}
            className={`block text-sm transition-colors ${!filtrosActivos.categoria ? 'text-ink font-medium' : 'text-ash hover:text-ink'
              }`}
          >
            Todas
          </a>
          {categorias.map(cat => (
            <a
              key={cat.slug}
              href={buildUrl({ categoria: cat.slug })}
              className={`block text-sm transition-colors ${filtrosActivos.categoria === cat.slug ? 'text-ink font-medium' : 'text-ash hover:text-ink'
                }`}
            >
              {cat.nombre}
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-dust" />

      {/* Género */}
      <div>
        <p className="text-xs font-mono tracking-widest uppercase mb-3 text-ink">Para</p>
        <div className="space-y-1.5">
          {[
            { value: undefined, label: 'Todo' },
            { value: 'mujer', label: 'Mujer' },
            { value: 'hombre', label: 'Hombre' },
            { value: 'unisex', label: 'Unisex' },
          ].map(({ value, label }) => (
            <a
              key={label}
              href={buildUrl({ genero: value })}
              className={`block text-sm transition-colors ${filtrosActivos.genero === value ? 'text-ink font-medium' : 'text-ash hover:text-ink'
                }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-dust" />

      {/* Colores */}
      {colores.length > 0 && (
        <div>
          <p className="text-xs font-mono tracking-widest uppercase mb-3 text-ink">Color</p>
          <div className="flex flex-wrap gap-2">
            {colores.map(({ color, hex }) => {
              const activo = (filtrosActivos.colores ?? []).includes(color);
              return (
                <button
                  key={color}
                  onClick={() => toggleArray('colores', color)}
                  title={color}
                  className={`flex items-center gap-1.5 text-xs transition-colors px-2 py-1
                    border ${activo ? 'border-ink text-ink' : 'border-dust text-ash hover:border-ink hover:text-ink'}`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-dust/50 flex-shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-dust" />

      {/* Talles */}
      {tallas.length > 0 && (
        <div>
          <p className="text-xs font-mono tracking-widest uppercase mb-3 text-ink">Talle</p>
          <div className="flex flex-wrap gap-2">
            {tallas.map(talla => {
              const activa = (filtrosActivos.tallas ?? []).includes(talla);
              return (
                <button
                  key={talla}
                  onClick={() => toggleArray('tallas', talla)}
                  className={`w-10 h-10 text-xs border transition-colors ${activa
                      ? 'bg-ink text-bone border-ink'
                      : 'border-dust text-ash hover:border-ink hover:text-ink'
                    }`}
                >
                  {talla}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-52 flex-shrink-0">
        <FiltersContent />
      </aside>

      {/* Mobile: botón + drawer */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase
                     border border-dust px-4 py-2.5 hover:border-ink transition-colors"
        >
          <SlidersHorizontal size={14} />
          Filtros
          {hayFiltros && <span className="w-1.5 h-1.5 bg-rust rounded-full" />}
        </button>

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 bg-ink/30 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed left-0 top-0 h-full w-80 bg-bone z-50 overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <p className="text-xs font-mono tracking-widest uppercase">Filtros</p>
                <button onClick={() => setMobileOpen(false)}>
                  <X size={18} className="text-ash hover:text-ink transition-colors" />
                </button>
              </div>
              <FiltersContent />
            </div>
          </>
        )}
      </div>
    </>
  );
}
