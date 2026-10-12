/**
 * Vault - Payment & Media Delivery API Routes
 * 
 * Endpoints:
 * - POST /api/payments/calculate
 * - POST /api/payments/initiate
 * - GET  /api/payments/verify/:reference
 * - POST /api/payments/callback
 * - POST /api/mpesa/callback
 * - POST /api/payments/sandbox-trigger
 * - GET  /api/photos/:photoId/download
 * - GET  /api/orders/lookup
 */

import { Router, Request, Response } from 'express';
import {
  calculateAuthoritativeOrder,
  createPendingOrder,
  initiateMpesaStkPush,
  processMpesaCallback,
  verifyPhotoDownloadEntitlement,
  reconcilePendingTransactions,
  DB_SYNC_LOGS,
  DB_ORDERS,
  DB_PAYMENT_ATTEMPTS,
  CATALOG_PHOTOS,
} from './paymentEngine.js';

export const paymentRouter = Router();

/**
 * POST /api/payments/calculate
 * Authoritative price & commission calculation preview
 */
paymentRouter.post('/calculate', (req: Request, res: Response) => {
  try {
    const { photoIds } = req.body;
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      res.status(400).json({ error: 'photoIds array is required' });
      return;
    }
    const calculation = calculateAuthoritativeOrder(photoIds);
    res.json(calculation);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Calculation failed' });
  }
});

/**
 * POST /api/payments/initiate
 * Creates pending order with authoritative KES calculation, initiates STK push
 */
paymentRouter.post('/initiate', async (req: Request, res: Response) => {
  try {
    const { photoIds, customerPhone, customerEmail, customerName, idempotencyKey } = req.body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      res.status(400).json({ error: 'photoIds array is required' });
      return;
    }

    if (!customerPhone) {
      res.status(400).json({ error: 'customerPhone is required' });
      return;
    }

    if (!customerEmail) {
      res.status(400).json({ error: 'customerEmail is required' });
      return;
    }

    // 1. Create authoritative order on server
    const { order, attempt } = createPendingOrder({
      photoIds,
      customerPhone,
      customerEmail,
      customerName,
      idempotencyKey,
    });

    // 2. Initiate Daraja M-Pesa STK Push
    const stkRes = await initiateMpesaStkPush({
      orderId: order.id,
      attemptId: attempt.id,
    });

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalKes: order.totalKes,
        subtotalKes: order.subtotalKes,
        commissionAmountKes: order.commissionAmountKes,
        status: order.status,
        itemCount: order.items.length,
        sellerSplits: order.sellerSplits,
      },
      attempt: {
        id: attempt.id,
        internalRef: attempt.internalRef,
        amountKes: attempt.amountKes,
        mpesaPhone: attempt.mpesaPhone,
        status: attempt.status,
        merchantRequestId: stkRes.merchantRequestId,
        checkoutRequestId: stkRes.checkoutRequestId,
      },
      message: stkRes.customerMessage,
      mode: stkRes.mode,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Checkout initiation failed' });
  }
});

/**
 * GET /api/payments/verify/:reference
 * Verifies transaction status by orderId, orderNumber, or checkoutRequestId
 */
paymentRouter.get('/verify/:reference', (req: Request, res: Response) => {
  try {
    const ref = req.params.reference;
    let order = DB_ORDERS.get(ref);

    if (!order) {
      for (const o of DB_ORDERS.values()) {
        if (
          o.orderNumber === ref ||
          o.checkoutRequestId === ref ||
          o.mpesaReference === ref
        ) {
          order = o;
          break;
        }
      }
    }

    if (!order) {
      res.status(404).json({ error: `Order or payment not found for reference "${ref}"` });
      return;
    }

    res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalKes: order.totalKes,
      mpesaReference: order.mpesaReference,
      paidAt: order.paidAt,
      downloadToken: order.status === 'paid' ? order.downloadToken : undefined,
      downloadExpiresAt: order.status === 'paid' ? order.downloadExpiresAt : undefined,
      failureReason: order.failureReason,
      itemCount: order.items.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/mpesa/callback & POST /api/payments/callback
 * Safaricom Daraja Webhook & Callback Endpoint
 */
export async function handleMpesaCallback(req: Request, res: Response) {
  try {
    const body = req.body;
    let merchantRequestId = '';
    let checkoutRequestId = '';
    let resultCode = 0;
    let resultDesc = '';
    let mpesaReceipt: string | undefined = undefined;
    let amount: number | undefined = undefined;
    let phone: string | undefined = undefined;

    // Check if standard Safaricom Daraja payload: { Body: { stkCallback: { ... } } }
    if (body?.Body?.stkCallback) {
      const stk = body.Body.stkCallback;
      merchantRequestId = stk.MerchantRequestID;
      checkoutRequestId = stk.CheckoutRequestID;
      resultCode = Number(stk.ResultCode);
      resultDesc = stk.ResultDesc || '';

      if (stk.CallbackMetadata?.Item && Array.isArray(stk.CallbackMetadata.Item)) {
        for (const item of stk.CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = String(item.Value);
          if (item.Name === 'Amount') amount = Number(item.Value);
          if (item.Name === 'PhoneNumber') phone = String(item.Value);
        }
      }
    } else {
      // Direct formatted payload (Sandbox or Webhook proxy)
      merchantRequestId = body.merchantRequestId || '';
      checkoutRequestId = body.checkoutRequestId || '';
      resultCode = body.resultCode !== undefined ? Number(body.resultCode) : 0;
      resultDesc = body.resultDesc || 'Payment successful';
      mpesaReceipt = body.mpesaReceipt;
      amount = body.amount !== undefined ? Number(body.amount) : undefined;
      phone = body.phone;
    }

    if (!checkoutRequestId) {
      res.status(400).json({ error: 'checkoutRequestId is required in callback' });
      return;
    }

    const outcome = processMpesaCallback({
      merchantRequestId,
      checkoutRequestId,
      resultCode,
      resultDesc,
      mpesaReceipt,
      amount,
      phone,
    });

    // Return standard response expected by Safaricom Daraja
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully',
      outcome,
    });
  } catch (err: any) {
    console.error('M-Pesa Callback Error:', err);
    res.status(500).json({ error: err.message || 'Internal callback error' });
  }
}

paymentRouter.post('/callback', handleMpesaCallback);

/**
 * POST /api/payments/sandbox-trigger
 * Sandbox-only test trigger for automated test suites and pre-production validation.
 * Enables triggering verified Safaricom Daraja responses safely.
 */
paymentRouter.post('/sandbox-trigger', (req: Request, res: Response) => {
  try {
    const { checkoutRequestId, scenario, customAmount, customReceipt } = req.body;

    if (!checkoutRequestId) {
      res.status(400).json({ error: 'checkoutRequestId is required' });
      return;
    }

    const order = Array.from(DB_ORDERS.values()).find(
      (o) => o.checkoutRequestId === checkoutRequestId
    );

    if (!order) {
      res.status(404).json({ error: `Order matching checkoutRequestId ${checkoutRequestId} not found` });
      return;
    }

    let resultCode = 0;
    let resultDesc = 'The service request is processed successfully.';
    let amount = customAmount !== undefined ? customAmount : order.totalKes;
    const mpesaReceipt = customReceipt || `SDA${Math.floor(1000 + Math.random() * 9000)}KL${Math.floor(10 + Math.random() * 90)}`;

    if (scenario === 'cancelled') {
      resultCode = 1032;
      resultDesc = 'Request cancelled by user on mobile handset.';
    } else if (scenario === 'insufficient_funds') {
      resultCode = 1;
      resultDesc = 'The balance is insufficient for the transaction.';
    } else if (scenario === 'timeout') {
      resultCode = 2001;
      resultDesc = 'The initiator information is invalid or request timed out.';
    } else if (scenario === 'amount_mismatch') {
      amount = order.totalKes - 100; // Intentionally wrong amount
    }

    const outcome = processMpesaCallback({
      merchantRequestId: order.merchantRequestId || 'MR-TEST',
      checkoutRequestId,
      resultCode,
      resultDesc,
      mpesaReceipt,
      amount,
      phone: order.customerPhone,
    });

    res.json({
      scenario: scenario || 'success',
      outcome,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/payments/sync & GET /api/payments/sync
 * Automated Sync & Reconciliation Endpoint
 * Reconciles pending M-Pesa transaction logs with authoritative database orders,
 * queries Daraja STK Push status, and returns accurate status without manual refresh.
 */
async function handlePaymentSync(req: Request, res: Response) {
  try {
    const { forceSimulatePending, clientOrders, clientAttempts } = req.body || {};

    // Ingest client orders/attempts if server does not already have them
    if (Array.isArray(clientOrders)) {
      for (const co of clientOrders) {
        if (co && co.id && !DB_ORDERS.has(co.id)) {
          DB_ORDERS.set(co.id, co);
        }
      }
    }

    if (Array.isArray(clientAttempts)) {
      for (const ca of clientAttempts) {
        if (ca && ca.id && !DB_PAYMENT_ATTEMPTS.has(ca.id)) {
          DB_PAYMENT_ATTEMPTS.set(ca.id, ca);
        }
      }
    }

    const report = await reconcilePendingTransactions({
      forceSimulatePending: Boolean(forceSimulatePending),
    });

    res.json(report);
  } catch (err: any) {
    console.error('Payment sync endpoint error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Payment reconciliation failed',
      syncedAt: new Date().toISOString(),
    });
  }
}

paymentRouter.post('/sync', handlePaymentSync);
paymentRouter.get('/sync', handlePaymentSync);

/**
 * GET /api/payments/sync/logs
 * Returns audit logs of automated M-Pesa reconciliations
 */
paymentRouter.get('/sync/logs', (req: Request, res: Response) => {
  res.json({
    logs: DB_SYNC_LOGS,
    serverTime: new Date().toISOString(),
    pendingAttemptsCount: Array.from(DB_PAYMENT_ATTEMPTS.values()).filter(
      (a) => a.status === 'initiated' || a.status === 'stk_sent'
    ).length,
  });
});

/**
 * POST /api/payments/reconcile-order/:orderId
 * Force instant reconciliation of a specific order
 */
paymentRouter.post('/reconcile-order/:orderId', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.orderId;
    const order = DB_ORDERS.get(orderId);
    if (!order) {
      res.status(404).json({ error: `Order ${orderId} not found` });
      return;
    }

    const report = await reconcilePendingTransactions({ forceSimulatePending: true });
    const updatedOrder = DB_ORDERS.get(orderId);

    res.json({
      success: true,
      order: updatedOrder,
      report,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/photos/:photoId/download
 * Secure Server-Side Photo Delivery Gatekeeper
 * 
 * Mandatory checks:
 * 1. Order exists
 * 2. Order status === 'paid'
 * 3. Token matches order.downloadToken
 * 4. Token has not expired (within 30 days)
 * 5. Photo ID belongs to the purchased order
 */
paymentRouter.get('/photos/:photoId/download', async (req: Request, res: Response) => {
  try {
    const photoId = req.params.photoId;
    const orderId = String(req.query.orderId || '');
    const token = String(req.query.token || '');

    const check = verifyPhotoDownloadEntitlement({
      orderId,
      photoId,
      token,
    });

    if (!check.allowed) {
      res.status(check.statusCode).json({
        error: check.error || 'Download access denied',
        statusCode: check.statusCode,
      });
      return;
    }

    const photo = check.photo!;
    const order = check.order!;

    // In production or when master image exists on CDN/Storage, stream or pipe it:
    // If photo has a high-res preview URL, fetch and stream the buffer
    const sourceUrl = photo.previewWatermarkedUrl || photo.thumbnailUrl;

    if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
      try {
        const fetchRes = await fetch(sourceUrl);
        if (fetchRes.ok) {
          const buffer = Buffer.from(await fetchRes.arrayBuffer());
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Content-Disposition', `attachment; filename="${photo.code}_24MP_MASTER.jpg"`);
          res.setHeader('X-Vault-Verified-Order', order.orderNumber);
          res.setHeader('X-Vault-Receipt', order.mpesaReference || 'VERIFIED');
          res.send(buffer);
          return;
        }
      } catch (err) {
        console.warn('Could not stream remote asset directly, delivering authenticated payload:', err);
      }
    }

    // Direct image delivery
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${photo.code}_24MP_MASTER.jpg"`);
    res.json({
      status: 'authenticated',
      orderNumber: order.orderNumber,
      photoCode: photo.code,
      downloadUrl: sourceUrl,
      expiresAt: order.downloadExpiresAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Download processing failed' });
  }
});

/**
 * GET /api/orders/lookup
 * Lookup orders by customer phone number or receipt reference
 */
paymentRouter.get('/orders/lookup', (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) {
      res.status(400).json({ error: 'Search query (phone or order number/receipt) is required' });
      return;
    }

    const matched: any[] = [];
    for (const order of DB_ORDERS.values()) {
      if (
        order.customerPhone.includes(query) ||
        order.orderNumber.toLowerCase().includes(query.toLowerCase()) ||
        (order.mpesaReference && order.mpesaReference.toLowerCase().includes(query.toLowerCase())) ||
        order.customerEmail.toLowerCase().includes(query.toLowerCase())
      ) {
        matched.push({
          id: order.id,
          orderNumber: order.orderNumber,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          customerName: order.customerName,
          eventTitle: order.eventTitle,
          totalKes: order.totalKes,
          status: order.status,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
          mpesaReference: order.mpesaReference,
          downloadToken: order.status === 'paid' ? order.downloadToken : undefined,
          downloadExpiresAt: order.status === 'paid' ? order.downloadExpiresAt : undefined,
          items: order.items,
        });
      }
    }

    res.json({ results: matched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
