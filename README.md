# Tienda de Indumentaria — Astro + PostgreSQL + MercadoPago

Tienda online minimalista para indumentaria con:
- Catálogo con filtros (categoría, género, color, talle, precio)
- Paginación server-side
- Carrito persistente (localStorage)
- Checkout con cotización de envíos (Andreani + OCA)
- Integración MercadoPago con webhooks
- Panel admin propio (sin dependencias externas)
- PostgreSQL con Drizzle ORM

---

## Setup rápido

### 1. Instalar

```bash
npm install
cp .env.example .env
```

### 2. Crear proyecto en Supabase

1. Crear proyecto en [supabase.com](https://supabase.com) (Free tier disponible)
2. Ir a **Settings → Database → Connection string → URI** y copiar la URL con puerto `5432`  
   (⚠ usar el puerto **5432**, no el 6543 — el 6543 es el pooler de Supavisor, no compatible con Drizzle)
3. Ir a **Settings → API** y copiar `SUPABASE_URL`, `anon key` y `service_role key`
4. Pegar todo en `.env`

### 3. Crear el bucket de Storage

En el dashboard de Supabase → **Storage**:

1. Clic en **New bucket** → nombre: `productos` → activar **Public bucket**
2. Ir a **Policies** del bucket y agregar una política para que el service_role pueda hacer INSERT:
   - Policy name: `Admin can upload`
   - Allowed operation: `INSERT`
   - Target roles: `service_role`

   O simplemente usar la política predefinida "Give users access to their own top level folder" y ajustar, o para desarrollo rápido usar política pública de INSERT (luego restringir en producción).

### 4. Migrar schema a Supabase

```bash
# Crear todas las tablas en Supabase
npm run db:push

# (Opcional) Datos de prueba
npx tsx src/lib/db/seed.ts
```

### 5. Correr en desarrollo

```bash
npm run dev
# → http://localhost:4321
# → Admin: http://localhost:4321/admin  (admin@tienda.com / Admin123!)
# → Cuenta: http://localhost:4321/cuenta/registro
```

---

## Estructura de rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Home con destacados |
| `/productos` | Catálogo con filtros y paginación |
| `/productos/[slug]` | Detalle de producto |
| `/checkout` | Datos cliente + cotización envío + pago |
| `/orden/[id]` | Confirmación de orden |
| **`/cuenta`** | **Historial de compras del usuario** |
| **`/cuenta/login`** | **Iniciar sesión** |
| **`/cuenta/registro`** | **Crear cuenta** |
| **`/cuenta/perfil`** | **Editar perfil y dirección** |
| **`/cuenta/cambiar-password`** | **Cambiar contraseña** |
| `/admin` | Dashboard admin |
| `/admin/login` | Login admin |
| `/admin/productos` | Gestión de productos |
| `/admin/productos/nuevo` | Crear producto |
| `/admin/productos/[id]` | Editar producto + subir imágenes a Supabase Storage |
| `/admin/ordenes` | Listado de órdenes |
| `/admin/ordenes/[id]` | Detalle de orden + cambiar estado + tracking |
| `/api/auth/registro` | POST — Registrar usuario |
| `/api/auth/login` | POST — Login usuario |
| `/api/auth/logout` | GET/POST — Cerrar sesión usuario |
| `/api/auth/perfil` | POST — Actualizar perfil |
| `/api/auth/cambiar-password` | POST — Cambiar contraseña |
| `/api/admin/imagenes/subir` | POST/DELETE — Subir/eliminar imagen en Supabase Storage |
| `/api/checkout/crear-preferencia` | POST — Crear pago en MercadoPago |
| `/api/webhooks/mercadopago` | POST — Webhook notificaciones MP |
| `/api/envios/cotizar` | POST — Cotizar Andreani + OCA |

---

## Flujo de compra

```
1. Usuario navega catálogo → filtra → selecciona variante
2. Agrega al carrito (Nanostore → localStorage)
3. Va a /checkout
   → Completa datos personales
   → Ingresa dirección → calcula envío (Andreani/OCA/Retiro)
4. Click "Pagar con MercadoPago"
   → POST /api/checkout/crear-preferencia
   → Guarda cliente + orden en PostgreSQL (estado: pendiente)
   → Obtiene preferencia de MercadoPago
   → Redirige al checkout de MP
5. Usuario paga en MercadoPago
6. MP llama a /api/webhooks/mercadopago
   → Actualiza estado de orden
   → Descuenta stock de variantes
7. Usuario vuelve a /orden/[id] (success / pending / failed)
8. Admin gestiona desde /admin/ordenes
```

---

## Panel Admin

El admin tiene su propio sistema de auth con sesiones en PostgreSQL.

### Roles
- `super_admin` — acceso total
- `editor` — gestión de productos y categorías
- `operador` — solo ver y actualizar órdenes

### Funciones
- Dashboard con métricas de ventas
- CRUD completo de productos con variantes
- Gestión de stock por variante (color + talle)
- Cambio de estado de órdenes con historial
- Carga de número de tracking
- Notas internas por orden

---

## Envíos

La cotización de envíos usa las APIs de **Andreani** y **OCA**.

Si no tenés credenciales configuradas, el sistema usa estimaciones offline automáticamente para no bloquear el checkout.

| Variable | Descripción |
|----------|-------------|
| `ANDREANI_USER` | Usuario API Andreani |
| `ANDREANI_PASS` | Password API Andreani |
| `ANDREANI_CLIENT_NUMBER` | Número de contrato |
| `OCA_CUIT` | CUIT de la empresa |
| `OCA_USER` | Usuario OCA |
| `OCA_PASS` | Password OCA |

---

## MercadoPago

- Obtener credenciales en: https://www.mercadopago.com.ar/developers/panel
- Configurar webhook URL en el panel de MP apuntando a: `https://tudominio.com/api/webhooks/mercadopago`
- En desarrollo: usar `sandbox_init_point` (automático cuando el token empieza con `TEST-`)

---

## Deploy (producción)

```bash
npm run build
node dist/server/entry.mjs
```

Variables adicionales para producción:
```env
SITE_URL=https://tutienda.com
NODE_ENV=production
```

---

## Tecnologías

- **Astro 4** — SSR, islas React
- **React** — componentes interactivos (carrito, filtros, selector variantes)
- **Tailwind CSS** — estilos
- **Supabase** — base de datos PostgreSQL + Storage para imágenes
- **Drizzle ORM** — queries tipadas (conectado directamente al Postgres de Supabase)
- **@supabase/supabase-js** — cliente para Storage
- **Nanostores** — estado global reactivo + persistencia
- **MercadoPago SDK v2** — pagos
- **bcryptjs** — hashing de passwords
- **Zod** — validación de inputs
- **Lucide React** — iconos
