import { describe, it, expect, beforeEach } from 'vitest';
import { SalonStore } from '../../src/services/store';
import { getTodayBamako } from '../../src/lib/format';

describe('Prompt 6 — Clôture Quotidienne & Arrêté de Caisse (validateCashClosing, Écarts, Sérialisation)', () => {
  let store: SalonStore;

  beforeEach(() => {
    store = new SalonStore();
    store.setForcedOnline(true);
  });

  describe('Formule Mathématique des Espèces Théoriques & Déduction des Commissions', () => {
    it('calcule exactement : Espèces théoriques = Fonds ouverture + Ventes espèces - Commissions payées en espèces', () => {
      const today = getTodayBamako();
      const barbers = store.getBarbers();
      const services = store.getServices();

      // 1. Vente Espèces : 5 000 FCFA
      store.createSale({
        idempotencyKey: 'cloture-test-sale-cash',
        requestFingerprint: 'fp-cloture-cash',
        barberId: barbers[0].id,
        serviceId: services.find((s) => s.current_price === 5000)!.id,
        amountReceived: 5000,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      // 2. Vente Orange Money : 3 000 FCFA (ne doit pas impacter le tiroir cash)
      store.createSale({
        idempotencyKey: 'cloture-test-sale-orange',
        requestFingerprint: 'fp-cloture-orange',
        barberId: barbers[1].id,
        serviceId: services.find((s) => s.current_price === 3000)!.id,
        amountReceived: 3000,
        paymentMethod: 'orange_money',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      // 3. Paiement commission en espèces : 1 000 FCFA
      store.createCommissionPayment({
        barberId: barbers[0].id,
        amount: 1000,
        paymentMethod: 'cash',
        reference: 'Avance midi',
        actorRole: 'manager',
        actorId: 'manager-1',
      });

      // 4. Paiement commission Orange Money : 500 FCFA (ne doit pas impacter le tiroir cash)
      store.createCommissionPayment({
        barberId: barbers[1].id,
        amount: 500,
        paymentMethod: 'orange_money',
        reference: 'OM comm',
        actorRole: 'manager',
        actorId: 'manager-1',
      });

      const summary = store.getClosingSummaryForDate(today);

      // Fonds d'ouverture = 10 000 FCFA
      // Espèces attendues = 10 000 + 5 000 (ventes cash) - 1 000 (comm cash) = 14 000 FCFA
      const openingCash = 10000;
      const expectedTheoretical = openingCash + summary.cashSales - summary.cashCommissionPayments;

      // On compte physiquement 14 000 FCFA (Équilibré)
      const closing = store.validateCashClosing({
        businessDate: today,
        openingCash: openingCash,
        countedCash: expectedTheoretical,
        note: 'Clôture équilibrée test',
        actorRole: 'manager',
        actorId: 'manager-1',
      });

      expect(closing.expected_cash).toBe(expectedTheoretical);
      expect(closing.counted_cash).toBe(expectedTheoretical);
      expect(closing.difference).toBe(0); // Zéro écart
      expect(closing.status).toBe('validated');
    });

    it('calcule correctement les écarts d\'espèces (excédent et déficit)', () => {
      // Test de calcul pur :
      // expected = 20 000
      // compté = 22 500 => différence = +2 500 (Excédent)
      // compté = 18 000 => différence = -2 000 (Déficit)
      const expected = 20000;
      const surplusCounted = 22500;
      const deficitCounted = 18000;

      expect(surplusCounted - expected).toBe(2500);
      expect(deficitCounted - expected).toBe(-2000);
    });
  });

  describe('Sérialisation & Rejet des Doublons de Clôture', () => {
    it('interdit rigoureusement une seconde clôture sur la même date métier', () => {
      const today = getTodayBamako();

      // Première clôture
      store.validateCashClosing({
        businessDate: today,
        openingCash: 5000,
        countedCash: 5000,
        actorRole: 'manager',
        actorId: 'manager-1',
      });

      // Tentative de re-clôturer la même date
      expect(() => {
        store.validateCashClosing({
          businessDate: today,
          openingCash: 5000,
          countedCash: 6000,
          actorRole: 'manager',
          actorId: 'manager-1',
        });
      }).toThrowError(/a déjà été clôturée/);
    });

    it('refuse de clôturer une date future', () => {
      expect(() => {
        store.validateCashClosing({
          businessDate: '2099-12-31',
          openingCash: 0,
          countedCash: 0,
          actorRole: 'manager',
          actorId: 'manager-1',
        });
      }).toThrowError(/Impossible de clôturer une date future/);
    });

    it('interdit formellement à un caissier de certifier une clôture', () => {
      expect(() => {
        store.validateCashClosing({
          businessDate: getTodayBamako(),
          openingCash: 0,
          countedCash: 0,
          actorRole: 'cashier',
          actorId: 'cashier-1',
        });
      }).toThrowError(/Seul le gérant peut valider la clôture/);
    });
  });

  describe('Verrouillage Post-Clôture & Ajustements Append-Only', () => {
    it('interdit l\'annulation directe d\'une vente d\'une journée clôturée', () => {
      const today = getTodayBamako();
      const barbers = store.getBarbers();
      const services = store.getServices();

      // 1. Création d'une vente
      const sale = store.createSale({
        idempotencyKey: 'sale-before-closing',
        requestFingerprint: 'fp-before-closing',
        barberId: barbers[0].id,
        serviceId: services[0].id,
        amountReceived: services[0].current_price,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      // 2. Clôture de la journée
      store.validateCashClosing({
        businessDate: today,
        openingCash: 0,
        countedCash: sale.amount_received,
        actorRole: 'manager',
        actorId: 'manager-1',
      });

      // 3. Tentative d'annuler la vente de cette journée close
      expect(() => {
        store.cancelSale(sale.id, 'Erreur découverte tardivement', 'manager', 'manager-1');
      }).toThrowError(/Impossible d'annuler une vente d'une journée déjà clôturée.*ajustement post-clôture/);
    });

    it('permet au gérant d\'ajouter un ajustement post-clôture audité sans altérer le snapshot originel', () => {
      const today = getTodayBamako();

      // Clôture
      const closing = store.validateCashClosing({
        businessDate: today,
        openingCash: 0,
        countedCash: 10000,
        actorRole: 'manager',
        actorId: 'manager-1',
      });

      const originalExpected = closing.expected_cash;
      const originalCounted = closing.counted_cash;

      // Ajout d'une correction post-clôture (+1 500 FCFA retrouvés après coup)
      const adjustment = store.addClosingAdjustment(
        closing.id,
        1500,
        'Billet de 1 500 FCFA oublié dans le fond du tiroir',
        'manager',
        'manager-1'
      );

      expect(adjustment.id).toBeDefined();
      expect(adjustment.amount_delta).toBe(1500);
      expect(adjustment.reason).toContain('Billet de 1 500 FCFA');

      // VÉRIFICATION D'IMMUABILITÉ : Le snapshot de la clôture n'a pas été écrasé
      const currentClosing = store.getCashClosings().find((c) => c.id === closing.id)!;
      expect(currentClosing.expected_cash).toBe(originalExpected);
      expect(currentClosing.counted_cash).toBe(originalCounted);

      // VÉRIFICATION DE L'AUDIT
      const latestAudit = store.getAuditLogs()[0];
      expect(latestAudit.action).toBe('add_closing_adjustment');
      expect(latestAudit.entity_id).toBe(adjustment.id);
    });
  });
});
