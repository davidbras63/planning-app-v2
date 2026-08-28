import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import * as relations from './relations'; // 1. Importe les relations

const sql = neon(process.env.DATABASE_URL!);

// 2. Fusionne tout dans l'objet schema
export const db = drizzle(sql, { schema: { ...schema, ...relations } }); 
