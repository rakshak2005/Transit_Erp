import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { emailOrUsername, password, warehousePin } = req.body;

      if (!emailOrUsername || !password) {
        return res.status(400).json({ message: 'Email/Username and password are required' });
      }

      const result = await AuthService.login(emailOrUsername, password, warehousePin);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async loginPin(req: Request, res: Response) {
    try {
      const { pin } = req.body;
      if (!pin) {
        return res.status(400).json({ message: 'PIN is required' });
      }
      const result = await AuthService.loginWithPin(pin);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(401).json({ message: error.message || 'Invalid PIN' });
    }
  }
}
