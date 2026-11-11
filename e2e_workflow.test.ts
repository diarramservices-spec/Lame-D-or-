/**
 * @file tests/e2e/e2e_workflow.test.ts
 * @description Suite de tests E2E complète selon les critères du Dossier Technique LAME D'OR v2.0
 * Référence : Section 15 et Section 23 (Prompt 9)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SalonStore } from '../../src/services/store';
import { getFilteredReportMetrics, generateSalesCSV } from '../../src/services/reports';
import { getTodayBamako } from '../../src/lib/format';

describe('Prompt 9 — Suite de Recette E2E LAME D\'OR', () => {
  let store: SalonStore;

  beforeEach(() => {
    store = new SalonStore();
  });

  it('E2E Scénario Complet : Parcours opérationnel d\'une journée de salon', () => {
    // 1. Gérant crée une nouvelle prestation et configure son taux de commission
    const newService = store.addService(
      'Soin Capillaire Royal',
      10000,
      45,
      'Traitement complet aux huiles précieuses et massage cuir chevelu',
      'manager'
    );
    expect(newService.id).toBeDefined();
    expect(newService.current_price).toBe(10000);

    const activeRule = store.getActiveRuleForService(newService.id);
    expect(activeRule).toBeDefined();
    expect(activeRule!.commission_rate).toBe(45);

    // 2. Caissier saisit une vente en espèces
    const barberIbrahim = store.getBarbers().find((b) => b.id === 'b1-ibrahim')!;
    const barberMamadou = store.getBarbers().find((b) => b.id === 'b2-mamadou')!;

    const saleCash = store.createSale({
      idempotencyKey: 'e2e-sale-cash-1',
      requestFingerprint: 'fp-e2e-cash-1',
      barberId: barberIbrahim.id,
      serviceId: newService.id,
      amountReceived: 10000,
      paymentMethod: 'cash',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });

    expect(saleCash.receipt_number).toMatch(/^REC-/);
    expect(saleCash.status).toBe('completed');
    expect(saleCash.amount_received).toBe(10000);
    // Commission serveur 45% de 10 000 = 4 500 FCFA
    expect(saleCash.commission_amount).toBe(4500);

    // 3. Ventes Orange Money et Moov Money
    const saleOrange = store.createSale({
      idempotencyKey: 'e2e-sale-orange-2',
      requestFingerprint: 'fp-e2e-orange-2',
      barberId: barberMamadou.id,
      serviceId: newService.id,
      amountReceived: 10000,
      paymentMethod: 'orange_money',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });
    expect(saleOrange.payment_method).toBe('orange_money');
    expect(saleOrange.commission_amount).toBe(4500);

    const saleMoov = store.createSale({
      idempotencyKey: 'e2e-sale-moov-3',
      requestFingerprint: 'fp-e2e-moov-3',
      barberId: barberIbrahim.id,
      serviceId: newService.id,
      amountReceived: 10000,
      paymentMethod: 'moov_money',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });
    expect(saleMoov.payment_method).toBe('moov_money');
    expect(saleMoov.commission_amount).toBe(4500);

    // 4. Dashboard reflète fidèlement les ventes enregistrées
    const metricsToday = getFilteredReportMetrics({ period: 'today', store });
    expect(metricsToday.totalCA).toBe(46000); // 16 000 initial + 30 000 new
    expect(metricsToday.salesCount).toBe(6); // 3 initial + 3 new
    expect(metricsToday.totalCash).toBe(23000); // 13 000 initial + 10 000 new
    expect(metricsToday.totalOrange).toBe(13000); // 3 000 initial + 10 000 new
    expect(metricsToday.totalMoov).toBe(10000); // 0 initial + 10 000 new
    expect(metricsToday.totalCommissionsEarned).toBe(19100); // 5 600 initial + 13 500 new

    // 5. Gérant règle une commission à Ibrahim
    // Ibrahim a généré : 2000 (sale-101) + 4500 (saleCash) + 4500 (saleMoov) = 11 000 FCFA
    // Moins acompte déjà payé (pay-201) = 1000 FCFA => Solde dû = 10 000 FCFA
    const balances = store.getCommissionBalances();
    const ibrahimBal = balances.find((b) => b.barber_id === barberIbrahim.id)!;
    expect(ibrahimBal.balance_due).toBe(10000);

    // Paiement partiel en espèces : 5000 FCFA
    const payment = store.createCommissionPayment({
      barberId: barberIbrahim.id,
      amount: 5000,
      paymentMethod: 'cash',
      reference: 'Acompte matin',
      notes: 'Règlement espèces tiroir',
      actorRole: 'manager',
      actorId: 'manager-1',
    });
    expect(payment.newBalance).toBe(5000); // 10 000 - 5000 = 5 000 FCFA

    // 6. Gérant clôture la journée
    const today = getTodayBamako();
    const summaryBeforeClosing = store.getClosingSummaryForDate(today);
    expect(summaryBeforeClosing.cashSales).toBe(23000);
    expect(summaryBeforeClosing.cashCommissionPayments).toBe(6000); // 1000 initial (Ibrahim) + 5000 (Mamadou)

    // Formule espèces théoriques = ouverture (20 000) + cashSales (23 000) - cashCommissionPayments (6 000) = 37 000 FCFA
    const openingCash = 20000;
    const countedCash = 37000; // Caisse parfaitement équilibrée

    const closing = store.validateCashClosing({
      businessDate: today,
      openingCash,
      countedCash,
      note: 'Arrêté de caisse journalier certifié',
      actorRole: 'manager',
      actorId: 'manager-1',
    });

    expect(closing.expected_cash).toBe(37000);
    expect(closing.counted_cash).toBe(37000);
    expect(closing.difference).toBe(0);
    expect(closing.status).toBe('validated');

    // 7. Barbier consulte uniquement ses données
    const ibrahimSales = store.getSales(barberIbrahim.id);
    expect(ibrahimSales.length).toBe(3); // 1 initial (sale-101) + 2 new (saleCash, saleMoov)
    expect(ibrahimSales.every((s) => s.barber_id === barberIbrahim.id)).toBe(true);

    const mamadouSales = store.getSales(barberMamadou.id);
    expect(mamadouSales.length).toBe(2); // 1 initial (sale-102) + 1 new (saleOrange)
    expect(mamadouSales.every((s) => s.barber_id === barberMamadou.id)).toBe(true);

    // 8. Caissier tente une action gérant : refus strict
    expect(() => {
      store.addService('Prestation Frauduleuse', 5000, 50, '', 'cashier');
    }).toThrow(/Seul le gérant/i);

    expect(() => {
      store.validateCashClosing({
        businessDate: today,
        openingCash: 0,
        countedCash: 0,
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });
    }).toThrow(/Seul le gérant/i);

    expect(() => {
      store.createCommissionPayment({
        barberId: barberMamadou.id,
        amount: 1000,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });
    }).toThrow(/Seul le gérant/i);

    // 9. Exports CSV comparés à la source de données
    const csvContent = generateSalesCSV({ store });
    expect(csvContent).toContain('Numero_Recu;Date_Heure;Prestation;Barbier');
    expect(csvContent).toContain(saleCash.receipt_number);
    expect(csvContent).toContain(saleOrange.receipt_number);
    expect(csvContent).toContain(saleMoov.receipt_number);
    expect(csvContent).toContain('Soin Capillaire Royal');
  });
});
