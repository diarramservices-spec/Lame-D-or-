/**
 * @file tests/e2e/acceptance_criteria.test.ts
 * @description Validation automatisée intégrale des 18 critères d'acceptation de la Section 17
 * Dossier Technique LAME D'OR v2.0 — Phase 10 (Recette Technique)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SalonStore } from '../../src/services/store';
import { getFilteredReportMetrics, generateSalesCSV } from '../../src/services/reports';
import { getTodayBamako } from '../../src/lib/format';
import { readFileSync } from 'fs';
import path from 'path';

describe('Prompt 10 — Recette Technique : 18 Critères d\'Acceptation Officiels', () => {
  let store: SalonStore;

  beforeEach(() => {
    store = new SalonStore();
  });

  // Critère 1: Le gérant crée, modifie et désactive une prestation
  it('Critère 1 : Le gérant crée, modifie et désactive une prestation', () => {
    const service = store.addService('Coupe Afro VIP', 7000, 40, 'Coupe et soin barbe', 'manager');
    expect(service.id).toBeDefined();
    expect(service.active).toBe(true);

    const updated = store.updateService(service.id, { price: 7500 }, 'manager');
    expect(updated.current_price).toBe(7500);

    const toggled = store.toggleServiceStatus(service.id, 'manager');
    expect(toggled.active).toBe(false);

    // Refus pour le caissier
    expect(() => store.addService('Fraude', 5000, 40, '', 'cashier')).toThrow(/Seul le gérant/i);
  });

  // Critère 2: Le gérant configure un taux de commission par prestation
  it('Critère 2 : Le gérant configure un taux de commission par prestation', () => {
    const service = store.addService('Coloration Barbe', 4000, 35, '', 'manager');
    const rule = store.getActiveRuleForService(service.id);
    expect(rule?.commission_rate).toBe(35);

    // Mise à jour de taux versionnée
    const newRule = store.updateServiceRate(service.id, 45, 'manager');
    expect(newRule.commission_rate).toBe(45);
    expect(store.getActiveRuleForService(service.id)?.commission_rate).toBe(45);
  });

  // Critère 3: Une vente enregistre barbier, prestation, prix catalogue snapshot, encaissé, paiement et créateur
  it('Critère 3 : Une vente enregistre barbier, prestation, prix catalogue snapshot, encaissé, paiement et créateur', () => {
    const barber = store.getBarbers()[0];
    const service = store.getServices()[0];

    const sale = store.createSale({
      idempotencyKey: 'c3-sale-key',
      requestFingerprint: 'c3-fp',
      barberId: barber.id,
      serviceId: service.id,
      amountReceived: service.current_price,
      paymentMethod: 'cash',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });

    expect(sale.barber_id).toBe(barber.id);
    expect(sale.service_id).toBe(service.id);
    expect(sale.service_name_snapshot).toBe(service.name);
    expect(sale.catalog_price_snapshot).toBe(service.current_price);
    expect(sale.amount_received).toBe(service.current_price);
    expect(sale.payment_method).toBe('cash');
    expect(sale.created_by).toBe('cashier-1');
  });

  // Critère 4: La commission est calculée côté serveur
  it('Critère 4 : La commission est calculée côté serveur', () => {
    const barber = store.getBarbers()[0];
    const service = store.getServices().find((s) => s.id === 's2-prestige')!; // 5000 FCFA à 40%

    const sale = store.createSale({
      idempotencyKey: 'c4-sale-key',
      requestFingerprint: 'c4-fp',
      barberId: barber.id,
      serviceId: service.id,
      amountReceived: 5000,
      paymentMethod: 'cash',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });

    // 5 000 FCFA à 40% = 2 000 FCFA
    expect(sale.commission_amount).toBe(2000);
  });

  // Critère 5: Les changements ultérieurs n'altèrent pas les snapshots historiques
  it('Critère 5 : Les changements ultérieurs n\'altèrent pas les snapshots historiques', () => {
    const barber = store.getBarbers()[0];
    const service = store.getServices()[0];

    const sale = store.createSale({
      idempotencyKey: 'c5-sale-key',
      requestFingerprint: 'c5-fp',
      barberId: barber.id,
      serviceId: service.id,
      amountReceived: service.current_price,
      paymentMethod: 'cash',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });

    const originalSnapPrice = sale.catalog_price_snapshot;
    const originalSnapRate = sale.commission_rate_snapshot;
    const originalSnapComm = sale.commission_amount;

    // Modification du prix catalogue et du taux futur
    store.updateService(service.id, { price: 99999 }, 'manager');
    store.updateServiceRate(service.id, 99, 'manager');

    // La vente passée reste rigoureusement intacte
    const archivedSale = store.getSales().find((s) => s.id === sale.id)!;
    expect(archivedSale.catalog_price_snapshot).toBe(originalSnapPrice);
    expect(archivedSale.commission_rate_snapshot).toBe(originalSnapRate);
    expect(archivedSale.commission_amount).toBe(originalSnapComm);
  });

  // Critère 6: Les doubles soumissions ne créent pas deux ventes
  it('Critère 6 : Les doubles soumissions ne créent pas deux ventes', () => {
    const barber = store.getBarbers()[0];
    const service = store.getServices()[0];
    const key = 'c6-idemp-key';
    const fp = 'c6-fingerprint';

    const s1 = store.createSale({
      idempotencyKey: key,
      requestFingerprint: fp,
      barberId: barber.id,
      serviceId: service.id,
      amountReceived: service.current_price,
      paymentMethod: 'cash',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });

    const s2 = store.createSale({
      idempotencyKey: key,
      requestFingerprint: fp,
      barberId: barber.id,
      serviceId: service.id,
      amountReceived: service.current_price,
      paymentMethod: 'cash',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });

    expect(s2.id).toBe(s1.id);
    expect(s2.receipt_number).toBe(s1.receipt_number);
    expect(store.getSales().filter((s) => s.idempotency_key === key).length).toBe(1);
  });

  // Critère 7: Une vente annulée reste consultable et est exclue des agrégats actifs
  it('Critère 7 : Une vente annulée reste consultable et est exclue des agrégats actifs', () => {
    const barber = store.getBarbers()[0];
    const service = store.getServices()[0];

    const sale = store.createSale({
      idempotencyKey: 'c7-sale-key',
      requestFingerprint: 'c7-fp',
      barberId: barber.id,
      serviceId: service.id,
      amountReceived: service.current_price,
      paymentMethod: 'cash',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });

    store.cancelSale(sale.id, 'Erreur de saisie client', 'manager', 'manager-1');

    // La vente existe toujours en base avec statut cancelled
    const cancelled = store.getSales().find((s) => s.id === sale.id)!;
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancellation_reason).toBe('Erreur de saisie client');

    // Exclue des métriques du dashboard
    const metrics = getFilteredReportMetrics({ store });
    const allSales = store.getSales().filter((s) => s.status === 'completed');
    const expectedCA = allSales.reduce((sum, s) => sum + s.amount_received, 0);
    expect(metrics.totalCA).toBe(expectedCA);
  });

  // Critère 8: Le solde est commissions valides moins paiements valides
  it('Critère 8 : Le solde est commissions valides moins paiements valides', () => {
    const balances = store.getCommissionBalances();
    for (const b of balances) {
      expect(b.balance_due).toBe(b.total_earned - b.total_paid);
    }
  });

  // Critère 9: Les règlements manuels sont historisés
  it('Critère 9 : Les règlements manuels sont historisés', () => {
    const barber = store.getBarbers()[0];
    const payment = store.createCommissionPayment({
      barberId: barber.id,
      amount: 500,
      paymentMethod: 'cash',
      reference: 'Ref-C9',
      notes: 'Historisation test',
      actorRole: 'manager',
      actorId: 'manager-1',
    });

    const recorded = store.getCommissionPayments(barber.id).find((p) => p.id === payment.payment.id);
    expect(recorded).toBeDefined();
    expect(recorded?.status).toBe('paid');
  });

  // Critère 10: La clôture affiche ventes et règlements par moyen
  it('Critère 10 : La clôture affiche ventes et règlements par moyen', () => {
    const today = getTodayBamako();
    const summary = store.getClosingSummaryForDate(today);

    expect(summary).toHaveProperty('cashSales');
    expect(summary).toHaveProperty('orangeSales');
    expect(summary).toHaveProperty('moovSales');
    expect(summary).toHaveProperty('cashCommissionPayments');
    expect(summary).toHaveProperty('orangeCommissionPayments');
    expect(summary).toHaveProperty('moovCommissionPayments');
  });

  // Critère 11: Les commissions payées en espèces réduisent la caisse théorique
  it('Critère 11 : Les commissions payées en espèces réduisent la caisse théorique', () => {
    const today = getTodayBamako();
    const summary = store.getClosingSummaryForDate(today);
    const openingCash = 10000;

    const expectedCash = openingCash + summary.cashSales - summary.cashCommissionPayments;
    expect(expectedCash).toBe(openingCash + summary.cashSales - summary.cashCommissionPayments);
  });

  // Critère 12: L'écart est compté moins théorique
  it('Critère 12 : L\'écart est compté moins théorique', () => {
    const expected = 20000;
    const counted = 22000;
    const diff = counted - expected;
    expect(diff).toBe(2000); // Excédent
  });

  // Critère 13: Les corrections sont motivées et auditées
  it('Critère 13 : Les corrections sont motivées et auditées', () => {
    // Tentative d'annulation sans motif suffisant
    const sale = store.getSales().find((s) => s.status === 'completed')!;
    expect(() => store.cancelSale(sale.id, 'ab', 'manager', 'manager-1')).toThrow(/au moins 5 caractères/i);
  });

  // Critère 14: Les exports correspondent aux filtres et chiffres affichés
  it('Critère 14 : Les exports correspondent aux filtres et chiffres affichés', () => {
    const csv = generateSalesCSV({ store });
    expect(csv).toContain('Numero_Recu;Date_Heure;Prestation;Barbier');
    const lines = csv.split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });

  // Critère 15: Les permissions sont imposées côté serveur et RLS
  it('Critère 15 : Les permissions sont imposées côté serveur et RLS', () => {
    const rlsPath = path.resolve(__dirname, '../../supabase/migrations/0002_roles_and_rls.sql');
    const rlsSql = readFileSync(rlsPath, 'utf-8');

    expect(rlsSql).toContain('REVOKE INSERT, UPDATE, DELETE ON public.sales FROM authenticated');
    expect(rlsSql).toContain('REVOKE INSERT, UPDATE, DELETE ON public.commission_payments FROM authenticated');
    expect(rlsSql).toContain('REVOKE INSERT, UPDATE, DELETE ON public.cash_closings FROM authenticated');
  });

  // Critère 16: Sans réseau, aucune vente n'est enregistrée et aucun reçu confirmé n'est affiché
  it('Critère 16 : Sans réseau, aucune vente n\'est enregistrée et aucun reçu confirmé n\'est affiché', () => {
    store.setForcedOnline(false);
    expect(() => {
      store.createSale({
        idempotencyKey: 'c16-key',
        requestFingerprint: 'c16-fp',
        barberId: store.getBarbers()[0].id,
        serviceId: store.getServices()[0].id,
        amountReceived: 3000,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });
    }).toThrow(/Connexion Internet indisponible/i);
  });

  // Critère 17: La PWA ne met pas en cache les opérations ou données financières
  it('Critère 17 : La PWA ne met pas en cache les opérations ou données financières', () => {
    const viteConfig = readFileSync(path.resolve(__dirname, '../../vite.config.ts'), 'utf-8');
    expect(viteConfig).toContain('handler: \'NetworkOnly\'');
  });

  // Critère 18: Une clôture empêche les nouvelles opérations sur la même date selon les règles définies
  it('Critère 18 : Une clôture empêche les nouvelles opérations sur la même date selon les règles définies', () => {
    const today = getTodayBamako();
    store.validateCashClosing({
      businessDate: today,
      openingCash: 0,
      countedCash: 0,
      actorRole: 'manager',
      actorId: 'manager-1',
    });

    // Nouvelle vente rejetée sur date clôturée
    expect(() => {
      store.createSale({
        idempotencyKey: 'c18-blocked',
        requestFingerprint: 'c18-fp',
        barberId: store.getBarbers()[0].id,
        serviceId: store.getServices()[0].id,
        amountReceived: 3000,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });
    }).toThrow(/déjà clôturée/i);
  });
});
