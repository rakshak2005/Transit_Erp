import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  
  await prisma.inventory.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.customerOrder.deleteMany();
  await prisma.user.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();

  
  const blr = await prisma.location.create({
    data: { name: 'Bangalore', code: 'BLR' },
  });
  const mys = await prisma.location.create({
    data: { name: 'Mysore', code: 'MYS' },
  });
  const maa = await prisma.location.create({
    data: { name: 'Chennai', code: 'MAA' },
  });

  
  const electronics = await prisma.category.create({
    data: { name: 'Electronics' },
  });
  const furniture = await prisma.category.create({
    data: { name: 'Furniture' },
  });
  const rawMaterial = await prisma.category.create({
    data: { name: 'Raw Material' },
  });

  
  const laptop = await prisma.item.create({
    data: { name: 'Laptop', sku: 'LAP-001', categoryId: electronics.id },
  });
  const chair = await prisma.item.create({
    data: { name: 'Chair', sku: 'CHR-001', categoryId: furniture.id },
  });
  const steelRod = await prisma.item.create({
    data: { name: 'Steel Rod', sku: 'ROD-001', categoryId: rawMaterial.id },
  });

  
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const opsPasswordHash = await bcrypt.hash('ops123', 10);
  const salesPasswordHash = await bcrypt.hash('sales123', 10);

  
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
      locationId: blr.id, 
    },
  });

  const opsBlr = await prisma.user.create({
    data: {
      username: 'ops-blr',
      email: 'ops-blr@transit.com',
      passwordHash: opsPasswordHash,
      role: UserRole.OPERATIONS,
      locationId: blr.id,
    },
  });

  const opsMys = await prisma.user.create({
    data: {
      username: 'ops-mys',
      email: 'ops-mys@transit.com',
      passwordHash: opsPasswordHash,
      role: UserRole.OPERATIONS,
      locationId: mys.id, 
    },
  });

  const opsMaa = await prisma.user.create({
    data: {
      username: 'ops-maa',
      email: 'ops-maa@transit.com',
      passwordHash: opsPasswordHash,
      role: UserRole.OPERATIONS,
      locationId: maa.id, 
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

  
  await prisma.inventory.createMany({
    data: [
      {
        itemId: laptop.id,
        locationId: blr.id,
        batchCode: 'B1',
        physicalQty: 100,
        reservedQty: 30, 
        updatedAt: new Date(),
      },
      {
        itemId: chair.id,
        locationId: mys.id,
        batchCode: 'B2',
        physicalQty: 50,
        reservedQty: 10, 
        updatedAt: new Date(),
      },
      {
        itemId: steelRod.id,
        locationId: maa.id,
        batchCode: 'B3',
        physicalQty: 200,
        reservedQty: 50, 
        updatedAt: new Date(),
      },
      {
        itemId: laptop.id,
        locationId: maa.id,
        batchCode: 'B4',
        physicalQty: 60,
        reservedQty: 0, 
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
