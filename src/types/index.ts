export type UserRole = 'customer' | 'photographer' | 'admin';

export interface Photographer {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  bio: string;
  brandColor: string;
  mpesaTillOrPaybill: string;
  mpesaPhone: string;
  avatarUrl: string;
  status: 'active' | 'suspended' | 'pending_verification';
  joinedDate: string;
  defaultPriceKes: number;
  totalPayoutsKes: number;
}

export interface BundleOffer {
  id?: string;
  minPhotos: number;
  discountPercent: number;
  bundlePriceKes?: number;
  title: string;
}

export interface Event {
  id: string;
  photographerId: string;
  title: string;
  slug: string;
  description: string;
  location: string;
  eventDate: string;
  publishedDate: string;
  coverImageUrl: string;
  status: 'published' | 'draft' | 'archived';
  retentionDeadline: string; // ISO date string (90 days after event)
  sessions: string[];
  categories: string[];
  suggestedPriceKes: number;
  overridePriceKes?: number;
  bundleOffers: BundleOffer[];
  totalPhotosCount?: number;
}

export interface Photo {
  id: string;
  eventId: string;
  photographerId: string;
  code: string; // e.g. UON-104
  filename: string;
  previewWatermarkedUrl: string; // Watermarked lower-res
  thumbnailUrl: string; // Fast grid thumb
  originalUrl: string; // High-res master file (unwatermarked)
  captureTimestamp: string;
  correctedTimestamp?: string;
  session: string;
  category: string;
  priceKes: number;
  status: 'published' | 'hidden' | 'flagged';
  viewCount: number;
  purchaseCount: number;
  fileSizeBytes: number;
  width: number;
  height: number;
  lensInfo?: string;
  cameraModel?: string;
}

export interface SellerSplit {
  photographerId: string;
  photographerBusinessName: string;
  itemCount: number;
  grossAmountKes: number;
  commissionKes: number;
  processingFeeKes: number;
  netEarningsKes: number;
  payoutStatus: 'pending' | 'settled' | 'paid';
}

export interface OrderItem {
  photoId: string;
  photoCode: string;
  photoTitle: string;
  thumbnailUrl: string;
  priceKes: number;
  eventId: string;
  eventTitle: string;
  photographerId?: string;
  photographerBusinessName?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. ORD-2026-8492
  customerPhone: string;
  customerEmail: string;
  customerName?: string;
  photographerId: string;
  photographerBusinessName: string;
  eventId: string;
  eventTitle: string;
  items: OrderItem[];
  subtotalKes: number;
  discountKes: number;
  totalKes: number;
  platformCommissionRate: number; // e.g. 0.10
  commissionAmountKes: number;
  photographerEarningsKes: number;
  estimatedProcessingFeeKes?: number;
  actualProcessingFeeKes?: number;
  sellerSplits?: SellerSplit[];
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'quarantined';
  createdAt: string;
  paidAt?: string;
  mpesaReference?: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  downloadToken?: string;
  downloadExpiresAt?: string; // ISO date (30 days from purchase)
  failureReason?: string;
  idempotencyKey?: string;
  payoutStatus?: 'pending' | 'settled' | 'processing';
  payoutReference?: string;
  payoutSettledAt?: string;
}

export interface PaymentAttempt {
  id: string;
  orderId: string;
  orderNumber?: string;
  mpesaPhone: string;
  amountKes: number;
  internalRef: string;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  mpesaReceipt?: string;
  status: 'initiated' | 'stk_sent' | 'completed' | 'failed' | 'cancelled';
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface RefundRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  customerPhone: string;
  reason: string;
  requestedAmountKes: number;
  status: 'pending_review' | 'approved' | 'rejected';
  photographerDecisionReason?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface ModerationReport {
  id: string;
  photoId: string;
  photoCode: string;
  photoThumbnail: string;
  eventId: string;
  reporterEmail: string;
  reporterPhone?: string;
  reason: 'privacy_violation' | 'unauthorized_appearance' | 'inappropriate' | 'copyright';
  notes: string;
  status: 'pending' | 'resolved' | 'dismissed';
  actionTaken?: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actorRole: 'admin' | 'photographer' | 'customer' | 'system';
  action: string;
  resourceType: 'order' | 'photo' | 'event' | 'payment' | 'refund' | 'moderation';
  resourceId: string;
  details: string;
  timestamp: string;
  ipOrRef?: string;
}

export interface PlatformSettings {
  defaultCommissionRate: number; // 0.10 = 10%
  suggestedPriceKes: number; // 250 KES
  eventRetentionDays: number; // 90 days
  downloadExpiryDays: number; // 30 days
  payoutSchedule: 'weekly' | 'instant_till' | 'manual';
  emergencySupportPhone: string;
}
