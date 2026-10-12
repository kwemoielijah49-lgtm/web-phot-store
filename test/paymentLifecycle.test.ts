import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createPendingOrder,
  initiateMpesaStkPush,
  processMpesaCallback,
  DB_ORDERS,
} from '../src/server/paymentEngine.js';

describe('Vault Transaction Lifecycle & Callback Verification Engine', () => {
  it('creates an authoritative order in pending status with unique references', () => {
    const { order, attempt } = createPendingOrder({
      photoIds: ['photo_uon_1', 'photo_uon_2'],
      customerPhone: '0712345678',
      customerEmail: 'customer@example.com',
      customerName: 'Kariuki Test',
      idempotencyKey: 'idemp_key_unique_1',
    });

    assert.strictEqual(order.status, 'pending');
    assert.strictEqual(order.totalKes, 500);
    assert.strictEqual(order.customerPhone, '254712345678');
    assert.ok(order.orderNumber.startsWith('ORD-2026-'));
    assert.ok(attempt.internalRef.startsWith('VAULT-MP-'));
    assert.strictEqual(attempt.status, 'initiated');

    // Duplicate idempotency check returns the existing order
    const duplicate = createPendingOrder({
      photoIds: ['photo_uon_1', 'photo_uon_2'],
      customerPhone: '0712345678',
      customerEmail: 'customer@example.com',
      customerName: 'Kariuki Test',
      idempotencyKey: 'idemp_key_unique_1',
    });

    assert.strictEqual(duplicate.order.id, order.id);
  });

  it('initiates M-Pesa STK push and transitions attempt to stk_sent', async () => {
    const { order, attempt } = createPendingOrder({
      photoIds: ['photo_uon_3'],
      customerPhone: '0722458912',
      customerEmail: 'attendee@gmail.com',
    });

    const stk = await initiateMpesaStkPush({
      orderId: order.id,
      attemptId: attempt.id,
    });

    assert.ok(stk.merchantRequestId);
    assert.ok(stk.checkoutRequestId);
    assert.strictEqual(attempt.status, 'stk_sent');
    assert.strictEqual(order.checkoutRequestId, stk.checkoutRequestId);
  });

  it('verifies valid M-Pesa payment, settles order, and generates cryptographic 30-day download token', async () => {
    const { order, attempt } = createPendingOrder({
      photoIds: ['photo_wed_1', 'photo_wed_2'],
      customerPhone: '0711889001',
      customerEmail: 'wedding.guest@gmail.com',
    });

    const stk = await initiateMpesaStkPush({
      orderId: order.id,
      attemptId: attempt.id,
    });

    const callback = processMpesaCallback({
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
      resultCode: 0,
      resultDesc: 'The service request is processed successfully.',
      mpesaReceipt: 'SDA9912KL3',
      amount: order.totalKes,
      phone: '254711889001',
    });

    assert.strictEqual(callback.success, true);
    assert.strictEqual(callback.status, 'paid');
    assert.strictEqual(order.status, 'paid');
    assert.strictEqual(order.mpesaReference, 'SDA9912KL3');
    assert.ok(order.downloadToken);
    assert.strictEqual(order.downloadToken.length, 64); // 32-byte hex token
    assert.ok(order.downloadExpiresAt);

    // Verify 30-day expiration window
    const now = Date.now();
    const expiry = new Date(order.downloadExpiresAt).getTime();
    const daysDiff = (expiry - now) / (1000 * 3600 * 24);
    assert.ok(daysDiff >= 29 && daysDiff <= 31);

    // Verify seller splits are marked settled
    assert.ok(order.sellerSplits.every((s) => s.payoutStatus === 'settled'));
  });

  it('enforces idempotency: duplicate callbacks are safely dropped without double crediting', async () => {
    const { order, attempt } = createPendingOrder({
      photoIds: ['photo_mar_1'],
      customerPhone: '0705334221',
      customerEmail: 'runner@gmail.com',
    });

    const stk = await initiateMpesaStkPush({
      orderId: order.id,
      attemptId: attempt.id,
    });

    // 1st Callback: Success
    const firstCall = processMpesaCallback({
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
      resultCode: 0,
      resultDesc: 'Success',
      mpesaReceipt: 'QDF1122MAR',
      amount: order.totalKes,
    });

    assert.strictEqual(firstCall.status, 'paid');

    // 2nd Callback: Identical Duplicate Callback
    const duplicateCall = processMpesaCallback({
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
      resultCode: 0,
      resultDesc: 'Success',
      mpesaReceipt: 'QDF1122MAR',
      amount: order.totalKes,
    });

    assert.strictEqual(duplicateCall.success, true);
    assert.strictEqual(duplicateCall.status, 'duplicate_ignored');
    assert.strictEqual(duplicateCall.order?.id, order.id);
  });

  it('quarantines transactions where callback amount does not match authoritative order total', async () => {
    const { order, attempt } = createPendingOrder({
      photoIds: ['photo_uon_1', 'photo_uon_2'], // Total: 500 KES
      customerPhone: '0712345678',
      customerEmail: 'tamper@test.com',
    });

    const stk = await initiateMpesaStkPush({
      orderId: order.id,
      attemptId: attempt.id,
    });

    // Simulated callback reporting KES 100 instead of KES 500
    const tamperedCallback = processMpesaCallback({
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
      resultCode: 0,
      resultDesc: 'Success',
      mpesaReceipt: 'FAKE100REC',
      amount: 100, // Altered amount!
    });

    assert.strictEqual(tamperedCallback.success, false);
    assert.strictEqual(tamperedCallback.status, 'amount_mismatch_quarantined');
    assert.strictEqual(order.status, 'quarantined');
    assert.strictEqual(order.downloadToken, undefined); // NO download token granted!
  });

  it('records failed or cancelled M-Pesa transactions and prevents photo access', async () => {
    const { order, attempt } = createPendingOrder({
      photoIds: ['photo_uon_4'],
      customerPhone: '0712345678',
      customerEmail: 'cancelled@test.com',
    });

    const stk = await initiateMpesaStkPush({
      orderId: order.id,
      attemptId: attempt.id,
    });

    // User cancelled on phone handset (Daraja ResultCode 1032)
    const cancelCallback = processMpesaCallback({
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
      resultCode: 1032,
      resultDesc: 'Request cancelled by user on mobile handset.',
    });

    assert.strictEqual(cancelCallback.success, false);
    assert.strictEqual(cancelCallback.status, 'failed');
    assert.strictEqual(order.status, 'failed');
    assert.strictEqual(attempt.status, 'cancelled');
    assert.strictEqual(order.downloadToken, undefined);
  });
});
