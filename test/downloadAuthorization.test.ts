import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createPendingOrder,
  initiateMpesaStkPush,
  processMpesaCallback,
  verifyPhotoDownloadEntitlement,
  DB_ORDERS,
} from '../src/server/paymentEngine.js';

describe('Vault Server-Side Download Gatekeeper & Authorization Defense', () => {
  it('blocks download of original photo when order is unpaid (HTTP 403)', () => {
    const { order } = createPendingOrder({
      photoIds: ['photo_uon_1'],
      customerPhone: '0712345678',
      customerEmail: 'unpaid@test.com',
    });

    assert.strictEqual(order.status, 'pending');

    const result = verifyPhotoDownloadEntitlement({
      orderId: order.id,
      photoId: 'photo_uon_1',
      token: 'some_dummy_token',
    });

    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.statusCode, 403);
    assert.match(result.error || '', /Unpaid order/);
  });

  it('blocks download when download token is invalid or missing (HTTP 401)', async () => {
    const { order, attempt } = createPendingOrder({
      photoIds: ['photo_uon_2'],
      customerPhone: '0712345678',
      customerEmail: 'token.test@test.com',
    });

    const stk = await initiateMpesaStkPush({ orderId: order.id, attemptId: attempt.id });
    processMpesaCallback({
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
      resultCode: 0,
      resultDesc: 'Success',
      amount: order.totalKes,
    });

    assert.strictEqual(order.status, 'paid');

    // Attempt with forged token
    const forgedResult = verifyPhotoDownloadEntitlement({
      orderId: order.id,
      photoId: 'photo_uon_2',
      token: 'forged_fake_token_1234567890abcdef',
    });

    assert.strictEqual(forgedResult.allowed, false);
    assert.strictEqual(forgedResult.statusCode, 401);
    assert.match(forgedResult.error || '', /Invalid or missing download authorization token/);
  });

  it('blocks download when photo is NOT part of the purchased order (HTTP 403)', async () => {
    // Order only includes photo_uon_1
    const { order, attempt } = createPendingOrder({
      photoIds: ['photo_uon_1'],
      customerPhone: '0712345678',
      customerEmail: 'single@test.com',
    });

    const stk = await initiateMpesaStkPush({ orderId: order.id, attemptId: attempt.id });
    processMpesaCallback({
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
      resultCode: 0,
      resultDesc: 'Success',
      amount: order.totalKes,
    });

    // Customer tries to download unpurchased photo_wed_1 using valid order token
    const unpurchasedResult = verifyPhotoDownloadEntitlement({
      orderId: order.id,
      photoId: 'photo_wed_1',
      token: order.downloadToken!,
    });

    assert.strictEqual(unpurchasedResult.allowed, false);
    assert.strictEqual(unpurchasedResult.statusCode, 403);
    assert.match(unpurchasedResult.error || '', /Photo is not part of this purchased order/);
  });

  it('blocks download when token has expired beyond the 30-day window (HTTP 403)', async () => {
    const { order, attempt } = createPendingOrder({
      photoIds: ['photo_uon_3'],
      customerPhone: '0712345678',
      customerEmail: 'expired@test.com',
    });

    const stk = await initiateMpesaStkPush({ orderId: order.id, attemptId: attempt.id });
    processMpesaCallback({
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
      resultCode: 0,
      resultDesc: 'Success',
      amount: order.totalKes,
    });

    // Simulate expired token (35 days in past)
    order.downloadExpiresAt = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();

    const expiredResult = verifyPhotoDownloadEntitlement({
      orderId: order.id,
      photoId: 'photo_uon_3',
      token: order.downloadToken!,
    });

    assert.strictEqual(expiredResult.allowed, false);
    assert.strictEqual(expiredResult.statusCode, 403);
    assert.match(expiredResult.error || '', /Download token has expired/);
  });

  it('authorizes download when payment is verified and token is valid (HTTP 200)', async () => {
    const { order, attempt } = createPendingOrder({
      photoIds: ['photo_mar_2'],
      customerPhone: '0705334221',
      customerEmail: 'authorized@test.com',
    });

    const stk = await initiateMpesaStkPush({ orderId: order.id, attemptId: attempt.id });
    processMpesaCallback({
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
      resultCode: 0,
      resultDesc: 'Success',
      amount: order.totalKes,
    });

    const authorizedResult = verifyPhotoDownloadEntitlement({
      orderId: order.id,
      photoId: 'photo_mar_2',
      token: order.downloadToken!,
    });

    assert.strictEqual(authorizedResult.allowed, true);
    assert.strictEqual(authorizedResult.statusCode, 200);
    assert.ok(authorizedResult.photo);
    assert.strictEqual(authorizedResult.photo.code, 'MAR-202');
  });

  it('returns HTTP 404 for non-existent order or photo', () => {
    const missingOrderResult = verifyPhotoDownloadEntitlement({
      orderId: 'ord_non_existent_9999',
      photoId: 'photo_uon_1',
      token: 'any_token',
    });
    assert.strictEqual(missingOrderResult.statusCode, 404);
  });
});
