import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import prisma from '../utils/prisma';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 'Missing or invalid Authorization header', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    const user = await prisma.user.findFirst({
      where: { id: payload.userId, tenantId: payload.tenantId, isActive: true },
    });

    if (!user) {
      sendError(res, 'User not found or inactive', 401);
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: payload.tenantId },
    });

    if (!tenant || !tenant.isActive) {
      sendError(res, 'Tenant not found or inactive', 403);
      return;
    }

    const { passwordHash: _ph, ...safeUser } = user;
    req.user = safeUser;
    req.tenant = tenant;
    req.tenantId = tenant.id;

    next();
  } catch (err) {
    logger.warn('Auth middleware error', err);
    sendError(res, 'Invalid or expired token', 401);
  }
};

export const resolveTenantFromPhoneId = async (
  phoneNumberId: string
): Promise<import('@prisma/client').Tenant | null> => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { whatsappPhoneId: phoneNumberId, isActive: true },
    });

    if (!tenant && phoneNumberId === process.env.WHATSAPP_PHONE_NUMBER_ID) {
      return prisma.tenant.findFirst({ where: { isActive: true } });
    }

    return tenant;
  } catch (err) {
    logger.error('resolveTenantFromPhoneId error', err);
    return null;
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    sendError(res, 'Insufficient permissions', 403);
    return;
  }
  next();
};
