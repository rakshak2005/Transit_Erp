import prisma from '../config/db';
import { OrderStatus } from '@prisma/client';

export class OrderService {
  static async create(data: {
    itemId: string;
    locationId: string;
    quantity: number;
  }) {
    if (data.quantity <= 0) {
      throw new Error('Quantity must be greater than zero.');
    }

    // Verify item and location exist
    const item = await prisma.item.findUnique({ where: { id: data.itemId } });
    if (!item) throw new Error('Item not found.');

    const location = await prisma.location.findUnique({ where: { id: data.locationId } });
    if (!location) throw new Error('Location not found.');

    // We run a serializable transaction or raw locking to prevent concurrency issues
    return prisma.$transaction(async (tx) => {
      // 1. Lock the inventory rows for this item at this location to prevent concurrent modifications
      // In PostgreSQL, SELECT FOR UPDATE locks the selected rows.
      const lockedInventories: any[] = await tx.$queryRaw`
        SELECT id, "physicalQty", "reservedQty", "batchCode"
        FROM inventories
        WHERE "itemId" = ${data.itemId}::uuid
          AND "locationId" = ${data.locationId}::uuid
        FOR UPDATE
      `;

      // 2. Calculate total available quantity across all batches
      const totalAvailable = lockedInventories.reduce(
        (sum, inv) => sum + (inv.physicalQty - inv.reservedQty),
        0
      );

      if (totalAvailable < data.quantity) {
        throw new Error('Cannot reserve more than available inventory.');
      }

      // 3. Allocate reservation across batches
      let remainingToReserve = data.quantity;
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

      // Execute all inventory updates
      await Promise.all(updates);

      // 4. Create the Customer Order
      return tx.customerOrder.create({
        data: {
          itemId: data.itemId,
          locationId: data.locationId,
          quantity: data.quantity,
          reservedQty: data.quantity,
          status: OrderStatus.RESERVED,
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
