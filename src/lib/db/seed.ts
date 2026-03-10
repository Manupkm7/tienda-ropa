/**
 * Seed script — poblar la base de datos con datos de prueba
 * Ejecutar con: npx tsx src/lib/db/seed.ts
 */
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { categorias, productos, variantes, adminUsers } from './schema';
import bcrypt from 'bcryptjs';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql);

const CATEGORIAS = [
  { nombre: 'Remeras', slug: 'remeras', orden: 1 },
  { nombre: 'Pantalones', slug: 'pantalones', orden: 2 },
  { nombre: 'Camperas', slug: 'camperas', orden: 3 },
  { nombre: 'Accesorios', slug: 'accesorios', orden: 4 },
  { nombre: 'Calzado', slug: 'calzado', orden: 5 },
];

const COLORES = [
  { color: 'Negro', codigoHex: '#0D0D0D' },
  { color: 'Blanco', codigoHex: '#F5F2ED' },
  { color: 'Gris', codigoHex: '#8C8C8C' },
  { color: 'Tostado', codigoHex: '#C4522A' },
];

const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

async function seed() {
  console.log('🌱 Seeding database...');

  // Categorías
  const cats = await db.insert(categorias).values(CATEGORIAS).returning();
  console.log(`✓ ${cats.length} categorías creadas`);

  // Productos de muestra
  const prods = await db.insert(productos).values([
    {
      nombre: 'Remera Oversized',
      slug: 'remera-oversized',
      descripcionCorta: 'Remera de algodón premium, corte relajado',
      descripcion: 'Confeccionada en 100% algodón peinado 180gr. Corte oversized con cuello redondo reforzado. Lavado a máquina frío, no usar blanqueador.',
      precio: '12500.00',
      categoriaId: cats.find(c => c.slug === 'remeras')!.id,
      imagenes: ['/images/productos/remera-oversized-1.jpg', '/images/productos/remera-oversized-2.jpg'],
      tags: ['algodón', 'oversized', 'básico'],
      material: 'Algodón 100%',
      genero: 'unisex',
      destacado: true,
      peso: '0.250',
      alto: '70', ancho: '55', largo: '1',
    },
    {
      nombre: 'Pantalón Cargo',
      slug: 'pantalon-cargo',
      descripcionCorta: 'Pantalón cargo con múltiples bolsillos',
      descripcion: 'Tela ripstop liviana, resistente al viento. Múltiples bolsillos utilitarios. Elástico ajustable en cintura.',
      precio: '28000.00',
      precioOriginal: '35000.00',
      categoriaId: cats.find(c => c.slug === 'pantalones')!.id,
      imagenes: ['/images/productos/cargo-1.jpg'],
      tags: ['cargo', 'utilitario'],
      material: 'Ripstop 65% poliéster, 35% algodón',
      genero: 'unisex',
      destacado: true,
      peso: '0.500',
      alto: '110', ancho: '40', largo: '2',
    },
    {
      nombre: 'Campera Técnica',
      slug: 'campera-tecnica',
      descripcionCorta: 'Campera liviana impermeable',
      descripcion: 'Shell técnico impermeable DWR. Capucha ajustable. Bolsillos internos y externos. Ideal para uso urbano y outdoor.',
      precio: '65000.00',
      categoriaId: cats.find(c => c.slug === 'camperas')!.id,
      imagenes: ['/images/productos/campera-1.jpg'],
      tags: ['impermeable', 'técnica', 'outdoor'],
      material: 'Nylon DWR + forro polar 100g',
      genero: 'unisex',
      destacado: false,
      peso: '0.600',
      alto: '70', ancho: '60', largo: '2',
    },
  ]).returning();
  console.log(`✓ ${prods.length} productos creados`);

  // Variantes
  const variantesData = [];
  for (const prod of prods) {
    for (const color of COLORES.slice(0, 2)) {
      for (const talla of ['S', 'M', 'L', 'XL']) {
        variantesData.push({
          productoId: prod.id,
          ...color,
          talla,
          stock: Math.floor(Math.random() * 20) + 2,
          sku: `${prod.slug}-${color.color.toLowerCase()}-${talla}`.toUpperCase(),
        });
      }
    }
  }
  const vars = await db.insert(variantes).values(variantesData).returning();
  console.log(`✓ ${vars.length} variantes creadas`);

  // Admin user
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  await db.insert(adminUsers).values({
    email: 'admin@tienda.com',
    passwordHash,
    nombre: 'Administrador',
    rol: 'super_admin',
  }).onConflictDoNothing();
  console.log('✓ Admin user creado (admin@tienda.com / Admin123!)');

  console.log('\n✅ Seed completado!');
  await sql.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
