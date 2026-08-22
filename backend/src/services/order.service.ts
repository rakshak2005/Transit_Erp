import prisma from '../config/db';
import { OrderStatus } from '@prisma/client';

export class OrderService {
  static async create(data: {
    itemId: string;
    locationId: string;
    quantity: number;
    companyName?: string;
  }) {
    if (data.quantity <= 0) {
      throw new Error('Quantity must be greater than zero.');
    }

    
    const item = await prisma.item.findUnique({ where: { id: data.itemId } });
    if (!item) throw new Error('Item not found.');

    const location = await prisma.location.findUnique({ where: { id: data.locationId } });
    if (!location) throw new Error('Location not found.');

    
    return prisma.$transaction(async (tx) => {
      
      const lockedInventories: any[] = await tx.$queryRaw`
        SELECT id, "physicalQty", "reservedQty", "batchCode"
        FROM inventories
        WHERE "itemId" = ${data.itemId}::uuid
          AND "locationId" = ${data.locationId}::uuid
        FOR UPDATE
      `;

      
      const totalAvailable = lockedInventories.reduce(
        (sum, inv) => sum + (inv.physicalQty - inv.reservedQty),
        0
      );

      
      const shortage = data.quantity > totalAvailable ? data.quantity - totalAvailable : 0;
      const reserveQty = data.quantity - shortage;

      
      if (reserveQty > 0) {
        let remainingToReserve = reserveQty;
        const updates = [];

        for (const inv of lockedInventories) {
          const availableInBatch = inv.physicalQty - inv.reservedQty;
          if (availableInBatch <= 0) continue;

          const reserveFromThisBatch = Math.min(remainingToReserve, availableInBatch);
          remainingToReserve -= reserveFromThisBatch;

          updates.push(
            tx.inventory.update({
              where: { id: inv.id },
              data: {
                reservedQty: inv.reservedQty + reserveFromThisBatch,
              },
            })
          );

          if (remainingToReserve === 0) break;
        }

        
        await Promise.all(updates);
      }

      
      if (shortage > 0) {
        const defaultOpsUser = await tx.user.findFirst({
          where: { role: 'OPERATIONS' }
        });
        const assignedUser = defaultOpsUser || await tx.user.findFirst();
        if (!assignedUser) {
          throw new Error('No user available to assign the shortage Work Order.');
        }

        await tx.workOrder.create({
          data: {
            locationId: data.locationId,
            itemId: data.itemId,
            requiredQty: shortage,
            assignedUserId: assignedUser.id,
            status: 'ASSIGNED',
          }
        });
      }

      
      return tx.customerOrder.create({
        data: {
          itemId: data.itemId,
          locationId: data.locationId,
          quantity: data.quantity,
          reservedQty: reserveQty,
          companyName: data.companyName || null,
          status: shortage > 0 ? OrderStatus.PENDING : OrderStatus.RESERVED,
        },
        include: {
          item: true,
          location: true,
        },
      });
    });
  }

  static async getAll() {
    return prisma.customerOrder.findMany({
      include: {
        item: true,
        location: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
