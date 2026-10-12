import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateAuthoritativeOrder,
  normalizeKenyanPhone,
  CATALOG_PHOTOS,
} from '../src/server/paymentEngine.js';

describe('Vault Commission & Multi-Seller Settlement Calculations', () => {
  it('correctly calculates 10% platform commission on single-photographer order', () => {
    // 2 graduation photos from David Mwangi: UON-001 (250 KES) + UON-002 (250 KES) = 500 KES
    const calc = calculateAuthoritativeOrder(['photo_uon_1', 'photo_uon_2']);

    assert.strictEqual(calc.subtotalKes, 500);
    assert.strictEqual(calc.totalKes, 500);
    // 10% of 500 = 50 KES
    assert.strictEqual(calc.commissionAmountKes, 50);
    assert.strictEqual(calc.sellerSplits.length, 1);

    const split = calc.sellerSplits[0];
    assert.strictEqual(split.photographerId, 'photo_mwangi_01');
    assert.strictEqual(split.grossAmountKes, 500);
    assert.strictEqual(split.commissionKes, 50);
    // Estimated processing fee (~1.5% of 500 = 8 KES) deducted from photographer proceeds
    assert.strictEqual(split.processingFeeKes, 8);
    // Net earnings: 500 - 50 - 8 = 442 KES
    assert.strictEqual(split.netEarningsKes, 442);
    // Zero-leakage check: Net + Commission + Processing Fee = Gross
    assert.strictEqual(split.netEarningsKes + split.commissionKes + split.processingFeeKes, split.grossAmountKes);
  });

  it('correctly calculates multi-seller order across different photographers without leakage', () => {
    // 1 photo from Mwangi (250 KES) + 1 photo from Amina (350 KES) + 1 photo from Kiprono (200 KES)
    // Total subtotal: 250 + 350 + 200 = 800 KES
    const calc = calculateAuthoritativeOrder(['photo_uon_1', 'photo_wed_1', 'photo_mar_1']);

    assert.strictEqual(calc.subtotalKes, 800);
    assert.strictEqual(calc.totalKes, 800);
    // 10% of 800 = 80 KES
    assert.strictEqual(calc.commissionAmountKes, 80);
    assert.strictEqual(calc.sellerSplits.length, 3);

    // Sum of split grosses must equal order total
    const totalSplitGross = calc.sellerSplits.reduce((sum, s) => sum + s.grossAmountKes, 0);
    assert.strictEqual(totalSplitGross, 800);

    // Sum of split commissions must equal platform commission
    const totalSplitCommission = calc.sellerSplits.reduce((sum, s) => sum + s.commissionKes, 0);
    assert.strictEqual(totalSplitCommission, 80);

    // Sum of split fees must equal total estimated fee
    const totalSplitFees = calc.sellerSplits.reduce((sum, s) => sum + s.processingFeeKes, 0);
    assert.strictEqual(totalSplitFees, calc.estimatedProcessingFeeKes);

    // Total proceeds reconciles with zero financial loss
    const totalNetEarnings = calc.sellerSplits.reduce((sum, s) => sum + s.netEarningsKes, 0);
    assert.strictEqual(totalNetEarnings + totalSplitCommission + totalSplitFees, calc.totalKes);
  });

  it('applies volume bundle discount and recalculates 10% commission on eligible subtotal', () => {
    // 5 photos (eligible for 15% volume discount)
    const photoIds = ['photo_uon_1', 'photo_uon_2', 'photo_uon_3', 'photo_uon_4', 'photo_mar_1'];
    // Subtotal: 250 + 250 + 250 + 250 + 200 = 1200 KES
    const calc = calculateAuthoritativeOrder(photoIds);

    assert.strictEqual(calc.subtotalKes, 1200);
    // 15% discount on 1200 = 180 KES
    assert.strictEqual(calc.discountKes, 180);
    // Total paid: 1200 - 180 = 1020 KES
    assert.strictEqual(calc.totalKes, 1020);
    // 10% commission on discounted customer total = 102 KES
    assert.strictEqual(calc.commissionAmountKes, 102);
  });

  it('rejects invalid photo IDs and protects against client-side price manipulation', () => {
    assert.throws(() => {
      calculateAuthoritativeOrder(['invalid_fake_photo_999']);
    }, /does not exist in catalog/);

    assert.throws(() => {
      calculateAuthoritativeOrder([]);
    }, /No photos specified/);
  });

  it('validates and formats Kenyan mobile phone numbers for M-Pesa STK push', () => {
    // Valid Safaricom formats
    assert.strictEqual(normalizeKenyanPhone('0712345678').formattedPhone, '254712345678');
    assert.strictEqual(normalizeKenyanPhone('254712345678').formattedPhone, '254712345678');
    assert.strictEqual(normalizeKenyanPhone('+254722458912').formattedPhone, '254722458912');
    assert.strictEqual(normalizeKenyanPhone('0110123456').formattedPhone, '254110123456');

    // Invalid formats
    assert.strictEqual(normalizeKenyanPhone('12345').isValid, false);
    assert.strictEqual(normalizeKenyanPhone('+14155552671').isValid, false); // US number
    assert.strictEqual(normalizeKenyanPhone('').isValid, false);
  });
});
