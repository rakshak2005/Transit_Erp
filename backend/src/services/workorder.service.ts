import prisma from '../config/db';
import { WorkOrderStatus } from '@prisma/client';

export class WorkOrderService {
  static async create(data: {
    locationId: string;
    itemId: string;
    requiredQty: number;
    assignedUserId: string;
  }) {
    if (data.requiredQty <= 0) {
      throw new Error('Required quantity must be greater than zero.');
    }

    // Verify assigned user exists
    const user = await prisma.user.findUnique({
      where: { id: data.assignedUserId },
    });
    if (!user) {
      throw new Error('Assigned user not found.');
    }

    // Verify item and location exist
    const item = await prisma.item.findUnique({ where: { id: data.itemId } });
    if (!item) {
      throw new Error('Item not found.');
    }
    const location = await prisma.location.findUnique({ where: { id: data.locationId } });
    if (!location) {
      throw new Error('Location not found.');
    }

    return prisma.workOrder.create({
      data: {
        locationId: data.locationId,
        itemId: data.itemId,
        requiredQty: data.requiredQty,
        assignedUserId: data.assignedUserId,
        status: WorkOrderStatus.ASSIGNED,
      },
      include: {
        item: true,
        location: true,
        assignedUser: true,
      },
    });
  }

  static async getAll() {
    const workOrders = await prisma.workOrder.findMany({
      include: {
        item: true,
        location: true,
        assignedUser: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Calculate shortage dynamically for each work order
    const result = [];
    for (const wo of workOrders) {
      // Find all inventories for this item at this location across all batches
      const inventories = await prisma.inventory.findMany({
        where: {
          itemId: wo.itemId,
          locationId: wo.locationId,
        },
      });

      const totalAvailable = inventories.reduce(
        (sum, inv) => sum + (inv.physicalQty - inv.reservedQty),
        0
      );

      const shortage = Math.max(0, wo.requiredQty - totalAvailable);

      result.push({
        ...wo,
        availableQty: totalAvailable,
        shortage,
      });
    }

    return result;
  }

  static async updateStatus(id: string, status: WorkOrderStatus) {
    return prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findUnique({
        where: { id },
      });
      if (!wo) {
        throw new Error('Work order not found.');
      }

      if (wo.status !== WorkOrderStatus.COMPLETED && status === WorkOrderStatus.COMPLETED) {
        const inventory = await tx.inventory.findFirst({
          where: {
            itemId: wo.itemId,
            locationId: wo.locationId,
          },
        });

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { physicalQty: inventory.physicalQty + wo.requiredQty },
          });
        } else {
          await tx.inventory.create({
            data: {
              itemId: wo.itemId,
              locationId: wo.locationId,
              batchCode: `WO-${wo.id.substring(0, 8)}`,
              physicalQty: wo.requiredQty,
              reservedQty: 0,
              updatedAt: new Date(),
            },
          });
        }
      }

      return tx.workOrder.update({
        where: { id },
        data: { status },
        include: {
          item: true,
          location: true,
          assignedUser: true,
        },
      });
    });
  }
}
