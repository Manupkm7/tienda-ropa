import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

export interface ItemCarrito {
  productoId: number;
  varianteId?: number;
  nombre: string;
  slug: string;
  color?: string;
  codigoHex?: string;
  talla?: string;
  precio: number;
  cantidad: number;
  imagen: string;
  sku?: string;
  pesoKg?: number;
}

export const carrito = persistentAtom<ItemCarrito[]>('carrito_v1', [], {
  encode: JSON.stringify,
  decode: (v) => {
    try { return JSON.parse(v); } catch { return []; }
  },
});

export const carritoAbierto = atom(false);

export const totalCarrito = computed(carrito, items =>
  items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)
);

export const cantidadCarrito = computed(carrito, items =>
  items.reduce((sum, i) => sum + i.cantidad, 0)
);

export const pesoTotalCarrito = computed(carrito, items =>
  items.reduce((sum, i) => sum + (i.pesoKg ?? 0.3) * i.cantidad, 0)
);

export function agregarAlCarrito(item: ItemCarrito) {
  const items = carrito.get();
  const idx = items.findIndex(
    i => i.productoId === item.productoId && i.varianteId === item.varianteId
  );

  if (idx >= 0) {
    const nuevos = [...items];
    nuevos[idx] = { ...nuevos[idx], cantidad: nuevos[idx].cantidad + item.cantidad };
    carrito.set(nuevos);
  } else {
    carrito.set([...items, item]);
  }

  carritoAbierto.set(true);
}

export function actualizarCantidad(productoId: number, varianteId: number | undefined, cantidad: number) {
  if (cantidad <= 0) {
    eliminarDelCarrito(productoId, varianteId);
    return;
  }
  carrito.set(
    carrito.get().map(i =>
      i.productoId === productoId && i.varianteId === varianteId
        ? { ...i, cantidad }
        : i
    )
  );
}

export function eliminarDelCarrito(productoId: number, varianteId?: number) {
  carrito.set(
    carrito.get().filter(
      i => !(i.productoId === productoId && i.varianteId === varianteId)
    )
  );
}

export function vaciarCarrito() {
  carrito.set([]);
}
