import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service';

export class InventoryController {
  static async getAll(req: Request, res: Response) {
    try {
      const data = await InventoryService.getAll();
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async updatePhysicalQty(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { physicalQty } = req.body;

      if (physicalQty === undefined || typeof physicalQty !== 'number') {
        return res.status(400).json({ message: 'Physical quantity is required and must be a number.' });
      }

      const updated = await InventoryService.updatePhysicalQty(id, physicalQty);
      return res.status(200).json(updated);
    } catch (error: any) {
      if (error.message.includes('cannot be negative') || error.message.includes('less than reserved')) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
}
