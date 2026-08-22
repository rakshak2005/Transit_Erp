import prisma from '../config/db';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-erp-system-2026';

export class AuthService {
  static async login(emailOrUsername: string, password: string, warehousePin?: string) {
    const cleanInput = (emailOrUsername || '').trim();
    const cleanPass = (password || '').trim();
    const cleanPin = (warehousePin || '').trim();

    
    if (['00', '11', '22', '33'].includes(cleanInput) && !cleanPass) {
      return AuthService.loginWithPin(cleanInput);
    }

    
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

    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    
    let targetLocationId = user.locationId;
    let targetLocationCode = user.location?.code || null;

    if (cleanPin) {
      let code = '';
      if (cleanPin === '11') code = 'MYS';
      else if (cleanPin === '22') code = 'MAA';
      else if (cleanPin === '33') code = 'BLR';
      else if (cleanPin === '00') code = '';

      if (code) {
        const loc = await prisma.location.findFirst({ where: { code } });
        if (loc) {
          targetLocationId = loc.id;
          targetLocationCode = loc.code;
        }
      } else if (cleanPin === '00') {
        targetLocationId = null;
        targetLocationCode = null;
      }
    }

    
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        locationId: targetLocationId,
        locationCode: targetLocationCode
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
        locationId: targetLocationId,
        locationCode: targetLocationCode
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
      targetUsername = 'ops-mys';
      locationCode = 'MYS';
    } else if (cleanPin === '22') {
      targetUsername = 'ops-maa';
      locationCode = 'MAA';
    } else if (cleanPin === '33') {
      targetUsername = 'ops-blr';
      locationCode = 'BLR';
    } else {
      throw new Error('Invalid Warehouse PIN. Valid PINs: 00 (Admin), 11 (Mysore), 22 (Chennai), 33 (Bengaluru)');
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
              email: `${targetUsername}@transit.com`,
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
