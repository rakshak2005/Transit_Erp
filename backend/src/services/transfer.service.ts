import prisma from '../config/db';
import { TransferStatus } from '@prisma/client';

export class TransferService {
  static async create(data: {
    sourceLocationId: string;
    destLocationId: string;
    itemId: string;
    quantity: number;
  }) {
    if (data.quantity <= 0) {
      throw new Error('Quantity must be greater than zero.');
    }

    if (data.sourceLocationId === data.destLocationId) {
      throw new Error('Source and destination locations must be different.');
    }

    const sourceLoc = await prisma.location.findUnique({ where: { id: data.sourceLocationId } });
    if (!sourceLoc) throw new Error('Source location not found.');

    const destLoc = await prisma.location.findUnique({ where: { id: data.destLocationId } });
    if (!destLoc) throw new Error('Destination location not found.');

    const item = await prisma.item.findUnique({ where: { id: data.itemId } });
    if (!item) throw new Error('Item not found.');

    return prisma.stockTransfer.create({
      data: {
        sourceLocationId: data.sourceLocationId,
        destLocationId: data.destLocationId,
        itemId: data.itemId,
        quantity: data.quantity,
        status: TransferStatus.REQUESTED,
      },
      include: {
        item: true,
        sourceLocation: true,
        destLocation: true,
      },
    });
  }

  static async getAll() {
    return prisma.stockTransfer.findMany({
      include: {
        item: true,
        sourceLocation: true,
        destLocation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async dispatch(id: string) {
    return prisma.$transaction(async (tx) => {
      // Find transfer
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
      });

      if (!transfer) {
        throw new Error('Transfer not found.');
      }

      if (transfer.status !== TransferStatus.REQUESTED) {
        throw new Error('Only requested transfers can be dispatched.');
      }

      // Find available source inventory records for this item at sourceLocation
      const sourceInventories = await tx.inventory.findMany({
        where: {
          itemId: transfer.itemId,
          locationId: transfer.sourceLocationId,
        },
      });

      // Find a batch that has enough available inventory
      const batchWithStock = sourceInventories.find(
        (inv) => inv.physicalQty - inv.reservedQty >= transfer.quantity
      );

      if (!batchWithStock) {
        throw new Error('Cannot transfer more than available inventory.');
      }

      // Reduce source physical stock
      await tx.inventory.update({
        where: { id: batchWithStock.id },
        data: {
          physicalQty: batchWithStock.physicalQty - transfer.quantity,
        },
      });

      // Update transfer status and record batchCode
      return tx.stockTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.DISPATCHED,
          batchCode: batchWithStock.batchCode,
        },
        include: {
          item: true,
          sourceLocation: true,
          destLocation: true,
        },
      });
    });
  }

  static async receive(id: string) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
      });

      if (!transfer) {
        throw new Error('Transfer not found.');
      }

      if (transfer.status === TransferStatus.RECEIVED) {
        throw new Error('Same transfer cannot be received twice.');
      }

      if (transfer.status !== TransferStatus.DISPATCHED) {
        throw new Error('Transfer must be dispatched before it can be received.');
      }

      if (!transfer.batchCode) {
        throw new Error('Transfer batch code is missing.');
      }

      const batchCode = transfer.batchCode as string;

      // Check if destination inventory record exists for this item and batch
      let destInventory = await tx.inventory.findFirst({
        where: {
          itemId: transfer.itemId,
          locationId: transfer.destLocationId,
          batchCode: batchCode,
        },
      });

      if (destInventory) {
        // Update destination stock
        await tx.inventory.update({
          where: { id: destInventory.id },
          data: {
            physicalQty: destInventory.physicalQty + transfer.quantity,
          },
        });
      } else {
        // Create new destination inventory record
        await tx.inventory.create({
          data: {
            itemId: transfer.itemId,
            locationId: transfer.destLocationId,
            batchCode: batchCode,
            physicalQty: transfer.quantity,
            reservedQty: 0,
            updatedAt: new Date(),
          },
        });
      }

      // Update transfer status
      return tx.stockTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.RECEIVED,
        },
        include: {
          item: true,
          sourceLocation: true,
          destLocation: true,
        },
      });
    });
  }
}
