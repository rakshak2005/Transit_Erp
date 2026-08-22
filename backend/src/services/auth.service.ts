import prisma from '../config/db';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-erp-system-2026';

export class AuthService {
  static async login(emailOrUsername: string, password: string) {
    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      },
      include: {
        location: true
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        locationId: user.locationId,
        locationCode: user.location?.code || null
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        locationId: user.locationId,
        locationCode: user.location?.code || null
      }
    };
  }

  static async loginWithPin(pin: string) {
    const cleanPin = pin.trim();
    let locationCode: string | null = null;
    let targetUsername = '';
    let role = 'OPERATIONS';

    if (cleanPin === '00') {
      targetUsername = 'admin';
      role = 'ADMIN';
    } else if (cleanPin === '11') {
      targetUsername = 'ops-blr';
      locationCode = 'BLR';
    } else if (cleanPin === '22') {
      targetUsername = 'ops-mys';
      locationCode = 'MYS';
    } else if (cleanPin === '33') {
      targetUsername = 'ops-maa';
      locationCode = 'MAA';
    } else {
      throw new Error('Invalid Warehouse PIN. Valid PINs: 00 (Admin), 11 (BLR), 22 (MYS), 33 (MAA)');
    }

    let user: any = null;
    if (role === 'ADMIN') {
      user = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        include: { location: true }
      });
    } else {
      const loc = await prisma.location.findFirst({
        where: { code: locationCode! }
      });

      if (loc) {
        user = await prisma.user.findFirst({
          where: { locationId: loc.id },
          include: { location: true }
        });

        if (!user) {
          const passwordHash = await bcrypt.hash(`${cleanPin}123`, 10);
          user = await prisma.user.create({
            data: {
              username: targetUsername,
              email: `${targetUsername}@fundsroom.com`,
              passwordHash,
              role: 'OPERATIONS',
              locationId: loc.id
            },
            include: { location: true }
          });
        }
      }
    }

    if (!user) {
      throw new Error('User account not found for this PIN');
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        locationId: user.locationId,
        locationCode: user.location?.code || null
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        locationId: user.locationId,
        locationCode: user.location?.code || null
      }
    };
  }
}
