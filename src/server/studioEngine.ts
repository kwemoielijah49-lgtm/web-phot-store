/**
 * Vault - Server-Side Photographer Studio Authorization & Isolation Engine
 * 
 * Enforces explicit photographer account membership and data isolation.
 * Prevents arbitrary switching or unauthorized access to photographer businesses.
 */

import { Photographer, PhotographerMembership, MembershipRole, Event, Photo, Order, RefundRequest } from '../types/index.js';
import { INITIAL_PHOTOGRAPHERS, INITIAL_MEMBERSHIPS, INITIAL_EVENTS, INITIAL_ORDERS } from '../utils/sampleData.js';
import { DB_ORDERS } from './paymentEngine.js';

// In-memory persistent server state
export const DB_PHOTOGRAPHERS = new Map<string, Photographer>();
export const DB_STUDIO_MEMBERSHIPS = new Map<string, PhotographerMembership>();
export const DB_STUDIO_EVENTS = new Map<string, Event>();
export const DB_STUDIO_REFUNDS = new Map<string, RefundRequest>();

// Seed initial photographers
for (const p of INITIAL_PHOTOGRAPHERS) {
  DB_PHOTOGRAPHERS.set(p.id, { ...p });
}

// Seed initial memberships
for (const m of INITIAL_MEMBERSHIPS) {
  DB_STUDIO_MEMBERSHIPS.set(m.id, { ...m });
}

// Seed initial events
for (const e of INITIAL_EVENTS) {
  DB_STUDIO_EVENTS.set(e.id, { ...e });
}

// Seed initial refunds
DB_STUDIO_REFUNDS.set('ref_sample_01', {
  id: 'ref_sample_01',
  orderId: 'ord_uon_0981',
  orderNumber: 'ORD-2026-1042',
  customerPhone: '254712345678',
  reason: 'Accidental duplicate selection of Photo UON-001 by family member.',
  requestedAmountKes: 250,
  status: 'pending_review',
  createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
});

/**
 * Get all active memberships for a user
 */
export function getUserMemberships(userId?: string, userEmail?: string): PhotographerMembership[] {
  if (!userId && !userEmail) return [];
  const cleanEmail = userEmail?.trim().toLowerCase();

  const results: PhotographerMembership[] = [];
  for (const m of DB_STUDIO_MEMBERSHIPS.values()) {
    if (m.status !== 'active') continue;

    const matchesId = userId && m.userId === userId;
    const matchesEmail = cleanEmail && m.userEmail.toLowerCase() === cleanEmail;

    if (matchesId || matchesEmail) {
      results.push(m);
    }
  }
  return results;
}

/**
 * Get authorized photographer businesses for a user
 */
export function getUserAuthorizedPhotographers(userId?: string, userEmail?: string): Photographer[] {
  const memberships = getUserMemberships(userId, userEmail);
  const authorizedIds = new Set(memberships.map((m) => m.photographerId));
  const results: Photographer[] = [];

  for (const p of DB_PHOTOGRAPHERS.values()) {
    if (authorizedIds.has(p.id)) {
      results.push(p);
    }
  }
  return results;
}

/**
 * Check if a user has active membership in a photographer business
 */
export function getActiveMembership(
  userId: string | undefined,
  userEmail: string | undefined,
  photographerId: string
): PhotographerMembership | undefined {
  if (!userId && !userEmail) return undefined;
  const cleanEmail = userEmail?.trim().toLowerCase();

  for (const m of DB_STUDIO_MEMBERSHIPS.values()) {
    if (m.photographerId === photographerId && m.status === 'active') {
      if (userId && m.userId === userId) return m;
      if (cleanEmail && m.userEmail.toLowerCase() === cleanEmail) return m;
    }
  }
  return undefined;
}

/**
 * Verify photographer studio access
 */
export function verifyPhotographerAccess(
  userId: string | undefined,
  userEmail: string | undefined,
  photographerId: string,
  requiredRole?: 'owner' | 'manager'
): { allowed: boolean; membership?: PhotographerMembership; error?: string; statusCode: number } {
  if (!userId && !userEmail) {
    return {
      allowed: false,
      statusCode: 401,
      error: 'Authentication required. Please sign in to access this photographer studio.',
    };
  }

  const photographer = DB_PHOTOGRAPHERS.get(photographerId);
  if (!photographer) {
    return {
      allowed: false,
      statusCode: 404,
      error: `Photographer studio "${photographerId}" not found.`,
    };
  }

  // Check if user has an explicit active membership
  const membership = getActiveMembership(userId, userEmail, photographerId);
  if (!membership) {
    return {
      allowed: false,
      statusCode: 403,
      error: `Access denied: You do not have an active membership for ${photographer.businessName}.`,
    };
  }

  if (membership.status !== 'active') {
    return {
      allowed: false,
      statusCode: 403,
      error: `Access denied: Your membership for ${photographer.businessName} has been revoked or is inactive.`,
    };
  }

  if (requiredRole && requiredRole === 'owner' && membership.role !== 'owner') {
    return {
      allowed: false,
      statusCode: 403,
      error: `Access denied: Only business owners can perform this operation.`,
    };
  }

  return {
    allowed: true,
    statusCode: 200,
    membership,
  };
}

/**
 * Register a new photography business and grant owner membership to caller
 */
export function registerPhotographerBusiness(params: {
  userId: string;
  userEmail: string;
  userName?: string;
  businessName: string;
  bio?: string;
  phone?: string;
  mpesaTillOrPaybill?: string;
  mpesaPhone?: string;
  defaultPriceKes?: number;
  brandColor?: string;
}): { photographer: Photographer; membership: PhotographerMembership } {
  const {
    userId,
    userEmail,
    userName,
    businessName,
    bio = 'Independent event and editorial photographer on Vault Kenya.',
    phone = '+254 700 000 000',
    mpesaTillOrPaybill = '500100',
    mpesaPhone = '254700000000',
    defaultPriceKes = 250,
    brandColor = '#35594B',
  } = params;

  if (!businessName || businessName.trim().length === 0) {
    throw new Error('Business name is required.');
  }

  const photographerId = `photo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const newPhotographer: Photographer = {
    id: photographerId,
    name: userName || businessName,
    businessName: businessName.trim(),
    email: userEmail.trim().toLowerCase(),
    phone,
    bio,
    brandColor,
    mpesaTillOrPaybill,
    mpesaPhone,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    status: 'active',
    joinedDate: new Date().toISOString().split('T')[0],
    defaultPriceKes,
    totalPayoutsKes: 0,
  };

  const membershipId = `mem_${userId}_${photographerId}`;
  const now = new Date().toISOString();

  const newMembership: PhotographerMembership = {
    id: membershipId,
    userId,
    userEmail: userEmail.trim().toLowerCase(),
    userName: userName || userEmail,
    photographerId,
    photographerBusinessName: newPhotographer.businessName,
    role: 'owner',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  DB_PHOTOGRAPHERS.set(photographerId, newPhotographer);
  DB_STUDIO_MEMBERSHIPS.set(membershipId, newMembership);

  return { photographer: newPhotographer, membership: newMembership };
}

/**
 * Invite / add a team member to an authorized business
 */
export function inviteTeamMember(params: {
  callerUserId: string;
  callerUserEmail?: string;
  photographerId: string;
  targetEmail: string;
  targetName?: string;
  role: MembershipRole;
}): PhotographerMembership {
  const { callerUserId, callerUserEmail, photographerId, targetEmail, targetName, role } = params;

  // Verify caller is owner or manager
  const authCheck = verifyPhotographerAccess(callerUserId, callerUserEmail, photographerId);
  if (!authCheck.allowed) {
    throw new Error(authCheck.error || 'Unauthorized to manage team');
  }

  if (authCheck.membership?.role !== 'owner' && authCheck.membership?.role !== 'manager') {
    throw new Error('Only owners and managers can add team members.');
  }

  const cleanTargetEmail = targetEmail.trim().toLowerCase();
  const photographer = DB_PHOTOGRAPHERS.get(photographerId)!;

  // Check if membership already exists
  for (const m of DB_STUDIO_MEMBERSHIPS.values()) {
    if (m.photographerId === photographerId && m.userEmail.toLowerCase() === cleanTargetEmail) {
      if (m.status === 'active') {
        throw new Error(`User with email "${cleanTargetEmail}" already has an active membership.`);
      } else {
        // Reactivate previously revoked membership
        m.status = 'active';
        m.role = role;
        m.updatedAt = new Date().toISOString();
        return m;
      }
    }
  }

  const newId = `mem_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  const newMembership: PhotographerMembership = {
    id: newId,
    userId: `usr_${Math.abs(cleanTargetEmail.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0))}`,
    userEmail: cleanTargetEmail,
    userName: targetName || cleanTargetEmail.split('@')[0],
    photographerId,
    photographerBusinessName: photographer.businessName,
    role,
    status: 'active',
    invitedBy: callerUserEmail || callerUserId,
    createdAt: now,
    updatedAt: now,
  };

  DB_STUDIO_MEMBERSHIPS.set(newId, newMembership);
  return newMembership;
}

/**
 * Revoke team member access
 */
export function revokeTeamMember(params: {
  callerUserId: string;
  callerUserEmail?: string;
  photographerId: string;
  membershipId: string;
}): { success: boolean; membership: PhotographerMembership } {
  const { callerUserId, callerUserEmail, photographerId, membershipId } = params;

  const authCheck = verifyPhotographerAccess(callerUserId, callerUserEmail, photographerId, 'owner');
  if (!authCheck.allowed) {
    throw new Error(authCheck.error || 'Only the studio owner can revoke memberships.');
  }

  const targetMem = DB_STUDIO_MEMBERSHIPS.get(membershipId);
  if (!targetMem || targetMem.photographerId !== photographerId) {
    throw new Error('Membership record not found for this studio.');
  }

  if (targetMem.role === 'owner' && targetMem.userId === callerUserId) {
    throw new Error('The primary owner cannot revoke their own ownership.');
  }

  targetMem.status = 'revoked';
  targetMem.updatedAt = new Date().toISOString();

  return { success: true, membership: targetMem };
}

/**
 * Get verified dashboard data for an authorized photographer
 */
export function getStudioDashboardData(photographerId: string) {
  const photographer = DB_PHOTOGRAPHERS.get(photographerId);
  if (!photographer) throw new Error('Photographer not found');

  // Filter events belonging to this photographer
  const events = Array.from(DB_STUDIO_EVENTS.values()).filter((e) => e.photographerId === photographerId);

  // Filter orders belonging to this photographer from paymentEngine DB_ORDERS
  const orders = Array.from(DB_ORDERS.values()).filter((o) => o.eventId && events.some((e) => e.id === o.eventId) || o.sellerSplits?.some((s) => s.photographerId === photographerId));

  // Refunds
  const orderIds = new Set(orders.map((o) => o.id));
  const refunds = Array.from(DB_STUDIO_REFUNDS.values()).filter((r) => orderIds.has(r.orderId));

  // Team memberships
  const team = Array.from(DB_STUDIO_MEMBERSHIPS.values()).filter((m) => m.photographerId === photographerId);

  // Financial calculations
  const grossSalesKes = orders
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + o.totalKes, 0);

  const totalCommissionsKes = orders
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + o.commissionAmountKes, 0);

  const netEarningsKes = grossSalesKes - totalCommissionsKes;

  return {
    photographer,
    events,
    orders,
    refunds,
    team,
    metrics: {
      grossSalesKes,
      totalCommissionsKes,
      netEarningsKes,
      totalPayoutsKes: photographer.totalPayoutsKes,
      orderCount: orders.length,
      paidOrderCount: orders.filter((o) => o.status === 'paid').length,
    },
  };
}
