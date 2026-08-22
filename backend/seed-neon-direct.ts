import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function seedNeon() {
  console.log('Connecting to Neon PostgreSQL database...');
  const client = new Client({
    host: '13.251.213.89',
    port: 5432,
    user: 'neondb_owner',
    password: 'npg_HYz2VmWQa8Xn',
    database: 'neondb',
    ssl: {
      servername: 'ep-crimson-unit-azecjbk8-pooler.c-3.ap-southeast-1.aws.neon.tech',
      rejectUnauthorized: false,
    },
  });

  await client.connect();
  console.log('Connected to Neon PostgreSQL successfully!');

  
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

  await client.query(`
    DO $$ BEGIN
      CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATIONS', 'SALES');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "WorkOrderStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'DISPATCHED', 'RECEIVED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'RESERVED', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  console.log('Dropping and recreating clean tables in Neon...');
  await client.query(`
    DROP TABLE IF EXISTS customer_orders CASCADE;
    DROP TABLE IF EXISTS stock_transfers CASCADE;
    DROP TABLE IF EXISTS work_orders CASCADE;
    DROP TABLE IF EXISTS inventories CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS items CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS locations CASCADE;

    CREATE TABLE locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) UNIQUE NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(100) UNIQUE NOT NULL,
      "categoryId" UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      "passwordHash" VARCHAR(255) NOT NULL,
      role "UserRole" NOT NULL,
      "locationId" UUID REFERENCES locations(id) ON DELETE SET NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE inventories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "itemId" UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      "locationId" UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      "batchCode" VARCHAR(100) NOT NULL,
      "physicalQty" INTEGER NOT NULL DEFAULT 0,
      "reservedQty" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
      CONSTRAINT "inventories_itemId_locationId_batchCode_key" UNIQUE ("itemId", "locationId", "batchCode")
    );

    CREATE TABLE work_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "locationId" UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      "itemId" UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      "requiredQty" INTEGER NOT NULL,
      "assignedUserId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status "WorkOrderStatus" NOT NULL DEFAULT 'ASSIGNED',
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE stock_transfers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "sourceLocationId" UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      "destLocationId" UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      "itemId" UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      "batchCode" VARCHAR(100),
      status "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE customer_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "itemId" UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      "locationId" UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      "reservedQty" INTEGER NOT NULL DEFAULT 0,
      status "OrderStatus" NOT NULL DEFAULT 'PENDING',
      "companyName" VARCHAR(255),
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  console.log('Seeding Locations in Neon...');
  const blrId = randomUUID();
  const mysId = randomUUID();
  const maaId = randomUUID();

  await client.query(`
    INSERT INTO locations (id, name, code, "createdAt", "updatedAt") VALUES
      ($1, 'Bangalore', 'BLR', NOW(), NOW()),
      ($2, 'Mysore', 'MYS', NOW(), NOW()),
      ($3, 'Chennai', 'MAA', NOW(), NOW());
  `, [blrId, mysId, maaId]);

  console.log('Seeding Categories in Neon...');
  const elecId = randomUUID();
  const furnId = randomUUID();
  const rawId = randomUUID();

  await client.query(`
    INSERT INTO categories (id, name, "createdAt", "updatedAt") VALUES
      ($1, 'Electronics', NOW(), NOW()),
      ($2, 'Furniture', NOW(), NOW()),
      ($3, 'Raw Material', NOW(), NOW());
  `, [elecId, furnId, rawId]);

  console.log('Seeding Items in Neon...');
  const lapId = randomUUID();
  const chrId = randomUUID();
  const rodId = randomUUID();

  await client.query(`
    INSERT INTO items (id, name, sku, "categoryId", "createdAt", "updatedAt") VALUES
      ($1, 'Laptop', 'LAP-001', $4, NOW(), NOW()),
      ($2, 'Chair', 'CHR-001', $5, NOW(), NOW()),
      ($3, 'Steel Rod', 'ROD-001', $6, NOW(), NOW());
  `, [lapId, chrId, rodId, elecId, furnId, rawId]);

  console.log('Hashing Passwords and Seeding Users in Neon...');
  const adminHash = await bcrypt.hash('admin123', 10);
  const opsHash = await bcrypt.hash('ops123', 10);
  const salesHash = await bcrypt.hash('sales123', 10);

  await client.query(`
    INSERT INTO users (id, username, email, "passwordHash", role, "locationId", "createdAt", "updatedAt") VALUES
      -- 1. Master Admin (Global PIN 00)
      ($1, 'admin', 'admin@transit.com', $2, 'ADMIN', NULL, NOW(), NOW()),

      -- 2. Operations (PIN 33 BLR, PIN 11 MYS, PIN 22 MAA)
      ($3, 'ops', 'ops@transit.com', $4, 'OPERATIONS', $5, NOW(), NOW()),
      ($6, 'ops-blr', 'ops-blr@transit.com', $4, 'OPERATIONS', $5, NOW(), NOW()),
      ($7, 'ops-mys', 'ops-mys@transit.com', $4, 'OPERATIONS', $8, NOW(), NOW()),
      ($9, 'ops-maa', 'ops-maa@transit.com', $4, 'OPERATIONS', $10, NOW(), NOW()),

      -- 3. Sales (PIN 33 BLR, PIN 11 MYS, PIN 22 MAA)
      ($11, 'sales', 'sales@transit.com', $12, 'SALES', NULL, NOW(), NOW()),
      ($13, 'sales-mys', 'sales-mys@transit.com', $12, 'SALES', $8, NOW(), NOW()),
      ($14, 'sales-maa', 'sales-maa@transit.com', $12, 'SALES', $10, NOW(), NOW()),
      ($15, 'sales-blr', 'sales-blr@transit.com', $12, 'SALES', $5, NOW(), NOW());
  `, [
    randomUUID(), adminHash,
    randomUUID(), opsHash, blrId,
    randomUUID(),
    randomUUID(), mysId,
    randomUUID(), maaId,
    randomUUID(), salesHash,
    randomUUID(),
    randomUUID(),
    randomUUID(),
  ]);

  console.log('Seeding Inventories across Bangalore, Mysore, Chennai in Neon...');
  await client.query(`
    INSERT INTO inventories (id, "itemId", "locationId", "batchCode", "physicalQty", "reservedQty", "createdAt", "updatedAt") VALUES
      ($1, $2, $3, 'B1', 100, 30, NOW(), NOW()),
      ($4, $5, $6, 'B2', 50, 10, NOW(), NOW()),
      ($7, $8, $9, 'B3', 200, 50, NOW(), NOW()),
      ($10, $2, $9, 'B4', 60, 0, NOW(), NOW());
  `, [
    randomUUID(), lapId, blrId,
    randomUUID(), chrId, mysId,
    randomUUID(), rodId, maaId,
    randomUUID(),
  ]);

  const userCount = await client.query(`
    SELECT u.username, u.email, u.role, l.code as location_code
    FROM users u
    LEFT JOIN locations l ON u."locationId" = l.id
    ORDER BY u.username;
  `);

  const invCount = await client.query(`
    SELECT i.name as item, l.name as warehouse, inv."physicalQty", inv."reservedQty", (inv."physicalQty" - inv."reservedQty") as available
    FROM inventories inv
    JOIN items i ON inv."itemId" = i.id
    JOIN locations l ON inv."locationId" = l.id;
  `);

  console.log('\n=============================================');
  console.log('🎉 NEON POSTGRESQL DATABASE SEEDED SUCCESSFULLY!');
  console.log('=============================================');
  console.log('\n👤 Seeded Users in Neon:');
  console.table(userCount.rows);

  console.log('\n📦 Seeded Inventory in Neon:');
  console.table(invCount.rows);

  await client.end();
}

seedNeon().catch((err) => {
  console.error('Neon Direct Seeding Failed:', err);
  process.exit(1);
});
