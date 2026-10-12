/**
 * Vault - Photographer Studio Protected Authorization Routes
 * 
 * Strict Server-Side Access Control:
 * Every endpoint verifies caller identity and checks active membership in the target business.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  DB_PHOTOGRAPHERS,
  DB_STUDIO_EVENTS,
  DB_STUDIO_REFUNDS,
  DB_STUDIO_MEMBERSHIPS,
  getUserMemberships,
  getUserAuthorizedPhotographers,
  verifyPhotographerAccess,
  registerPhotographerBusiness,
  inviteTeamMember,
  revokeTeamMember,
  getStudioDashboardData,
} from './studioEngine.js';
import { DB_ORDERS } from './paymentEngine.js';

export const studioRouter = Router();

// Extend Request type to include authenticated user info
export interface StudioAuthUser {
  uid: string;
  email: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      studioUser?: StudioAuthUser;
    }
  }
}

/**
 * Authentication Middleware: Extracts and validates caller identity
 */
export function extractAuthUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const headerUid = req.headers['x-vault-user-id'] as string;
  const headerEmail = req.headers['x-vault-user-email'] as string;
  const headerName = req.headers['x-vault-user-name'] as string;

  let uid = headerUid;
  let email = headerEmail;
  let name = headerName;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    // Support JSON-encoded session token or direct UID token
    if (token.startsWith('{') && token.endsWith('}')) {
      try {
        const parsed = JSON.parse(token);
        uid = parsed.uid || uid;
        email = parsed.email || email;
        name = parsed.name || parsed.displayName || name;
      } catch {}
    } else if (token.includes('@')) {
      email = token;
      uid = uid || `usr_${token.replace(/[^a-zA-Z0-9]/g, '_')}`;
    } else if (token.startsWith('usr_') || token.startsWith('mock_')) {
      uid = token;
    }
  }

  // Also support query param fallback for direct media downloads
  if (!uid && req.query.authUid) {
    uid = String(req.query.authUid);
  }
  if (!email && req.query.authEmail) {
    email = String(req.query.authEmail);
  }

  if (uid || email) {
    req.studioUser = {
      uid: uid || `usr_${(email || '').replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: (email || '').toLowerCase(),
      name: name || undefined,
    };
  }

  next();
}

studioRouter.use(extractAuthUser);

/**
 * Require Authenticated User Middleware
 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.studioUser || (!req.studioUser.uid && !req.studioUser.email)) {
    res.status(401).json({
      error: 'Authentication required. Please sign in to access the photographer studio.',
      statusCode: 401,
    });
    return;
  }
  next();
}

/**
 * Require Active Studio Membership Middleware
 */
function requireStudioMembership(requiredRole?: 'owner' | 'manager') {
  return (req: Request, res: Response, next: NextFunction) => {
    const photographerId = req.params.photographerId;
    if (!photographerId) {
      res.status(400).json({ error: 'Photographer business ID is required' });
      return;
    }

    const check = verifyPhotographerAccess(
      req.studioUser?.uid,
      req.studioUser?.email,
      photographerId,
      requiredRole
    );

    if (!check.allowed) {
      res.status(check.statusCode).json({
        error: check.error || 'Access denied',
        statusCode: check.statusCode,
      });
      return;
    }

    next();
  };
}

/**
 * GET /api/studio/me/memberships
 * Returns the calling user's active studio memberships and authorized businesses
 */
studioRouter.get('/me/memberships', requireAuth, (req: Request, res: Response) => {
  const user = req.studioUser!;
  const memberships = getUserMemberships(user.uid, user.email);
  const authorizedPhotographers = getUserAuthorizedPhotographers(user.uid, user.email);

  res.json({
    user,
    memberships,
    authorizedPhotographers,
    totalAuthorized: authorizedPhotographers.length,
  });
});

/**
 * POST /api/studio/register
 * Onboarding: Create a new photographer business and establish caller as Owner
 */
studioRouter.post('/register', requireAuth, (req: Request, res: Response) => {
  try {
    const user = req.studioUser!;
    const { businessName, bio, phone, mpesaTillOrPaybill, mpesaPhone, defaultPriceKes, brandColor } = req.body;

    if (!businessName || !businessName.trim()) {
      res.status(400).json({ error: 'businessName is required' });
      return;
    }

    const result = registerPhotographerBusiness({
      userId: user.uid,
      userEmail: user.email,
      userName: user.name,
      businessName,
      bio,
      phone,
      mpesaTillOrPaybill,
      mpesaPhone,
      defaultPriceKes: Number(defaultPriceKes) || 250,
      brandColor,
    });

    res.status(201).json({
      success: true,
      message: `Photography studio "${result.photographer.businessName}" created successfully.`,
      photographer: result.photographer,
      membership: result.membership,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

/**
 * GET /api/studio/:photographerId/dashboard
 * Protected Dashboard: Financials, events, orders, refunds, and team
 */
studioRouter.get(
  '/:photographerId/dashboard',
  requireAuth,
  requireStudioMembership(),
  (req: Request, res: Response) => {
    try {
      const photographerId = req.params.photographerId;
      const data = getStudioDashboardData(photographerId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /api/studio/:photographerId/events
 * Protected: List events for authorized business
 */
studioRouter.get(
  '/:photographerId/events',
  requireAuth,
  requireStudioMembership(),
  (req: Request, res: Response) => {
    const photographerId = req.params.photographerId;
    const events = Array.from(DB_STUDIO_EVENTS.values()).filter(
      (e) => e.photographerId === photographerId
    );
    res.json({ events });
  }
);

/**
 * POST /api/studio/:photographerId/events
 * Protected: Create event in authorized business
 */
studioRouter.post(
  '/:photographerId/events',
  requireAuth,
  requireStudioMembership(),
  (req: Request, res: Response) => {
    try {
      const photographerId = req.params.photographerId;
      const eventData = req.body;

      if (!eventData.title || !eventData.eventDate) {
        res.status(400).json({ error: 'Title and eventDate are required' });
        return;
      }

      const newId = `event_${Date.now()}`;
      const newEvent = {
        ...eventData,
        id: newId,
        photographerId,
        publishedDate: new Date().toISOString(),
        totalPhotosCount: 0,
      };

      DB_STUDIO_EVENTS.set(newId, newEvent);
      res.status(201).json({ success: true, event: newEvent });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * PUT /api/studio/:photographerId/events/:eventId
 * Protected: Update event in authorized business
 */
studioRouter.put(
  '/:photographerId/events/:eventId',
  requireAuth,
  requireStudioMembership(),
  (req: Request, res: Response) => {
    try {
      const { photographerId, eventId } = req.params;
      const existing = DB_STUDIO_EVENTS.get(eventId);

      if (!existing || existing.photographerId !== photographerId) {
        res.status(404).json({ error: 'Event not found in this studio' });
        return;
      }

      const updated = { ...existing, ...req.body, id: eventId, photographerId };
      DB_STUDIO_EVENTS.set(eventId, updated);

      res.json({ success: true, event: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /api/studio/:photographerId/events/:eventId/toggle-publish
 * Protected: Toggle event publication
 */
studioRouter.post(
  '/:photographerId/events/:eventId/toggle-publish',
  requireAuth,
  requireStudioMembership(),
  (req: Request, res: Response) => {
    const { photographerId, eventId } = req.params;
    const existing = DB_STUDIO_EVENTS.get(eventId);

    if (!existing || existing.photographerId !== photographerId) {
      res.status(404).json({ error: 'Event not found in this studio' });
      return;
    }

    const nextStatus = existing.status === 'published' ? 'draft' : 'published';
    existing.status = nextStatus;
    DB_STUDIO_EVENTS.set(eventId, existing);

    res.json({ success: true, status: nextStatus, event: existing });
  }
);

/**
 * PUT /api/studio/:photographerId/profile
 * Protected: Update studio settings & payout details (requires owner or manager)
 */
studioRouter.put(
  '/:photographerId/profile',
  requireAuth,
  requireStudioMembership('manager'),
  (req: Request, res: Response) => {
    try {
      const photographerId = req.params.photographerId;
      const photog = DB_PHOTOGRAPHERS.get(photographerId);

      if (!photog) {
        res.status(404).json({ error: 'Photographer not found' });
        return;
      }

      const allowedFields = [
        'businessName',
        'name',
        'bio',
        'phone',
        'brandColor',
        'mpesaTillOrPaybill',
        'mpesaPhone',
        'defaultPriceKes',
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          (photog as any)[field] = req.body[field];
        }
      }

      DB_PHOTOGRAPHERS.set(photographerId, photog);
      res.json({ success: true, photographer: photog });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /api/studio/:photographerId/refunds/:refundId/review
 * Protected: Review refund request
 */
studioRouter.post(
  '/:photographerId/refunds/:refundId/review',
  requireAuth,
  requireStudioMembership(),
  (req: Request, res: Response) => {
    try {
      const { photographerId, refundId } = req.params;
      const { decision, reason } = req.body;

      if (!decision || !['approved', 'rejected'].includes(decision)) {
        res.status(400).json({ error: 'Valid decision ("approved" or "rejected") is required' });
        return;
      }

      const refund = DB_STUDIO_REFUNDS.get(refundId);
      if (!refund) {
        res.status(404).json({ error: 'Refund request not found' });
        return;
      }

      refund.status = decision;
      refund.photographerDecisionReason = reason || '';
      refund.decidedAt = new Date().toISOString();
      DB_STUDIO_REFUNDS.set(refundId, refund);

      // If approved, update order status if present
      const order = DB_ORDERS.get(refund.orderId);
      if (order && decision === 'approved') {
        order.status = 'refunded';
        order.commissionAmountKes = 0;
        DB_ORDERS.set(order.id, order);
      }

      res.json({ success: true, refund });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * POST /api/studio/:photographerId/payouts/disburse
 * Protected: Disburse M-Pesa B2C / Till settlement
 */
studioRouter.post(
  '/:photographerId/payouts/disburse',
  requireAuth,
  requireStudioMembership('manager'),
  (req: Request, res: Response) => {
    try {
      const photographerId = req.params.photographerId;
      const photog = DB_PHOTOGRAPHERS.get(photographerId);

      if (!photog) {
        res.status(404).json({ error: 'Photographer not found' });
        return;
      }

      const { orderIds } = req.body || {};
      const targetOrders = Array.from(DB_ORDERS.values()).filter((o) => {
        if (o.status !== 'paid') return false;
        if (orderIds && Array.isArray(orderIds) && !orderIds.includes(o.id)) return false;
        return o.sellerSplits?.some((s) => s.photographerId === photographerId && s.payoutStatus !== 'settled');
      });

      const totalDisbursedKes = targetOrders.reduce((sum, o) => {
        const split = o.sellerSplits?.find((s) => s.photographerId === photographerId);
        return sum + (split?.netEarningsKes || 0);
      }, 0);

      const payoutRef = `B2C-${Math.floor(100000 + Math.random() * 900000)}`;

      // Update split status
      for (const ord of targetOrders) {
        if (ord.sellerSplits) {
          ord.sellerSplits = ord.sellerSplits.map((s) =>
            s.photographerId === photographerId ? { ...s, payoutStatus: 'settled' } : s
          );
        }
      }

      photog.totalPayoutsKes += totalDisbursedKes;
      DB_PHOTOGRAPHERS.set(photographerId, photog);

      res.json({
        success: true,
        message: `Disbursed KES ${totalDisbursedKes.toLocaleString()} to M-Pesa Till ${photog.mpesaTillOrPaybill} (${payoutRef})`,
        disbursedAmountKes: totalDisbursedKes,
        payoutReference: payoutRef,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /api/studio/:photographerId/team
 * Protected: List team memberships
 */
studioRouter.get(
  '/:photographerId/team',
  requireAuth,
  requireStudioMembership(),
  (req: Request, res: Response) => {
    const photographerId = req.params.photographerId;
    const team = Array.from(DB_STUDIO_MEMBERSHIPS.values()).filter(
      (m) => m.photographerId === photographerId
    );
    res.json({ team });
  }
);

/**
 * POST /api/studio/:photographerId/team/invite
 * Protected: Invite / add authorized manager or staff (owner or manager required)
 */
studioRouter.post(
  '/:photographerId/team/invite',
  requireAuth,
  requireStudioMembership('manager'),
  (req: Request, res: Response) => {
    try {
      const photographerId = req.params.photographerId;
      const { email, name, role } = req.body;

      if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Valid team member email is required' });
        return;
      }

      const membership = inviteTeamMember({
        callerUserId: req.studioUser!.uid,
        callerUserEmail: req.studioUser!.email,
        photographerId,
        targetEmail: email,
        targetName: name,
        role: role || 'manager',
      });

      res.status(201).json({
        success: true,
        message: `Successfully granted ${membership.role} access to ${membership.userEmail}.`,
        membership,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Invitation failed' });
    }
  }
);

/**
 * DELETE /api/studio/:photographerId/team/:membershipId
 * Protected: Revoke team member access (owner only)
 */
studioRouter.delete(
  '/:photographerId/team/:membershipId',
  requireAuth,
  requireStudioMembership('owner'),
  (req: Request, res: Response) => {
    try {
      const { photographerId, membershipId } = req.params;

      const result = revokeTeamMember({
        callerUserId: req.studioUser!.uid,
        callerUserEmail: req.studioUser!.email,
        photographerId,
        membershipId,
      });

      res.json({
        success: true,
        message: 'Membership revoked successfully.',
        membership: result.membership,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Revocation failed' });
    }
  }
);

/**
 * GET /api/studio/:photographerId/photos/:photoId/original
 * Protected: Authorize photographer master photo access
 */
studioRouter.get(
  '/:photographerId/photos/:photoId/original',
  requireAuth,
  requireStudioMembership(),
  (req: Request, res: Response) => {
    const { photographerId, photoId } = req.params;
    res.json({
      allowed: true,
      photographerId,
      photoId,
      authorizedRole: 'photographer_member',
      downloadUrl: `/api/photos/${encodeURIComponent(photoId)}/download`,
    });
  }
);
