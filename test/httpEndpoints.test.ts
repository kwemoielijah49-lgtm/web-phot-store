import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { Server } from 'http';
import { paymentRouter, handleMpesaCallback } from '../src/server/paymentRoutes.js';

describe('Vault HTTP API Integration Endpoints', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/payments', paymentRouter);
    app.post('/api/mpesa/callback', handleMpesaCallback);
    app.use('/api', paymentRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('POST /api/payments/calculate returns authoritative order calculation', async () => {
    const res = await fetch(`${baseUrl}/api/payments/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoIds: ['photo_uon_1', 'photo_wed_1'], // 250 + 350 = 600 KES
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.subtotalKes, 600);
    assert.strictEqual(data.totalKes, 600);
    assert.strictEqual(data.commissionAmountKes, 60); // 10%
    assert.strictEqual(data.sellerSplits.length, 2);
  });

  it('POST /api/payments/initiate creates pending order and STK push attempt', async () => {
    const res = await fetch(`${baseUrl}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoIds: ['photo_uon_1'],
        customerPhone: '0712345678',
        customerEmail: 'api.test@example.com',
        customerName: 'API Tester',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.order.status, 'pending');
    assert.strictEqual(data.order.totalKes, 250);
    assert.ok(data.attempt.checkoutRequestId);
    assert.ok(data.order.orderNumber.startsWith('ORD-2026-'));
  });

  it('POST /api/mpesa/callback processes standard Safaricom Daraja JSON payload', async () => {
    // 1. Create order
    const initRes = await fetch(`${baseUrl}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoIds: ['photo_uon_2'],
        customerPhone: '0712345678',
        customerEmail: 'daraja.test@example.com',
      }),
    });
    const initData = await initRes.json();
    const checkoutReqId = initData.attempt.checkoutRequestId;

    // 2. Safaricom Daraja callback payload format
    const darajaPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: initData.attempt.merchantRequestId,
          CheckoutRequestID: checkoutReqId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 250 },
              { Name: 'MpesaReceiptNumber', Value: 'QDJ7881KL9' },
              { Name: 'TransactionDate', Value: 20261012140500 },
              { Name: 'PhoneNumber', Value: 254712345678 },
            ],
          },
        },
      },
    };

    const callbackRes = await fetch(`${baseUrl}/api/mpesa/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(darajaPayload),
    });

    assert.strictEqual(callbackRes.status, 200);
    const cbData = await callbackRes.json();
    assert.strictEqual(cbData.ResultCode, 0);
    assert.strictEqual(cbData.outcome.status, 'paid');

    // 3. Verify order via GET /api/payments/verify/:reference
    const verifyRes = await fetch(`${baseUrl}/api/payments/verify/${initData.order.id}`);
    assert.strictEqual(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.status, 'paid');
    assert.strictEqual(verifyData.mpesaReference, 'QDJ7881KL9');
    assert.ok(verifyData.downloadToken);

    // 4. Test download with valid token
    const downloadRes = await fetch(
      `${baseUrl}/api/photos/photo_uon_2/download?orderId=${initData.order.id}&token=${verifyData.downloadToken}`
    );
    assert.strictEqual(downloadRes.status, 200);

    // 5. Test download with invalid token is BLOCKED (401)
    const blockedRes = await fetch(
      `${baseUrl}/api/photos/photo_uon_2/download?orderId=${initData.order.id}&token=invalid_token_999`
    );
    assert.strictEqual(blockedRes.status, 401);
  });

  it('GET /api/photos/:photoId/download blocks unpurchased photos', async () => {
    // 1. Create order for photo_uon_1 only
    const initRes = await fetch(`${baseUrl}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoIds: ['photo_uon_1'],
        customerPhone: '0712345678',
        customerEmail: 'scope.test@example.com',
      }),
    });
    const initData = await initRes.json();

    // Trigger payment
    await fetch(`${baseUrl}/api/payments/sandbox-trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkoutRequestId: initData.attempt.checkoutRequestId,
        scenario: 'success',
      }),
    });

    const verifyRes = await fetch(`${baseUrl}/api/payments/verify/${initData.order.id}`);
    const verifyData = await verifyRes.json();

    // Try downloading photo_mar_1 (unpurchased) using valid token for photo_uon_1
    const unpurchasedDownload = await fetch(
      `${baseUrl}/api/photos/photo_mar_1/download?orderId=${initData.order.id}&token=${verifyData.downloadToken}`
    );
    assert.strictEqual(unpurchasedDownload.status, 403);
    const errJson = await unpurchasedDownload.json();
    assert.match(errJson.error, /Photo is not part of this purchased order/);
  });
});
