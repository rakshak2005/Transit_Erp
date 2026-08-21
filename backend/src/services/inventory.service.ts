import prisma from '../config/db';

export class InventoryService {
  static async getAll() {
    const inventories = await prisma.inventory.findMany({
      include: {
        item: {
          include: {
            category: true,
          },
        },
        location: true,
      },
    });

    // Dynamically map and calculate availableQty
    return inventories.map((inv) => ({
      id: inv.id,
      itemId: inv.itemId,
      itemName: inv.item.name,
      sku: inv.item.sku,
      categoryId: inv.item.categoryId,
      categoryName: inv.item.category.name,
      locationId: inv.locationId,
      locationName: inv.location.name,
      locationCode: inv.location.code,
      batchCode: inv.batchCode,
      physicalQty: inv.physicalQty,
      reservedQty: inv.reservedQty,
      availableQty: inv.physicalQty - inv.reservedQty,
    }));
  }

  static async updatePhysicalQty(id: string, physicalQty: number) {
    if (physicalQty < 0) {
      throw new Error('Physical quantity cannot be negative.');
    }

    return prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({
        where: { id },
      });

      if (!inv) {
        throw new Error('Inventory record not found.');
      }

      if (physicalQty < inv.reservedQty) {
        throw new Error('Physical quantity cannot be less than reserved quantity.');
      }

      return tx.inventory.update({
        where: { id },
        data: { physicalQty },
      });
    });
  }
}
