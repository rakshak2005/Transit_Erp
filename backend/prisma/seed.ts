import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing data
  await prisma.inventory.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.customerOrder.deleteMany();
  await prisma.user.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();

  // 2. Create Locations
  const blr = await prisma.location.create({
    data: { name: 'Bangalore', code: 'BLR' },
  });
  const mys = await prisma.location.create({
    data: { name: 'Mysore', code: 'MYS' },
  });
  const maa = await prisma.location.create({
    data: { name: 'Chennai', code: 'MAA' },
  });

  // 3. Create Categories
  const electronics = await prisma.category.create({
    data: { name: 'Electronics' },
  });
  const furniture = await prisma.category.create({
    data: { name: 'Furniture' },
  });
  const rawMaterial = await prisma.category.create({
    data: { name: 'Raw Material' },
  });

  // 4. Create Items
  const laptop = await prisma.item.create({
    data: { name: 'Laptop', sku: 'LAP-001', categoryId: electronics.id },
  });
  const chair = await prisma.item.create({
    data: { name: 'Chair', sku: 'CHR-001', categoryId: furniture.id },
  });
  const steelRod = await prisma.item.create({
    data: { name: 'Steel Rod', sku: 'ROD-001', categoryId: rawMaterial.id },
  });

  // 5. Hash Passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const opsPasswordHash = await bcrypt.hash('ops123', 10);
  const salesPasswordHash = await bcrypt.hash('sales123', 10);

  // 6. Create Users
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@transit.com',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });

  const ops = await prisma.user.create({
    data: {
      username: 'ops',
      email: 'ops@transit.com',
      passwordHash: opsPasswordHash,
      role: UserRole.OPERATIONS,
      locationId: blr.id, // assigned to Bangalore
    },
  });

  const sales = await prisma.user.create({
    data: {
      username: 'sales',
      email: 'sales@transit.com',
      passwordHash: salesPasswordHash,
      role: UserRole.SALES,
    },
  });

  // 7. Create Inventory
  await prisma.inventory.createMany({
    data: [
      {
        itemId: laptop.id,
        locationId: blr.id,
        batchCode: 'B1',
        physicalQty: 100,
        reservedQty: 30, // Available = 70
        updatedAt: new Date(),
      },
      {
        itemId: chair.id,
        locationId: mys.id,
        batchCode: 'B2',
        physicalQty: 50,
        reservedQty: 10, // Available = 40
        updatedAt: new Date(),
      },
      {
        itemId: steelRod.id,
        locationId: maa.id,
        batchCode: 'B3',
        physicalQty: 200,
        reservedQty: 50, // Available = 150
        updatedAt: new Date(),
      },
      {
        itemId: laptop.id,
        locationId: maa.id,
        batchCode: 'B4',
        physicalQty: 60,
        reservedQty: 0, // Available = 60
        updatedAt: new Date(),
      },
    ],
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
