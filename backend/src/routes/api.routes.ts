import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';
import { InventoryController } from '../controllers/inventory.controller';
import { WorkOrderController } from '../controllers/workorder.controller';
import { TransferController } from '../controllers/transfer.controller';
import { OrderController } from '../controllers/order.controller';
import prisma from '../config/db';

const router = Router();

router.get('/meta', authenticate, async (req, res) => {
  try {
    const locations = await prisma.location.findMany();
    const items = await prisma.item.findMany();
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true },
    });
    return res.status(200).json({ locations, items, users });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching metadata', error: error.message });
  }
});

router.post(
  '/products',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OPERATIONS]),
  async (req, res) => {
    try {
      const { name, sku, categoryName, locationId, batchCode, initialPhysicalQty } = req.body;
      if (!name || !sku) {
        return res.status(400).json({ message: 'Item name and SKU are required' });
      }

      
      const targetCatName = categoryName?.trim() || 'General';
      let category = await prisma.category.findFirst({
        where: { name: { equals: targetCatName, mode: 'insensitive' } }
      });
      if (!category) {
        category = await prisma.category.create({ data: { name: targetCatName } });
      }

      
      let item = await prisma.item.findUnique({ where: { sku } });
      if (!item) {
        item = await prisma.item.create({
          data: {
            name,
            sku,
            categoryId: category.id
          }
        });
      }

      
      if (locationId) {
        await prisma.inventory.create({
          data: {
            itemId: item.id,
            locationId,
            batchCode: batchCode || 'B1',
            physicalQty: Number(initialPhysicalQty) || 0,
            reservedQty: 0,
            updatedAt: new Date()
          }
        });
      }

      return res.status(201).json({ message: 'Product created successfully', item });
    } catch (err: any) {
      return res.status(500).json({ message: 'Failed to create product', error: err.message });
    }
  }
);

router.get(
  '/inventory',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OPERATIONS]),
  InventoryController.getAll
);
router.put(
  '/inventory/:id',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OPERATIONS]),
  InventoryController.updatePhysicalQty
);

router.post(
  '/work-orders',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OPERATIONS]),
  WorkOrderController.create
);
router.get(
  '/work-orders',
  authenticate,
  WorkOrderController.getAll
);
router.patch(
  '/work-orders/:id/status',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OPERATIONS]),
  WorkOrderController.updateStatus
);

router.post(
  '/transfers',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OPERATIONS]),
  TransferController.create
);
router.get(
  '/transfers',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OPERATIONS]),
  TransferController.getAll
);
router.patch(
  '/transfers/dispatch',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OPERATIONS]),
  TransferController.dispatch
);
router.patch(
  '/transfers/receive',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OPERATIONS]),
  TransferController.receive
);
router.patch(
  '/transfers/:id/dispatch',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OPERATIONS]),
  TransferController.dispatch
);
router.patch(
  '/transfers/:id/receive',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OPERATIONS]),
  TransferController.receive
);

router.post(
  '/orders',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SALES]),
  OrderController.create
);
router.get(
  '/orders',
  authenticate,
  authorize([UserRole.ADMIN, UserRole.SALES]),
  OrderController.getAll
);

export default router;
