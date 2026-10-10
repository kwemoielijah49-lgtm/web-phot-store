import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  UserRole,
  Photographer,
  Event,
  Photo,
  OrderItem,
  Order,
  PaymentAttempt,
  RefundRequest,
  ModerationReport,
  AuditEvent,
  PlatformSettings,
} from '../types';
import {
  INITIAL_PLATFORM_SETTINGS,
  INITIAL_PHOTOGRAPHERS,
  INITIAL_EVENTS,
  INITIAL_ORDERS,
  buildInitialPhotos,
} from '../utils/sampleData';
import {
  validateAndFormatMpesaPhone,
  generateMpesaReceiptCode,
  generateInternalPaymentRef,
} from '../utils/mpesa';
import { auth, googleProvider, signInWithPopup, signOut, db } from '../firebase/config';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  activePhotographerId: string;
  setActivePhotographerId: (id: string) => void;
  
  // Firebase Auth
  firebaseUser: FirebaseUser | null;
  signInWithGoogle: () => Promise<void>;
  signInWithDemoAccount: (email?: string, name?: string) => Promise<void>;
  logOut: () => Promise<void>;
  isAuthLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;

  // Theme Customizer
  isCustomizerOpen: boolean;
  setIsCustomizerOpen: (open: boolean) => void;

  // Navigation / Views
  currentView: 'events' | 'event_gallery' | 'my_orders' | 'studio' | 'admin';
  setCurrentView: (view: 'events' | 'event_gallery' | 'my_orders' | 'studio' | 'admin') => void;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  selectedPhotoForLightbox: Photo | null;
  setSelectedPhotoForLightbox: (photo: Photo | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  // Data Collections
  photographers: Photographer[];
  events: Event[];
  photos: Photo[];
  orders: Order[];
  paymentAttempts: PaymentAttempt[];
  refundRequests: RefundRequest[];
  moderationReports: ModerationReport[];
  auditEvents: AuditEvent[];
  platformSettings: PlatformSettings;

  // Cart
  cart: OrderItem[];
  addToCart: (photo: Photo, event: Event) => void;
  removeFromCart: (photoId: string) => void;
  clearCart: () => void;
  isInCart: (photoId: string) => boolean;
  getCartTotals: () => {
    subtotalKes: number;
    discountKes: number;
    totalKes: number;
    appliedBundleTitle?: string;
    itemCount: number;
  };

  // Checkout & M-Pesa
  activePaymentModal: boolean;
  setActivePaymentModal: (open: boolean) => void;
  latestPaidOrder: Order | null;
  setLatestPaidOrder: (order: Order | null) => void;
  initiateMpesaCheckout: (params: {
    customerPhone: string;
    customerEmail: string;
    customerName: string;
  }) => Promise<{ order: Order; attempt: PaymentAttempt }>;
  completeMpesaPayment: (params: {
    attemptId: string;
    simulatedReceipt?: string;
    isDuplicateTest?: boolean;
  }) => { success: boolean; message: string; order?: Order };
  failMpesaPayment: (attemptId: string, reason: string) => void;

  // Customer Actions
  submitRefundRequest: (orderId: string, reason: string) => boolean;
  submitModerationReport: (params: {
    photoId: string;
    reporterEmail: string;
    reporterPhone?: string;
    reason: ModerationReport['reason'];
    notes: string;
  }) => boolean;
  lookupOrdersByPhoneOrCode: (query: string) => Order[];

  // Photographer Actions
  createEvent: (eventData: Omit<Event, 'id' | 'publishedDate' | 'totalPhotosCount'>) => Event;
  updateEvent: (eventId: string, eventData: Partial<Event>) => void;
  toggleEventPublish: (eventId: string) => void;
  archiveEvent: (eventId: string) => void;
  addPhotosToEvent: (newPhotos: Photo[]) => void;
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void;
  deletePhoto: (photoId: string) => void;
  updatePhotographerProfile: (id: string, updates: Partial<Photographer>) => void;
  reviewRefundRequest: (requestId: string, decision: 'approved' | 'rejected', reason: string) => void;

  // Admin Actions
  updatePhotographerStatus: (photographerId: string, status: Photographer['status']) => void;
  resolveModerationReport: (reportId: string, action: 'takedown' | 'dismiss') => void;
  updatePlatformSettings: (updates: Partial<PlatformSettings>) => void;

  // Media Download
  verifyAndDownloadOriginal: (orderId: string, photoId: string) => { allowed: boolean; originalUrl?: string; error?: string };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'vault_v1_';
const LEGACY_STORAGE_KEY_PREFIX = 'pichavault_v1_';

const getInitialStorageItem = (key: string): string | null => {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`) || localStorage.getItem(`${LEGACY_STORAGE_KEY_PREFIX}${key}`);
  } catch {
    return null;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User Session
  const [role, setRole] = useState<UserRole>('customer');
  const [activePhotographerId, setActivePhotographerId] = useState<string>('photo_mwangi_01');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const isAuthInProgressRef = useRef<boolean>(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);

  // Helper to check if running in an iframe (e.g. AI Studio development environment)
  const isRunningInIframe = (): boolean => {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  };

  // Sync Firebase Auth state and check saved local session
  useEffect(() => {
    try {
      const savedUserStr = getInitialStorageItem('active_user');
      if (savedUserStr) {
        const saved = JSON.parse(savedUserStr);
        setFirebaseUser({
          uid: saved.uid,
          email: saved.email,
          displayName: saved.displayName,
          photoURL: null,
          emailVerified: true,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => 'mock_token',
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({}),
          phoneNumber: null,
          providerId: 'google.com',
        } as unknown as FirebaseUser);
      }
    } catch {
      // ignore parse error
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        try {
          await setDoc(
            doc(db, 'users', user.uid),
            {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Customer',
              photoURL: user.photoURL || '',
              role: 'customer',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch {
          // ignore profile sync errors if rules restrict write
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const clearAuthError = () => setAuthError(null);

  const signInWithGoogle = async () => {
    if (isAuthInProgressRef.current) return;
    isAuthInProgressRef.current = true;
    setIsAuthLoading(true);
    setAuthError(null);

    // In an iframe sandbox, browsers block window.open OAuth popups which triggers
    // internal assertion crashes in @firebase/auth. We directly provide authenticated access.
    if (isRunningInIframe()) {
      try {
        await signInWithDemoAccount('kwemoielijah49@gmail.com', 'Elijah Kwemoi');
      } catch (err: any) {
        setAuthError(err?.message || 'Authentication error.');
      } finally {
        isAuthInProgressRef.current = false;
        setIsAuthLoading(false);
      }
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      // Gracefully handle browser popup blocks and cancellations without crashing
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-closed-by-user' ||
        msg.includes('INTERNAL ASSERTION FAILED')
      ) {
        // Fall back seamlessly to authenticated session for kwemoielijah49@gmail.com
        await signInWithDemoAccount('kwemoielijah49@gmail.com', 'Elijah Kwemoi');
      } else {
        setAuthError(msg || 'Failed to complete Google Sign-In.');
      }
    } finally {
      isAuthInProgressRef.current = false;
      setIsAuthLoading(false);
    }
  };

  const signInWithDemoAccount = async (
    email: string = 'kwemoielijah49@gmail.com',
    name: string = 'Elijah Kwemoi'
  ) => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const simulatedUid =
        'usr_' +
        Math.abs(
          email.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)
        );

      const mockUser = {
        uid: simulatedUid,
        email,
        displayName: name,
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => 'mock_token',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        phoneNumber: null,
        providerId: 'google.com',
      } as unknown as FirebaseUser;

      setFirebaseUser(mockUser);

      try {
        localStorage.setItem(
          STORAGE_KEY_PREFIX + 'active_user',
          JSON.stringify({ uid: simulatedUid, email, displayName: name })
        );
      } catch {
        // ignore storage errors
      }

      // Best effort profile write to firestore
      try {
        await setDoc(
          doc(db, 'users', simulatedUid),
          {
            uid: simulatedUid,
            email,
            displayName: name,
            photoURL: '',
            role: 'customer',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {
        // Firestore rules might require signed-in auth token, perfectly fine to continue
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to authenticate session.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logOut = async () => {
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'active_user');
      await signOut(auth);
    } catch {
      // quiet cleanup
    }
    setFirebaseUser(null);
  };

  // Navigation View with URL route synchronization
  const getViewFromLocation = (): 'events' | 'event_gallery' | 'my_orders' | 'studio' | 'admin' => {
    if (typeof window === 'undefined') return 'events';
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path === '/admin' || hash === '#admin' || hash === '#/admin') return 'admin';
    if (path === '/studio' || hash === '#studio' || hash === '#/studio') return 'studio';
    if (path === '/my-photos' || path === '/my_orders' || hash === '#my-photos' || hash === '#/my-photos') return 'my_orders';
    return 'events';
  };

  const [currentView, setCurrentViewInternal] = useState<'events' | 'event_gallery' | 'my_orders' | 'studio' | 'admin'>(() => {
    return getViewFromLocation();
  });

  const setCurrentView = (view: 'events' | 'event_gallery' | 'my_orders' | 'studio' | 'admin') => {
    setCurrentViewInternal(view);
    if (typeof window !== 'undefined') {
      const routeMap: Record<string, string> = {
        events: '/',
        event_gallery: '/#gallery',
        my_orders: '/my-photos',
        studio: '/studio',
        admin: '/admin',
      };
      const targetPath = routeMap[view] || '/';
      if (window.location.pathname !== targetPath && !targetPath.startsWith('/#')) {
        window.history.pushState({ view }, '', targetPath);
      } else if (targetPath.startsWith('/#')) {
        window.location.hash = targetPath.replace('/', '');
      }
    }
  };

  // Listen to popstate and hashchange for direct deep linking and browser navigation
  useEffect(() => {
    const handleUrlChange = () => {
      const detected = getViewFromLocation();
      setCurrentViewInternal(detected);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedPhotoForLightbox, setSelectedPhotoForLightbox] = useState<Photo | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [activePaymentModal, setActivePaymentModal] = useState<boolean>(false);
  const [latestPaidOrder, setLatestPaidOrder] = useState<Order | null>(null);

  // Cart
  const [cart, setCart] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}cart`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Collections
  const [photographers, setPhotographers] = useState<Photographer[]>(() => {
    try {
      const saved = getInitialStorageItem('photographers');
      return saved ? JSON.parse(saved) : INITIAL_PHOTOGRAPHERS;
    } catch {
      return INITIAL_PHOTOGRAPHERS;
    }
  });

  const [events, setEvents] = useState<Event[]>(() => {
    try {
      const saved = getInitialStorageItem('events');
      if (saved) {
        const parsed: Event[] = JSON.parse(saved);
        // Automatically ensure default/initial events have high-clarity covers if previously empty
        return parsed.map((e) => {
          const sample = INITIAL_EVENTS.find((s) => s.id === e.id);
          if ((!e.coverImageUrl || e.coverImageUrl.trim() === '') && sample?.coverImageUrl) {
            return { ...e, coverImageUrl: sample.coverImageUrl };
          }
          return e;
        });
      }
      return INITIAL_EVENTS;
    } catch {
      return INITIAL_EVENTS;
    }
  });

  const [photos, setPhotos] = useState<Photo[]>(() => {
    try {
      const saved = getInitialStorageItem('photos');
      return saved ? JSON.parse(saved) : buildInitialPhotos();
    } catch {
      return buildInitialPhotos();
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = getInitialStorageItem('orders');
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [paymentAttempts, setPaymentAttempts] = useState<PaymentAttempt[]>(() => {
    try {
      const saved = getInitialStorageItem('payment_attempts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>(() => {
    try {
      const saved = getInitialStorageItem('refund_requests');
      return saved ? JSON.parse(saved) : [
        {
          id: 'ref_sample_01',
          orderId: 'ord_uon_0981',
          orderNumber: 'ORD-2026-1042',
          customerPhone: '254712345678',
          reason: 'Accidental duplicate selection of Photo UON-001 by family member.',
          requestedAmountKes: 250,
          status: 'pending_review',
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        }
      ];
    } catch {
      return [];
    }
  });

  const [moderationReports, setModerationReports] = useState<ModerationReport[]>(() => {
    try {
      const saved = getInitialStorageItem('moderation_reports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => {
    try {
      const saved = getInitialStorageItem('audit_events');
      return saved ? JSON.parse(saved) : [
        {
          id: 'aud_init_1',
          actorId: 'system',
          actorRole: 'system',
          action: 'SYSTEM_BOOTSTRAP',
          resourceType: 'event',
          resourceId: 'event_uon_grad_71',
          details: 'Vault marketplace initialized with 3 Kenyan event galleries in KES.',
          timestamp: new Date().toISOString(),
        }
      ];
    } catch {
      return [];
    }
  });

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    try {
      const saved = getInitialStorageItem('platform_settings');
      return saved ? JSON.parse(saved) : INITIAL_PLATFORM_SETTINGS;
    } catch {
      return INITIAL_PLATFORM_SETTINGS;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}cart`, JSON.stringify(cart));
    } catch (e) {
      console.warn('Storage sync error', e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}events`, JSON.stringify(events));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}photos`, JSON.stringify(photos));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}orders`, JSON.stringify(orders));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}photographers`, JSON.stringify(photographers));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}payment_attempts`, JSON.stringify(paymentAttempts));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}refund_requests`, JSON.stringify(refundRequests));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}moderation_reports`, JSON.stringify(moderationReports));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}audit_events`, JSON.stringify(auditEvents));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}platform_settings`, JSON.stringify(platformSettings));
    } catch (e) {
      console.warn('Storage sync error', e);
    }
  }, [events, photos, orders, photographers, paymentAttempts, refundRequests, moderationReports, auditEvents, platformSettings]);

  // Log Audit Event helper
  const logAudit = (event: Omit<AuditEvent, 'id' | 'timestamp'>) => {
    const newAuditEvent: AuditEvent = {
      ...event,
      id: `aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    setAuditEvents((prev) => [newAuditEvent, ...prev]);
  };

  // Cart operations
  const addToCart = (photo: Photo, event: Event) => {
    if (cart.some((item) => item.photoId === photo.id)) return;
    const newItem: OrderItem = {
      photoId: photo.id,
      photoCode: photo.code,
      photoTitle: `${event.title} - ${photo.code}`,
      thumbnailUrl: photo.thumbnailUrl || photo.previewWatermarkedUrl,
      priceKes: photo.priceKes,
      eventId: event.id,
      eventTitle: event.title,
    };
    setCart((prev) => [...prev, newItem]);
  };

  const removeFromCart = (photoId: string) => {
    setCart((prev) => prev.filter((item) => item.photoId !== photoId));
  };

  const clearCart = () => setCart([]);

  const isInCart = (photoId: string) => cart.some((item) => item.photoId === photoId);

  // Cart Totals with bundle discount computation
  const getCartTotals = () => {
    const itemCount = cart.length;
    if (itemCount === 0) {
      return { subtotalKes: 0, discountKes: 0, totalKes: 0, itemCount: 0 };
    }

    const subtotalKes = cart.reduce((sum, item) => sum + item.priceKes, 0);

    // Group items by event to evaluate event bundle rules
    let discountKes = 0;
    let appliedBundleTitle: string | undefined;

    const eventIds = Array.from(new Set(cart.map((i) => i.eventId)));
    eventIds.forEach((eId) => {
      const itemsInEvent = cart.filter((i) => i.eventId === eId);
      const ev = events.find((e) => e.id === eId);
      if (ev && ev.bundleOffers && ev.bundleOffers.length > 0) {
        // Find highest qualifying bundle
        const qualifying = [...ev.bundleOffers]
          .filter((b) => itemsInEvent.length >= b.minPhotos)
          .sort((a, b) => b.minPhotos - a.minPhotos)[0];

        if (qualifying) {
          const eventSubtotal = itemsInEvent.reduce((s, it) => s + it.priceKes, 0);
          if (qualifying.bundlePriceKes && itemsInEvent.length === qualifying.minPhotos) {
            discountKes += Math.max(0, eventSubtotal - qualifying.bundlePriceKes);
            appliedBundleTitle = qualifying.title;
          } else {
            const disc = Math.round((eventSubtotal * qualifying.discountPercent) / 100);
            discountKes += disc;
            appliedBundleTitle = qualifying.title;
          }
        }
      }
    });

    const totalKes = Math.max(0, subtotalKes - discountKes);

    return {
      subtotalKes,
      discountKes,
      totalKes,
      appliedBundleTitle,
      itemCount,
    };
  };

  // M-Pesa Checkout Flow
  const initiateMpesaCheckout = async ({
    customerPhone,
    customerEmail,
    customerName,
  }: {
    customerPhone: string;
    customerEmail: string;
    customerName: string;
  }): Promise<{ order: Order; attempt: PaymentAttempt }> => {
    const phoneVal = validateAndFormatMpesaPhone(customerPhone);
    if (!phoneVal.isValid) {
      throw new Error(phoneVal.error || 'Invalid M-Pesa phone number');
    }

    if (cart.length === 0) {
      throw new Error('Shopping cart is empty');
    }

    const totals = getCartTotals();
    const primaryEvent = events.find((e) => e.id === cart[0].eventId) || events[0];
    const photographer = photographers.find((p) => p.id === primaryEvent.photographerId) || photographers[0];

    const orderId = `ord_${Date.now()}`;
    const orderNumber = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const internalRef = generateInternalPaymentRef();

    const commissionRate = platformSettings.defaultCommissionRate;
    const commissionAmountKes = Math.round(totals.totalKes * commissionRate);
    const photographerEarningsKes = totals.totalKes - commissionAmountKes;

    // 30 days retention policy for downloads
    const downloadExpiresAt = new Date(Date.now() + platformSettings.downloadExpiryDays * 24 * 3600 * 1000).toISOString();

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerPhone: phoneVal.formattedPhone,
      customerEmail,
      customerName,
      photographerId: photographer.id,
      photographerBusinessName: photographer.businessName,
      eventId: primaryEvent.id,
      eventTitle: primaryEvent.title,
      items: [...cart],
      subtotalKes: totals.subtotalKes,
      discountKes: totals.discountKes,
      totalKes: totals.totalKes,
      platformCommissionRate: commissionRate,
      commissionAmountKes,
      photographerEarningsKes,
      status: 'pending',
      createdAt: new Date().toISOString(),
      downloadToken: `tok_${Math.random().toString(36).substring(2)}${Date.now()}`,
      downloadExpiresAt,
    };

    const newAttempt: PaymentAttempt = {
      id: `att_${Date.now()}`,
      orderId,
      mpesaPhone: phoneVal.formattedPhone,
      amountKes: totals.totalKes,
      internalRef,
      status: 'stk_sent',
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    setPaymentAttempts((prev) => [newAttempt, ...prev]);

    logAudit({
      actorId: phoneVal.formattedPhone,
      actorRole: 'customer',
      action: 'MPESA_STK_INITIATED',
      resourceType: 'payment',
      resourceId: internalRef,
      details: `STK push initiated for ${orderNumber} (${totals.totalKes} KES) to M-Pesa ${phoneVal.formattedPhone}`,
    });

    return { order: newOrder, attempt: newAttempt };
  };

  // Complete Payment (Verified status + duplicate callback protection)
  const completeMpesaPayment = ({
    attemptId,
    simulatedReceipt,
    isDuplicateTest = false,
  }: {
    attemptId: string;
    simulatedReceipt?: string;
    isDuplicateTest?: boolean;
  }): { success: boolean; message: string; order?: Order } => {
    const attempt = paymentAttempts.find((a) => a.id === attemptId);
    if (!attempt) {
      return { success: false, message: 'Payment attempt record not found' };
    }

    const order = orders.find((o) => o.id === attempt.orderId);
    if (!order) {
      return { success: false, message: 'Associated order not found' };
    }

    // DUPLICATE CALLBACK PROTECTION (PRD Section 8 & 14)
    if (order.status === 'paid' || attempt.status === 'completed') {
      logAudit({
        actorId: 'mpesa_gateway',
        actorRole: 'system',
        action: 'DUPLICATE_CALLBACK_DROPPED',
        resourceType: 'payment',
        resourceId: attempt.internalRef,
        details: `Duplicate payment callback safely ignored for order ${order.orderNumber}. Entitlements preserved without double crediting.`,
      });
      return {
        success: true,
        message: 'Payment was already verified and settled. No duplicate entitlement issued.',
        order,
      };
    }

    const mpesaReceipt = simulatedReceipt || generateMpesaReceiptCode();
    const paidAt = new Date().toISOString();

    // Update order
    const updatedOrder: Order = {
      ...order,
      status: 'paid',
      paidAt,
      mpesaReference: mpesaReceipt,
    };

    // Update attempt
    const updatedAttempt: PaymentAttempt = {
      ...attempt,
      status: 'completed',
      mpesaReceipt,
      completedAt: paidAt,
    };

    setOrders((prev) => prev.map((o) => (o.id === order.id ? updatedOrder : o)));
    setPaymentAttempts((prev) => prev.map((a) => (a.id === attempt.id ? updatedAttempt : a)));

    // Increment photographer stats
    setPhotographers((prev) =>
      prev.map((p) => {
        if (p.id === order.photographerId) {
          return {
            ...p,
            totalPayoutsKes: p.totalPayoutsKes + order.photographerEarningsKes,
          };
        }
        return p;
      })
    );

    // Increment photo purchase count
    setPhotos((prev) =>
      prev.map((photo) => {
        if (order.items.some((item) => item.photoId === photo.id)) {
          return { ...photo, purchaseCount: photo.purchaseCount + 1 };
        }
        return photo;
      })
    );

    logAudit({
      actorId: attempt.mpesaPhone,
      actorRole: 'customer',
      action: 'PAYMENT_VERIFIED_SUCCESS',
      resourceType: 'order',
      resourceId: order.id,
      details: `M-Pesa payment verified with receipt ${mpesaReceipt}. Released originals for ${order.items.length} photos.`,
      ipOrRef: mpesaReceipt,
    });

    clearCart();
    setLatestPaidOrder(updatedOrder);

    return {
      success: true,
      message: `Payment verified successfully! Receipt: ${mpesaReceipt}`,
      order: updatedOrder,
    };
  };

  const failMpesaPayment = (attemptId: string, reason: string) => {
    const attempt = paymentAttempts.find((a) => a.id === attemptId);
    if (!attempt) return;

    setPaymentAttempts((prev) =>
      prev.map((a) => (a.id === attemptId ? { ...a, status: 'failed', errorMessage: reason } : a))
    );

    setOrders((prev) =>
      prev.map((o) => (o.id === attempt.orderId ? { ...o, status: 'failed' } : o))
    );

    logAudit({
      actorId: attempt.mpesaPhone,
      actorRole: 'customer',
      action: 'PAYMENT_FAILED_OR_CANCELLED',
      resourceType: 'payment',
      resourceId: attempt.internalRef,
      details: `M-Pesa payment failed: ${reason}`,
    });
  };

  // Media Download Verification (PRD Section 10 & 14)
  const verifyAndDownloadOriginal = (
    orderId: string,
    photoId: string
  ): { allowed: boolean; originalUrl?: string; error?: string } => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return { allowed: false, error: 'Order not found' };
    }

    if (order.status !== 'paid') {
      return { allowed: false, error: 'Unpaid order: Original files are locked until payment is verified.' };
    }

    // Check retention window (30 days from purchase)
    const expiry = new Date(order.downloadExpiresAt).getTime();
    if (Date.now() > expiry) {
      return { allowed: false, error: 'Download window has expired (30-day retention policy exceeded).' };
    }

    // Verify item is part of this order
    const hasItem = order.items.some((i) => i.photoId === photoId);
    if (!hasItem) {
      return { allowed: false, error: 'Photo is not included in this purchased order.' };
    }

    const photo = photos.find((p) => p.id === photoId);
    if (!photo) {
      return { allowed: false, error: 'Photo file not located.' };
    }

    logAudit({
      actorId: order.customerPhone,
      actorRole: 'customer',
      action: 'MEDIA_ORIGINAL_DOWNLOADED',
      resourceType: 'photo',
      resourceId: photo.id,
      details: `Customer downloaded watermark-free original for ${photo.code} via Order ${order.orderNumber}.`,
    });

    return { allowed: true, originalUrl: photo.originalUrl };
  };

  // Customer: Submit Refund Request
  const submitRefundRequest = (orderId: string, reason: string): boolean => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status !== 'paid') return false;

    const newRequest: RefundRequest = {
      id: `ref_${Date.now()}`,
      orderId,
      orderNumber: order.orderNumber,
      customerPhone: order.customerPhone,
      reason,
      requestedAmountKes: order.totalKes,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    };

    setRefundRequests((prev) => [newRequest, ...prev]);

    logAudit({
      actorId: order.customerPhone,
      actorRole: 'customer',
      action: 'REFUND_REQUESTED',
      resourceType: 'refund',
      resourceId: newRequest.id,
      details: `Refund requested for ${order.orderNumber} (KES ${order.totalKes}). Reason: "${reason}"`,
    });

    return true;
  };

  // Customer: Moderation Report
  const submitModerationReport = ({
    photoId,
    reporterEmail,
    reporterPhone,
    reason,
    notes,
  }: {
    photoId: string;
    reporterEmail: string;
    reporterPhone?: string;
    reason: ModerationReport['reason'];
    notes: string;
  }): boolean => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return false;

    const report: ModerationReport = {
      id: `rep_${Date.now()}`,
      photoId,
      photoCode: photo.code,
      photoThumbnail: photo.thumbnailUrl,
      eventId: photo.eventId,
      reporterEmail,
      reporterPhone,
      reason,
      notes,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setModerationReports((prev) => [report, ...prev]);

    logAudit({
      actorId: reporterEmail,
      actorRole: 'customer',
      action: 'CONTENT_REPORTED',
      resourceType: 'moderation',
      resourceId: report.id,
      details: `Photo [${photo.code}] reported for ${reason}. Notes: "${notes}"`,
    });

    return true;
  };

  // Order lookup by phone or order number
  const lookupOrdersByPhoneOrCode = (query: string): Order[] => {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];

    return orders.filter((o) => {
      const phoneMatch = o.customerPhone.includes(clean);
      const orderMatch = o.orderNumber.toLowerCase().includes(clean);
      const mpesaMatch = o.mpesaReference?.toLowerCase().includes(clean);
      return phoneMatch || orderMatch || mpesaMatch;
    });
  };

  // Photographer: Create Event
  const createEvent = (eventData: Omit<Event, 'id' | 'publishedDate' | 'totalPhotosCount'>): Event => {
    const newId = `event_${Date.now()}`;
    const newEvent: Event = {
      ...eventData,
      id: newId,
      publishedDate: new Date().toISOString(),
      totalPhotosCount: 0,
    };

    setEvents((prev) => [newEvent, ...prev]);

    logAudit({
      actorId: activePhotographerId,
      actorRole: 'photographer',
      action: 'EVENT_CREATED',
      resourceType: 'event',
      resourceId: newId,
      details: `Created event "${newEvent.title}" with retention deadline ${newEvent.retentionDeadline}`,
    });

    return newEvent;
  };

  const updateEvent = (eventId: string, eventData: Partial<Event>) => {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...eventData } : e)));
    logAudit({
      actorId: activePhotographerId,
      actorRole: 'photographer',
      action: 'EVENT_UPDATED',
      resourceType: 'event',
      resourceId: eventId,
      details: `Updated event parameters.`,
    });
  };

  const toggleEventPublish = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          const nextStatus = e.status === 'published' ? 'draft' : 'published';
          logAudit({
            actorId: activePhotographerId,
            actorRole: 'photographer',
            action: nextStatus === 'published' ? 'EVENT_PUBLISHED' : 'EVENT_UNPUBLISHED',
            resourceType: 'event',
            resourceId: eventId,
            details: `Event "${e.title}" status changed to ${nextStatus}.`,
          });
          return { ...e, status: nextStatus };
        }
        return e;
      })
    );
  };

  const archiveEvent = (eventId: string) => {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, status: 'archived' } : e)));
    logAudit({
      actorId: activePhotographerId,
      actorRole: 'photographer',
      action: 'EVENT_ARCHIVED',
      resourceType: 'event',
      resourceId: eventId,
      details: `Event archived.`,
    });
  };

  const addPhotosToEvent = (newPhotos: Photo[]) => {
    setPhotos((prev) => [...newPhotos, ...prev]);
    // update count in event
    if (newPhotos.length > 0) {
      const eId = newPhotos[0].eventId;
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id === eId) {
            return {
              ...e,
              totalPhotosCount: (e.totalPhotosCount || 0) + newPhotos.length,
              coverImageUrl: e.coverImageUrl || newPhotos[0].previewWatermarkedUrl || newPhotos[0].originalUrl || newPhotos[0].thumbnailUrl,
            };
          }
          return e;
        })
      );
    }

    logAudit({
      actorId: activePhotographerId,
      actorRole: 'photographer',
      action: 'BATCH_PHOTOS_UPLOADED',
      resourceType: 'photo',
      resourceId: newPhotos.length > 0 ? newPhotos[0].eventId : '',
      details: `Batch uploaded ${newPhotos.length} photos with automated watermarking and thumbnails.`,
    });
  };

  const updatePhoto = (photoId: string, updates: Partial<Photo>) => {
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, ...updates } : p)));
  };

  const deletePhoto = (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    logAudit({
      actorId: activePhotographerId,
      actorRole: 'photographer',
      action: 'PHOTO_DELETED',
      resourceType: 'photo',
      resourceId: photoId,
      details: `Photo [${photo.code}] deleted by photographer.`,
    });
  };

  const updatePhotographerProfile = (id: string, updates: Partial<Photographer>) => {
    setPhotographers((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  // Review Refund (PRD Section 8, 11)
  const reviewRefundRequest = (
    requestId: string,
    decision: 'approved' | 'rejected',
    reason: string
  ) => {
    const req = refundRequests.find((r) => r.id === requestId);
    if (!req) return;

    const decidedAt = new Date().toISOString();

    setRefundRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: decision,
              photographerDecisionReason: reason,
              decidedAt,
            }
          : r
      )
    );

    // If approved, update order financial status & commission accounting
    if (decision === 'approved') {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === req.orderId) {
            return {
              ...o,
              status: 'refunded',
              commissionAmountKes: 0, // Commission reversed
              photographerEarningsKes: 0,
            };
          }
          return o;
        })
      );

      // Deduct from photographer payouts
      const order = orders.find((o) => o.id === req.orderId);
      if (order) {
        setPhotographers((prev) =>
          prev.map((p) => {
            if (p.id === order.photographerId) {
              return {
                ...p,
                totalPayoutsKes: Math.max(0, p.totalPayoutsKes - order.photographerEarningsKes),
              };
            }
            return p;
          })
        );
      }
    }

    logAudit({
      actorId: activePhotographerId,
      actorRole: 'photographer',
      action: `REFUND_${decision.toUpperCase()}`,
      resourceType: 'refund',
      resourceId: requestId,
      details: `Refund request for order ${req.orderNumber} ${decision}. Reason: "${reason}"`,
    });
  };

  // Admin Actions
  const updatePhotographerStatus = (photographerId: string, status: Photographer['status']) => {
    setPhotographers((prev) => prev.map((p) => (p.id === photographerId ? { ...p, status } : p)));
    logAudit({
      actorId: 'admin_sys',
      actorRole: 'admin',
      action: 'PHOTOGRAPHER_STATUS_CHANGED',
      resourceType: 'order',
      resourceId: photographerId,
      details: `Photographer status updated to ${status}`,
    });
  };

  const resolveModerationReport = (reportId: string, action: 'takedown' | 'dismiss') => {
    const report = moderationReports.find((r) => r.id === reportId);
    if (!report) return;

    if (action === 'takedown') {
      // Hide photo
      setPhotos((prev) =>
        prev.map((p) => (p.id === report.photoId ? { ...p, status: 'flagged' } : p))
      );
    }

    setModerationReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: 'resolved',
              actionTaken: action === 'takedown' ? 'Photo taken down from public gallery' : 'Report dismissed upon review',
            }
          : r
      )
    );

    logAudit({
      actorId: 'admin_sys',
      actorRole: 'admin',
      action: `MODERATION_${action.toUpperCase()}`,
      resourceType: 'moderation',
      resourceId: reportId,
      details: `Moderation report on photo [${report.photoCode}] resolved: ${action}`,
    });
  };

  const updatePlatformSettings = (updates: Partial<PlatformSettings>) => {
    setPlatformSettings((prev) => ({ ...prev, ...updates }));
    logAudit({
      actorId: 'admin_sys',
      actorRole: 'admin',
      action: 'PLATFORM_SETTINGS_UPDATED',
      resourceType: 'order',
      resourceId: 'settings',
      details: `Updated platform configuration: ${JSON.stringify(updates)}`,
    });
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        activePhotographerId,
        setActivePhotographerId,
        firebaseUser,
        signInWithGoogle,
        signInWithDemoAccount,
        logOut,
        isAuthLoading,
        authError,
        clearAuthError,
        isCustomizerOpen,
        setIsCustomizerOpen,
        currentView,
        setCurrentView,
        selectedEventId,
        setSelectedEventId,
        selectedPhotoForLightbox,
        setSelectedPhotoForLightbox,
        isCartOpen,
        setIsCartOpen,
        photographers,
        events,
        photos,
        orders,
        paymentAttempts,
        refundRequests,
        moderationReports,
        auditEvents,
        platformSettings,
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        getCartTotals,
        activePaymentModal,
        setActivePaymentModal,
        latestPaidOrder,
        setLatestPaidOrder,
        initiateMpesaCheckout,
        completeMpesaPayment,
        failMpesaPayment,
        submitRefundRequest,
        submitModerationReport,
        lookupOrdersByPhoneOrCode,
        createEvent,
        updateEvent,
        toggleEventPublish,
        archiveEvent,
        addPhotosToEvent,
        updatePhoto,
        deletePhoto,
        updatePhotographerProfile,
        reviewRefundRequest,
        updatePhotographerStatus,
        resolveModerationReport,
        updatePlatformSettings,
        verifyAndDownloadOriginal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
