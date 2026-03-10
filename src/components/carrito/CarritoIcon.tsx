import { useStore } from '@nanostores/react';
import { cantidadCarrito, carritoAbierto } from '../../store/carrito';
import { ShoppingBag } from 'lucide-react';

export default function CarritoIcon() {
  const cantidad = useStore(cantidadCarrito);

  return (
    <button
      onClick={() => carritoAbierto.set(true)}
      className="relative text-ash hover:text-[#ff0000] transition-colors"
      aria-label={`Carrito (${cantidad} items)`}
    >
      <ShoppingBag size={18} strokeWidth={1.5} />
      {cantidad > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-[#ff0000] text-bone text-[9px] font-mono w-4 h-4 rounded-full flex items-center justify-center leading-none">
          {cantidad > 99 ? '99+' : cantidad}
        </span>
      )}
    </button>
  );
}
