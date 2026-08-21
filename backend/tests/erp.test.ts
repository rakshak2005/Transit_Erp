import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/db';
import * as bcrypt from 'bcrypt';
import { UserRole, TransferStatus, WorkOrderStatus } from '@prisma/client';

let adminToken: string;
let opsToken: string;
let salesToken: string;

let itemLaptopId: string;
let locBlrId: string;
let locMaaId: string;
let inventoryBlrId: string;

beforeAll(async () => {
  // Clean all records
  await prisma.inventory.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.customerOrder.deleteMany();
  await prisma.user.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();

  // Create Locations
  const blr = await prisma.location.create({ data: { name: 'Test Bangalore', code: 'TBLR' } });
  locBlrId = blr.id;
  const maa = await prisma.location.create({ data: { name: 'Test Chennai', code: 'TMAA' } });
  locMaaId = maa.id;

  // Create Category & Item
  const cat = await prisma.category.create({ data: { name: 'Test Electronics' } });
  const item = await prisma.item.create({
    data: { name: 'Test Laptop', sku: 'TLAP-001', categoryId: cat.id },
  });
  itemLaptopId = item.id;

  // Create users with hashed passwords
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.create({
    data: { username: 'testadmin', email: 'admin@test.com', passwordHash, role: UserRole.ADMIN },
  });
  await prisma.user.create({
    data: { username: 'testops', email: 'ops@test.com', passwordHash, role: UserRole.OPERATIONS },
  });
  await prisma.user.create({
    data: { username: 'testsales', email: 'sales@test.com', passwordHash, role: UserRole.SALES },
  });

  // Log in to get tokens
  const adminRes = await request(app).post('/api/login').send({ emailOrUsername: 'admin@test.com', password: 'password123' });
  adminToken = adminRes.body.token;

  const opsRes = await request(app).post('/api/login').send({ emailOrUsername: 'ops@test.com', password: 'password123' });
  opsToken = opsRes.body.token;

  const salesRes = await request(app).post('/api/login').send({ emailOrUsername: 'sales@test.com', password: 'password123' });
  salesToken = salesRes.body.token;
});

beforeEach(async () => {
  // Reset Inventory, Work Orders, Stock Transfers, Customer Orders before each test
  await prisma.inventory.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.customerOrder.deleteMany();

  // Seed inventory: Laptop at Bangalore: physical=100, reserved=30 (available=70)
  const inv = await prisma.inventory.create({
    data: {
      itemId: itemLaptopId,
      locationId: locBlrId,
      batchCode: 'T-BATCH-1',
      physicalQty: 100,
      reservedQty: 30,
      updatedAt: new Date(),
    },
  });
  inventoryBlrId = inv.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('ERP Business Logic & Constraints', () => {
  // Test 1: Cannot reserve more than available inventory.
  test('Test 1: Cannot reserve more than available inventory', async () => {
    // Total available Laptop at BLR is 70 (100 physical - 30 reserved).
    // Attempting to reserve 80 should fail.
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        itemId: itemLaptopId,
        locationId: locBlrId,
        quantity: 80,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Cannot reserve more than available inventory.');

    // Reserve 50 (within 70 available limit) should succeed.
    const successRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        itemId: itemLaptopId,
        locationId: locBlrId,
        quantity: 50,
      });

    expect(successRes.status).toBe(201);
  });

  // Test 2: Cannot transfer more than available inventory.
  test('Test 2: Cannot transfer more than available inventory', async () => {
    // Create a stock transfer of 120 (more than 70 available stock)
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locBlrId,
        destLocationId: locMaaId,
        itemId: itemLaptopId,
        quantity: 120,
      });

    expect(createRes.status).toBe(201);
    const transferId = createRes.body.id;

    // Dispatching it should fail due to insufficient inventory
    const dispatchRes = await request(app)
      .patch('/api/transfers/dispatch')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ id: transferId });

    expect(dispatchRes.status).toBe(400);
    expect(dispatchRes.body.message).toContain('Cannot transfer more than available inventory.');
  });

  // Test 3: Destination stock increases only after transfer receipt.
  test('Test 3: Destination stock increases only after transfer receipt', async () => {
    // 1. Create stock transfer of 30 from BLR to Chennai
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locBlrId,
        destLocationId: locMaaId,
        itemId: itemLaptopId,
        quantity: 30,
      });
    const transferId = createRes.body.id;

    // Verify destination (Chennai) has no inventory yet
    let destInv = await prisma.inventory.findFirst({
      where: { itemId: itemLaptopId, locationId: locMaaId },
    });
    expect(destInv).toBeNull();

    // 2. Dispatch transfer. Source inventory must reduce, destination remains unchanged.
    const dispatchRes = await request(app)
      .patch('/api/transfers/dispatch')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ id: transferId });
    expect(dispatchRes.status).toBe(200);

    // Source (BLR) inventory should be 70 physical (100 - 30)
    const sourceInv = await prisma.inventory.findUnique({ where: { id: inventoryBlrId } });
    expect(sourceInv?.physicalQty).toBe(70);

    // Destination (Chennai) inventory must still NOT increase (be null/zero)
    destInv = await prisma.inventory.findFirst({
      where: { itemId: itemLaptopId, locationId: locMaaId },
    });
    expect(destInv).toBeNull();

    // 3. Receive transfer. Destination inventory increases now.
    const receiveRes = await request(app)
      .patch('/api/transfers/receive')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ id: transferId });
    expect(receiveRes.status).toBe(200);

    destInv = await prisma.inventory.findFirst({
      where: { itemId: itemLaptopId, locationId: locMaaId },
    });
    expect(destInv?.physicalQty).toBe(30);
  });

  // Test 4: Same transfer cannot be received twice.
  test('Test 4: Same transfer cannot be received twice', async () => {
    const createRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        sourceLocationId: locBlrId,
        destLocationId: locMaaId,
        itemId: itemLaptopId,
        quantity: 20,
      });
    const transferId = createRes.body.id;

    // Dispatch
    await request(app)
      .patch('/api/transfers/dispatch')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ id: transferId });

    // Receive 1st time (succeeds)
    const receive1 = await request(app)
      .patch('/api/transfers/receive')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ id: transferId });
    expect(receive1.status).toBe(200);

    // Receive 2nd time (fails)
    const receive2 = await request(app)
      .patch('/api/transfers/receive')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ id: transferId });

    expect(receive2.status).toBe(400);
    expect(receive2.body.message).toContain('Same transfer cannot be received twice.');
  });

  // Test 5: Unauthorized user cannot perform restricted operation.
  test('Test 5: Unauthorized user cannot perform restricted operation', async () => {
    // Sales user attempting to create a Work Order (which is Admin only) should fail (403 Forbidden)
    const workOrderRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        locationId: locBlrId,
        itemId: itemLaptopId,
        requiredQty: 50,
        assignedUserId: 'any-user-id',
      });

    expect(workOrderRes.status).toBe(403);
    expect(workOrderRes.body.message).toContain('Unauthorized user cannot perform restricted operation.');

    // Operations user attempting to create a Customer Order (which is Sales/Admin only) should fail
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        itemId: itemLaptopId,
        locationId: locBlrId,
        quantity: 10,
      });

    expect(orderRes.status).toBe(403);
    expect(orderRes.body.message).toContain('Unauthorized user cannot perform restricted operation.');
  });
});
