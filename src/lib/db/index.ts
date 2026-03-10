import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = import.meta.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL no está definida. Revisar .env');
}

const isSupabase = connectionString.includes('supabase.co');

const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
  ssl: isSupabase || import.meta.env.PROD
    ? { rejectUnauthorized: false } // Supabase usa cert propio
    : false,
  transform: { undefined: null },
  onnotice: () => {},
});

export const db = drizzle(client, { schema });

export type DB = typeof db;
