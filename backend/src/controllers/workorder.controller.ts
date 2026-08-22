import { Request, Response } from 'express';
import { WorkOrderService } from '../services/workorder.service';
import { WorkOrderStatus } from '@prisma/client';

export class WorkOrderController {
  static async create(req: Request, res: Response) {
    try {
      let { locationId, itemId, requiredQty, assignedUserId } = req.body;

      
      const user = (req as any).user;
      if (user?.locationId) {
        if (locationId && locationId !== user.locationId) {
          return res.status(403).json({ message: 'Restricted: You can only create work orders for your assigned warehouse branch.' });
        }
        locationId = user.locationId;
      }

      if (!locationId || !itemId || !requiredQty || !assignedUserId) {
        return res.status(400).json({ message: 'All fields (locationId, itemId, requiredQty, assignedUserId) are required.' });
      }

      const created = await WorkOrderService.create({
        locationId,
        itemId,
        requiredQty,
        assignedUserId,
      });

      return res.status(201).json(created);
    } catch (error: any) {
      if (
        error.message.includes('greater than zero') ||
        error.message.includes('not found')
      ) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const data = await WorkOrderService.getAll();
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(WorkOrderStatus).includes(status)) {
        return res.status(400).json({ message: 'Invalid or missing status.' });
      }

      const updated = await WorkOrderService.updateStatus(id, status);
      return res.status(200).json(updated);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
}
