import { useState } from 'react';
import { agregarAlCarrito } from '../../store/carrito';
import type { Variante } from '../../lib/db/schema';
import { ShoppingBag, Check } from 'lucide-react';

interface Props {
  productoId: number;
  slug: string;
  nombre: string;
  precio: number;
  imagen: string;
  pesoKg?: number;
  variantes: Variante[];
}

export default function SelectorVariantes({ productoId, slug, nombre, precio, imagen, pesoKg, variantes }: Props) {
  const coloresUnicos = [...new Map(
    variantes.filter(v => v.color).map(v => [v.color, { color: v.color!, hex: v.codigoHex ?? '#000' }])
  ).values()];

  const tallasUnicas = [...new Set(variantes.filter(v => v.talla).map(v => v.talla!))];
  const ordenTallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  tallasUnicas.sort((a, b) => ordenTallas.indexOf(a) - ordenTallas.indexOf(b));

  const [colorSeleccionado, setColorSeleccionado] = useState<string | undefined>(coloresUnicos[0]?.color);
  const [tallaSeleccionada, setTallaSeleccionada] = useState<string | undefined>();
  const [agregado, setAgregado] = useState(false);
  const [error, setError] = useState('');

  const varianteActual = variantes.find(v =>
    v.color === colorSeleccionado && v.talla === tallaSeleccionada
  );

  const stockActual = varianteActual?.stock ?? 0;

  const getTallaDisponible = (talla: string) => {
    return variantes.some(v => v.color === colorSeleccionado && v.talla === talla && v.stock > 0);
  };

  const precioFinal = precio + parseFloat(varianteActual?.precioExtra ?? '0');

  const formatPrecio = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

  const handleAgregar = () => {
    if (tallasUnicas.length > 0 && !tallaSeleccionada) {
      setError('Seleccioná un talle');
      return;
    }
    if (!varianteActual && (coloresUnicos.length > 0 || tallasUnicas.length > 0)) {
      setError('Combinación no disponible');
      return;
    }
    if (stockActual === 0 && varianteActual) {
      setError('Sin stock disponible');
      return;
    }

    setError('');
    agregarAlCarrito({
      productoId,
      varianteId: varianteActual?.id,
      nombre,
      slug,
      color: colorSeleccionado,
      codigoHex: coloresUnicos.find(c => c.color === colorSeleccionado)?.hex,
      talla: tallaSeleccionada,
      precio: precioFinal,
      cantidad: 1,
      imagen,
      sku: varianteActual?.sku ?? undefined,
      pesoKg: pesoKg ?? 0.3,
    });

    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Color */}
      {coloresUnicos.length > 0 && (
        <div>
          <p className="text-xs font-mono tracking-widest uppercase mb-3">
            Color — <span className="text-ash normal-case">{colorSeleccionado ?? 'Seleccionar'}</span>
          </p>
          <div className="flex gap-2 flex-wrap">
            {coloresUnicos.map(({ color, hex }) => (
              <button
                key={color}
                onClick={() => { setColorSeleccionado(color); setTallaSeleccionada(undefined); setError(''); }}
                title={color}
                className={`relative w-8 h-8 rounded-full transition-all duration-150
                  ${colorSeleccionado === color
                    ? 'ring-2 ring-ink ring-offset-2 ring-offset-bone scale-110'
                    : 'ring-1 ring-dust hover:ring-ink hover:ring-offset-1'
                  }`}
                style={{ backgroundColor: hex }}
              >
                {colorSeleccionado === color && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check
                      size={12}
                      strokeWidth={2.5}
                      style={{ color: isLight(hex) ? '#0D0D0D' : '#F5F2ED' }}
                    />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Talle */}
      {tallasUnicas.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-mono tracking-widest uppercase">
              Talle — <span className="text-ash normal-case">{tallaSeleccionada ?? 'Seleccionar'}</span>
            </p>
            <a href="/talle" className="text-xs text-ash hover:text-ink underline underline-offset-2 transition-colors">
              Guía de talles
            </a>
          </div>
          <div className="flex gap-2 flex-wrap">
            {tallasUnicas.map(talla => {
              const disponible = getTallaDisponible(talla);
              const seleccionada = tallaSeleccionada === talla;
              return (
                <button
                  key={talla}
                  onClick={() => { if (disponible) { setTallaSeleccionada(talla); setError(''); } }}
                  disabled={!disponible}
                  className={`relative w-12 h-12 text-xs border transition-all duration-150
                    ${seleccionada
                      ? 'bg-ink text-bone border-ink'
                      : disponible
                        ? 'border-dust text-ink hover:border-ink'
                        : 'border-dust/50 text-dust cursor-not-allowed'
                    }`}
                >
                  {talla}
                  {!disponible && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-full h-px bg-dust rotate-45 absolute" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock info */}
      {varianteActual && stockActual > 0 && stockActual <= 5 && (
        <p className="text-xs text-rust font-mono">
          ⚠ Últimas {stockActual} unidades
        </p>
      )}

      {/* Error */}
      {error && <p className="text-xs text-rust">{error}</p>}

      {/* Precio */}
      <div className="text-2xl font-mono tracking-tight">
        {formatPrecio(precioFinal)}
      </div>

      {/* Botón */}
      <button
        onClick={handleAgregar}
        disabled={agregado || (varianteActual?.stock === 0 && !!varianteActual)}
        className={`btn-primary w-full flex items-center justify-center gap-2 transition-all
          ${agregado ? 'bg-green-800 hover:bg-green-800' : ''}`}
      >
        {agregado ? (
          <>
            <Check size={16} />
            Agregado al carrito
          </>
        ) : (
          <>
            <ShoppingBag size={16} strokeWidth={1.5} />
            Agregar al carrito
          </>
        )}
      </button>
    </div>
  );
}

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
