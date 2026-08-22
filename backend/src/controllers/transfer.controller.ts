import { Request, Response } from 'express';
import { TransferService } from '../services/transfer.service';

export class TransferController {
  static async create(req: Request, res: Response) {
    try {
      let { sourceLocationId, destLocationId, itemId, quantity } = req.body;

      // If user is restricted to a warehouse hub, source must be their assigned branch
      const user = (req as any).user;
      if (user?.locationId) {
        if (sourceLocationId && sourceLocationId !== user.locationId) {
          return res.status(403).json({ message: 'Restricted: Stock transfers must originate from your assigned warehouse branch.' });
        }
        sourceLocationId = user.locationId;
      }

      if (sourceLocationId === destLocationId) {
        return res.status(400).json({ message: 'Destination location must be different from the source branch.' });
      }

      if (!sourceLocationId || !destLocationId || !itemId || !quantity) {
        return res.status(400).json({ message: 'All fields (sourceLocationId, destLocationId, itemId, quantity) are required.' });
      }

      const created = await TransferService.create({
        sourceLocationId,
        destLocationId,
        itemId,
        quantity,
      });

      return res.status(201).json(created);
    } catch (error: any) {
      if (
        error.message.includes('greater than zero') ||
        error.message.includes('different') ||
        error.message.includes('not found')
      ) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const data = await TransferService.getAll();
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async dispatch(req: Request, res: Response) {
    try {
      const { id } = req.body; // PDF states: PATCH /dispatch has id in body or params. Let's support body first.
      const transferId = id || req.params.id;

      if (!transferId) {
        return res.status(400).json({ message: 'Transfer ID is required.' });
      }

      const updated = await TransferService.dispatch(transferId);
      return res.status(200).json(updated);
    } catch (error: any) {
      if (
        error.message.includes('not found') ||
        error.message.includes('Only requested') ||
        error.message.includes('Cannot transfer more')
      ) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async receive(req: Request, res: Response) {
    try {
      const { id } = req.body;
      const transferId = id || req.params.id;

      if (!transferId) {
        return res.status(400).json({ message: 'Transfer ID is required.' });
      }

      const updated = await TransferService.receive(transferId);
      return res.status(200).json(updated);
    } catch (error: any) {
      if (
        error.message.includes('not found') ||
        error.message.includes('twice') ||
        error.message.includes('dispatched before') ||
        error.message.includes('missing')
      ) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
}
