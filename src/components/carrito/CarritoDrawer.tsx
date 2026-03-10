import { useStore } from '@nanostores/react';
import { carrito, carritoAbierto, totalCarrito, actualizarCantidad, eliminarDelCarrito } from '../../store/carrito';
import { X, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

export default function CarritoDrawer() {
  const items = useStore(carrito);
  const abierto = useStore(carritoAbierto);
  const total = useStore(totalCarrito);

  // Bloquear scroll cuando está abierto
  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  const formatPrecio = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

  if (!abierto && items.length === 0) return null;

  return (
    <>
      {/* Overlay */}
      {abierto && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => carritoAbierto.set(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#000000] z-50 flex flex-col
                     shadow-2xl transition-transform duration-300 ease-in-out
                    ${abierto ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} strokeWidth={1.5} color='white' />
            <span className="text-xs tracking-[0.2em] uppercase select-none text-white">
              Carrito ({items.length})
            </span>
          </div>
          <button
            onClick={() => carritoAbierto.set(false)}
            className="text-ash hover:text-[#ff0000] transition-colors"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <ShoppingBag size={40} strokeWidth={1} className="text-dust" />
              <p className="text-sm text-ash">Tu carrito está vacío</p>
              <button
                onClick={() => carritoAbierto.set(false)}
                className="text-xs font-mono tracking-widest uppercase underline underline-offset-4 text-ash hover:text-ink transition-colors"
              >
                Ver catálogo
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.productoId}-${item.varianteId}`} className="flex gap-4">
                {/* Imagen */}
                <a href={`/productos/${item.slug}`} onClick={() => carritoAbierto.set(false)}>
                  <div className="w-20 h-24 bg-[#888888] flex-shrink-0 overflow-hidden">
                    <img
                      src={item.imagen || '/images/placeholder.jpg'}
                      alt={item.nombre}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                </a>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <a
                      href={`/productos/${item.slug}`}
                      onClick={() => carritoAbierto.set(false)}
                      className="text-sm leading-tight text-ash hover:text-[#ff0000] transition-colors select-none"
                    >
                      {item.nombre}
                    </a>
                    <div className="flex gap-2 mt-1 select-none">
                      {item.color && (
                        <span className="text-xs text-ash flex items-center gap-1">
                          {item.codigoHex && (
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-dust inline-block"
                              style={{ backgroundColor: item.codigoHex }}
                            />
                          )}
                          {item.color}
                        </span>
                      )}
                      {item.talla && (
                        <span className="text-xs text-ash uppercase">/ {item.talla}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Cantidad */}
                    <div className="flex items-center gap-2 border border-dust">
                      <button
                        onClick={() => actualizarCantidad(item.productoId, item.varianteId, item.cantidad - 1)}
                        className="w-7 h-7 flex items-center justify-center text-ash hover:text-[#ff0000] transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-mono w-6 text-center text-ash">{item.cantidad}</span>
                      <button
                        onClick={() => actualizarCantidad(item.productoId, item.varianteId, item.cantidad + 1)}
                        className="w-7 h-7 flex items-center justify-center text-ash hover:text-[#ff0000] transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Precio + eliminar */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono">
                        {formatPrecio(item.precio * item.cantidad)}
                      </span>
                      <button
                        onClick={() => eliminarDelCarrito(item.productoId, item.varianteId)}
                        className="text-dust hover:text-rust transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="mt-auto space-y-4 select-none px-3 pb-5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-ash tracking-wider uppercase select-none">Subtotal</span>
              <span className="text-sm font-mono text-white">{formatPrecio(total)}</span>
            </div>
            <p className="text-xs text-ash select-none">Envío calculado en el siguiente paso</p>
            <a
              href="/checkout"
              onClick={() => carritoAbierto.set(false)}
              className="w-full py-4 text-xs tracking-[0.2em] font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90 bg-[#ff0000] text-white"
            >
              Ir al checkout
              <ArrowRight size={14} />
            </a>
            <button
              onClick={() => carritoAbierto.set(false)}
              className="w-full py-4 text-xs tracking-[0.2em] border text-ash hover:text-[#ff0000] transition-colors select-none"
            >
              Seguir comprando
            </button>
          </div>
        )}
      </div>
    </>
  );
}
