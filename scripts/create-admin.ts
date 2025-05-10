// scripts/create-admin.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { users } from '../src/database/schema';
import { eq } from 'drizzle-orm';

dotenv.config();

const setUserRole = async (email: string, role: 'superadmin' | 'admin' | 'viewer' | 'contributor') => {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const db = drizzle(pool);

  // Find user
  const userResult = await db.select().from(users).where(eq(users.email, email));
  
  if (userResult.length === 0) {
    console.error(`User with email ${email} not found`);
    await pool.end();
    return;
  }

  // Update role
  await db.update(users)
    .set({ role })
    .where(eq(users.email, email));
  
  console.log(`User ${email} role updated to ${role}`);
  await pool.end();
};

// Usage
const email = process.argv[2];
const role = process.argv[3] as 'superadmin' | 'admin' | 'viewer' | 'contributor';

if (!email || !role) {
  console.error('Usage: ts-node scripts/create-admin.ts user@example.com [superadmin|admin|viewer|contributor]');
  process.exit(1);
}

if (!['superadmin', 'admin', 'viewer', 'contributor'].includes(role)) {
  console.error('Role must be one of: superadmin, admin, viewer, contributor');
  process.exit(1);
}

setUserRole(email, role).catch(console.error);