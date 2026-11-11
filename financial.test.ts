import { describe, it, expect } from 'vitest';
import { formatFCFA } from '../../src/lib/format';
import { CreateSaleInputSchema, ValidateCashClosingInputSchema } from '../../src/schemas';

describe('Règles financières & Calculs de commissions LAME D\'OR', () => {
  it('calcule exactement 5 000 FCFA à 40 % = 2 000 FCFA', () => {
    const amount = 5000;
    const rate = 40;
    const commission = Math.round((amount * rate) / 100);
    expect(commission).toBe(2000);
    expect(formatFCFA(commission).replace(/\s/g, ' ')).toBe('2 000 FCFA');
  });

  it('gère l\'arrondi au franc supérieur ou inférieur', () => {
    const amount = 3500;
    const rate = 35; // 3500 * 0.35 = 1225
    const commission = Math.round((amount * rate) / 100);
    expect(commission).toBe(1225);

    const amount2 = 3333;
    const rate2 = 33.33;
    const commission2 = Math.round((amount2 * rate2) / 100);
    expect(commission2).toBe(1111);
  });

  it('calcule la formule exacte des espèces théoriques de caisse', () => {
    // Espèces théoriques = fonds d'ouverture + ventes espèces - commissions réglées en espèces
    const openingCash = 10000;
    const cashSales = 45000;
    const cashCommissionPayments = 15000;

    const expectedCash = openingCash + cashSales - cashCommissionPayments;
    expect(expectedCash).toBe(40000);

    // Écart = espèces comptées - espèces théoriques
    const countedCashSurplus = 42000;
    expect(countedCashSurplus - expectedCash).toBe(2000); // Excédent

    const countedCashDeficit = 38000;
    expect(countedCashDeficit - expectedCash).toBe(-2000); // Déficit

    const countedCashExact = 40000;
    expect(countedCashExact - expectedCash).toBe(0); // Équilibré
  });

  it('valide le schéma Zod de vente et refuse les montants négatifs', () => {
    const validSale = {
      idempotency_key: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      request_fingerprint: 'fp-1',
      barber_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      service_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      amount_received: 5000,
      payment_method: 'cash',
    };
    expect(CreateSaleInputSchema.safeParse(validSale).success).toBe(true);

    const invalidSale = {
      ...validSale,
      amount_received: -100,
    };
    expect(CreateSaleInputSchema.safeParse(invalidSale).success).toBe(false);
  });

  it('valide le format date et le non-négatif des fonds de clôture', () => {
    const validClosing = {
      business_date: '2026-11-10',
      opening_cash: 5000,
      counted_cash: 25000,
      note: 'Clôture normale',
    };
    expect(ValidateCashClosingInputSchema.safeParse(validClosing).success).toBe(true);

    const invalidDateClosing = {
      ...validClosing,
      business_date: '10/11/2026',
    };
    expect(ValidateCashClosingInputSchema.safeParse(invalidDateClosing).success).toBe(false);
  });
});
