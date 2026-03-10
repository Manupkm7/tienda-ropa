import {
  pgTable, serial, text, integer, decimal,
  timestamp, boolean, jsonb, uuid, index, uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Categorías ───────────────────────────────────────────────────────────────
export const categorias = pgTable('categorias', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  slug: text('slug').notNull(),
  descripcion: text('descripcion'),
  imagen: text('imagen'),
  orden: integer('orden').default(0),
  activa: boolean('activa').default(true),
  creadoEn: timestamp('creado_en').defaultNow().notNull(),
}, (t) => ({
  slugIdx: uniqueIndex('categorias_slug_idx').on(t.slug),
}));

// ─── Productos ────────────────────────────────────────────────────────────────
export const productos = pgTable('productos', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  slug: text('slug').notNull(),
  descripcion: text('descripcion'),
  descripcionCorta: text('descripcion_corta'),
  precio: decimal('precio', { precision: 10, scale: 2 }).notNull(),
  precioOriginal: decimal('precio_original', { precision: 10, scale: 2 }),
  categoriaId: integer('categoria_id').references(() => categorias.id),
  imagenes: jsonb('imagenes').$type<string[]>().default([]),
  tags: jsonb('tags').$type<string[]>().default([]),
  material: text('material'),
  genero: text('genero'), // 'mujer' | 'hombre' | 'unisex'
  activo: boolean('activo').default(true),
  destacado: boolean('destacado').default(false),
  peso: decimal('peso', { precision: 6, scale: 3 }), // kg, para cálculo de envío
  alto: decimal('alto', { precision: 6, scale: 2 }),  // cm
  ancho: decimal('ancho', { precision: 6, scale: 2 }),
  largo: decimal('largo', { precision: 6, scale: 2 }),
  creadoEn: timestamp('creado_en').defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en').defaultNow().notNull(),
}, (t) => ({
  slugIdx: uniqueIndex('productos_slug_idx').on(t.slug),
  categoriaIdx: index('productos_categoria_idx').on(t.categoriaId),
  activoIdx: index('productos_activo_idx').on(t.activo),
}));

// ─── Variantes (color + talla) ────────────────────────────────────────────────
export const variantes = pgTable('variantes', {
  id: serial('id').primaryKey(),
  productoId: integer('producto_id').references(() => productos.id, { onDelete: 'cascade' }).notNull(),
  color: text('color'),           // "Negro", "Blanco", etc.
  codigoHex: text('codigo_hex'), // "#0D0D0D"
  talla: text('talla'),          // "XS", "S", "M", "L", "XL", "XXL"
  stock: integer('stock').default(0).notNull(),
  sku: text('sku'),
  precioExtra: decimal('precio_extra', { precision: 10, scale: 2 }).default('0'),
  imagen: text('imagen'), // imagen específica de esta variante
  activa: boolean('activa').default(true),
}, (t) => ({
  skuIdx: uniqueIndex('variantes_sku_idx').on(t.sku),
  productoIdx: index('variantes_producto_idx').on(t.productoId),
}));

// ─── Clientes ─────────────────────────────────────────────────────────────────
export const clientes = pgTable('clientes', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  nombre: text('nombre').notNull(),
  apellido: text('apellido').notNull(),
  telefono: text('telefono'),
  dni: text('dni'),
  passwordHash: text('password_hash'),
  emailVerificado: boolean('email_verificado').default(false),
  tokenVerificacion: text('token_verificacion'),
  tokenResetPassword: text('token_reset_password'),
  tokenResetExpira: timestamp('token_reset_expira'),
  direccionEnvio: jsonb('direccion_envio').$type<{
    calle: string;
    numero: string;
    piso?: string;
    depto?: string;
    ciudad: string;
    provincia: string;
    codigoPostal: string;
    pais: string;
  }>(),
  creadoEn: timestamp('creado_en').defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en').defaultNow().notNull(),
}, (t) => ({
  emailIdx: uniqueIndex('clientes_email_idx').on(t.email),
}));

// ─── Sesiones de clientes ─────────────────────────────────────────────────────
export const clienteSessions = pgTable('cliente_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  clienteId: integer('cliente_id').references(() => clientes.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  userAgent: text('user_agent'),
  ip: text('ip'),
  creadoEn: timestamp('creado_en').defaultNow().notNull(),
}, (t) => ({
  clienteIdx: index('csessions_cliente_idx').on(t.clienteId),
}));

// ─── Órdenes ──────────────────────────────────────────────────────────────────
export const ordenes = pgTable('ordenes', {
  id: uuid('id').defaultRandom().primaryKey(),
  numero: serial('numero'), // número legible: #0001, #0002...
  clienteId: integer('cliente_id').references(() => clientes.id),
  estado: text('estado').notNull().default('pendiente'),
  // pendiente | pagado | procesando | empaquetado | enviado | entregado | cancelado | reembolsado
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  costoEnvio: decimal('costo_envio', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  items: jsonb('items').$type<Array<{
    productoId: number;
    varianteId?: number;
    nombre: string;
    color?: string;
    talla?: string;
    precio: number;
    cantidad: number;
    imagen: string;
    sku?: string;
  }>>(),
  datosEnvio: jsonb('datos_envio').$type<{
    metodo: 'andreani' | 'oca' | 'retiro';
    servicio?: string;
    sucursal?: string;
    trackingId?: string;
    estimadoDias?: number;
    nombreDestinatario: string;
    direccion: {
      calle: string; numero: string; piso?: string; depto?: string;
      ciudad: string; provincia: string; codigoPostal: string;
    };
  }>(),
  mercadoPagoId: text('mercadopago_id'),
  mercadoPagoPreferenceId: text('mercadopago_preference_id'),
  mercadoPagoStatus: text('mercadopago_status'),
  notasCliente: text('notas_cliente'),
  notasAdmin: text('notas_admin'),
  creadoEn: timestamp('creado_en').defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en').defaultNow().notNull(),
}, (t) => ({
  clienteIdx: index('ordenes_cliente_idx').on(t.clienteId),
  estadoIdx: index('ordenes_estado_idx').on(t.estado),
  mpIdx: index('ordenes_mp_idx').on(t.mercadoPagoId),
}));

// ─── Admin Users ──────────────────────────────────────────────────────────────
export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  nombre: text('nombre').notNull(),
  rol: text('rol').notNull().default('editor'),
  // 'super_admin' | 'editor' | 'operador'
  activo: boolean('activo').default(true),
  ultimoLogin: timestamp('ultimo_login'),
  creadoEn: timestamp('creado_en').defaultNow().notNull(),
}, (t) => ({
  emailIdx: uniqueIndex('admin_email_idx').on(t.email),
}));

// ─── Sessions (admin) ─────────────────────────────────────────────────────────
export const adminSessions = pgTable('admin_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: integer('user_id').references(() => adminUsers.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  creadoEn: timestamp('creado_en').defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────
export const productosRelations = relations(productos, ({ one, many }) => ({
  categoria: one(categorias, { fields: [productos.categoriaId], references: [categorias.id] }),
  variantes: many(variantes),
}));

export const variantesRelations = relations(variantes, ({ one }) => ({
  producto: one(productos, { fields: [variantes.productoId], references: [productos.id] }),
}));

export const ordenesRelations = relations(ordenes, ({ one }) => ({
  cliente: one(clientes, { fields: [ordenes.clienteId], references: [clientes.id] }),
}));

export const clientesRelations = relations(clientes, ({ many }) => ({
  ordenes: many(ordenes),
  sessions: many(clienteSessions),
}));

export const clienteSessionsRelations = relations(clienteSessions, ({ one }) => ({
  cliente: one(clientes, { fields: [clienteSessions.clienteId], references: [clientes.id] }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────
export type Producto = typeof productos.$inferSelect;
export type NuevoProducto = typeof productos.$inferInsert;
export type Variante = typeof variantes.$inferSelect;
export type Categoria = typeof categorias.$inferSelect;
export type Cliente = typeof clientes.$inferSelect;
export type NuevoCliente = typeof clientes.$inferInsert;
export type Orden = typeof ordenes.$inferSelect;
export type NuevaOrden = typeof ordenes.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type ClienteSession = typeof clienteSessions.$inferSelect;

export type ProductoConVariantes = Producto & {
  variantes: Variante[];
  categoria: Categoria | null;
};

export type ClientePublico = Omit<Cliente, 'passwordHash' | 'tokenVerificacion' | 'tokenResetPassword' | 'tokenResetExpira'>;
