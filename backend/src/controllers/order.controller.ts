import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';

export class OrderController {
  static async create(req: Request, res: Response) {
    try {
      const { itemId, locationId, quantity, companyName } = req.body;

      if (!itemId || !locationId || !quantity) {
        return res.status(400).json({ message: 'All fields (itemId, locationId, quantity) are required.' });
      }

      const created = await OrderService.create({
        itemId,
        locationId,
        quantity,
        companyName,
      });

      return res.status(201).json(created);
    } catch (error: any) {
      if (
        error.message.includes('greater than zero') ||
        error.message.includes('not found') ||
        error.message.includes('Cannot reserve')
      ) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const data = await OrderService.getAll();
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
}
