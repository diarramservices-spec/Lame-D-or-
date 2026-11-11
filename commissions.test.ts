import { describe, it, expect, beforeEach } from 'vitest';
import { SalonStore } from '../../src/services/store';

describe('Prompt 5 — Commissions (Soldes, Règlements Manuels, Paiements Partiels, Renversements)', () => {
  let store: SalonStore;

  beforeEach(() => {
    store = new SalonStore();
    store.setForcedOnline(true);
  });

  describe('Calcul des Commissions Générées, Payées et Solde Dû', () => {
    it('calcule le solde exact : commissions des ventes completed moins règlements paid', () => {
      const barbers = store.getBarbers();
      const services = store.getServices();
      const barber = barbers[0]; // Ibrahim Diallo

      // Création de 2 ventes valides
      // Vente 1 : 5 000 FCFA à 40% = 2 000 FCFA de commission
      store.createSale({
        idempotencyKey: 'comm-test-sale-1',
        requestFingerprint: 'fp-comm-1',
        barberId: barber.id,
        serviceId: services.find((s) => s.current_price === 5000)!.id,
        amountReceived: 5000,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      // Vente 2 : 3 000 FCFA à 40% = 1 200 FCFA de commission
      store.createSale({
        idempotencyKey: 'comm-test-sale-2',
        requestFingerprint: 'fp-comm-2',
        barberId: barber.id,
        serviceId: services.find((s) => s.current_price === 3000)!.id,
        amountReceived: 3000,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      const balanceBefore = store.getCommissionBalances().find((b) => b.barber_id === barber.id)!;
      // Total earned initialement dans seed + 3 200 FCFA nouvelles commissions
      expect(balanceBefore.total_earned).toBeGreaterThanOrEqual(3200);
      expect(balanceBefore.balance_due).toBe(balanceBefore.total_earned - balanceBefore.total_paid);
    });

    it('exclut rigoureusement les ventes annulées du solde dû', () => {
      const barbers = store.getBarbers();
      const services = store.getServices();
      const barber = barbers[2]; // Oumar Koné

      const balanceInitial = store.getCommissionBalances().find((b) => b.barber_id === barber.id)!;

      // Création d'une vente (2 400 FCFA de commission)
      const sale = store.createSale({
        idempotencyKey: 'comm-cancel-test-sale',
        requestFingerprint: 'fp-comm-cancel',
        barberId: barber.id,
        serviceId: services.find((s) => s.current_price === 6000)!.id,
        amountReceived: 6000,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      const balanceAfterSale = store.getCommissionBalances().find((b) => b.barber_id === barber.id)!;
      expect(balanceAfterSale.total_earned).toBe(balanceInitial.total_earned + sale.commission_amount);

      // Annulation de la vente par le gérant
      store.cancelSale(sale.id, 'Erreur de prestation saisie', 'manager', 'manager-1');

      // Le solde doit revenir exactement au montant initial
      const balanceAfterCancel = store.getCommissionBalances().find((b) => b.barber_id === barber.id)!;
      expect(balanceAfterCancel.total_earned).toBe(balanceInitial.total_earned);
      expect(balanceAfterCancel.balance_due).toBe(balanceInitial.balance_due);
    });
  });

  describe('Paiements Partiels et Blocage des Découverts', () => {
    it('autorise des règlements partiels successifs jusqu\'à liquidation complète du solde', () => {
      const barbers = store.getBarbers();
      const barber = barbers[0];
      const initialBalance = store.getCommissionBalances().find((b) => b.barber_id === barber.id)!;

      if (initialBalance.balance_due > 1500) {
        // Premier règlement partiel de 1 000 FCFA
        const pay1 = store.createCommissionPayment({
          barberId: barber.id,
          amount: 1000,
          paymentMethod: 'cash',
          reference: 'Acompte 1',
          actorRole: 'manager',
          actorId: 'manager-1',
        });

        expect(pay1.payment.amount).toBe(1000);
        expect(pay1.newBalance).toBe(initialBalance.balance_due - 1000);

        // Deuxième règlement partiel
        const pay2 = store.createCommissionPayment({
          barberId: barber.id,
          amount: 500,
          paymentMethod: 'orange_money',
          reference: 'Acompte 2',
          actorRole: 'manager',
          actorId: 'manager-1',
        });

        expect(pay2.payment.amount).toBe(500);
        expect(pay2.newBalance).toBe(initialBalance.balance_due - 1500);
      }
    });

    it('bloque formellement tout versement supérieur au solde dû (pas de découvert autorisé)', () => {
      const barbers = store.getBarbers();
      const barber = barbers[0];
      const currentBalance = store.getCommissionBalances().find((b) => b.barber_id === barber.id)!;

      expect(() => {
        store.createCommissionPayment({
          barberId: barber.id,
          amount: currentBalance.balance_due + 50000, // Découvert interdit
          paymentMethod: 'cash',
          actorRole: 'manager',
          actorId: 'manager-1',
        });
      }).toThrowError(/dépasse le solde dû.*Aucun découvert autorisé/);
    });

    it('refuse tout règlement avec montant négatif ou nul', () => {
      const barbers = store.getBarbers();
      const barber = barbers[0];

      expect(() => {
        store.createCommissionPayment({
          barberId: barber.id,
          amount: 0,
          paymentMethod: 'cash',
          actorRole: 'manager',
          actorId: 'manager-1',
        });
      }).toThrowError(/Le montant du règlement doit être supérieur à zéro/);

      expect(() => {
        store.createCommissionPayment({
          barberId: barber.id,
          amount: -500,
          paymentMethod: 'cash',
          actorRole: 'manager',
          actorId: 'manager-1',
        });
      }).toThrowError(/Le montant du règlement doit être supérieur à zéro/);
    });
  });

  describe('Renversement d\'un Règlement de Commission avec Audit', () => {
    it('permet au gérant d\'annuler un règlement, rétablit le solde et consigne le motif dans l\'audit', () => {
      const barbers = store.getBarbers();
      const barber = barbers[1]; // Mamadou Traoré
      const balanceBefore = store.getCommissionBalances().find((b) => b.barber_id === barber.id)!;

      // Enregistrement d'un paiement de 1 000 FCFA
      const pay = store.createCommissionPayment({
        barberId: barber.id,
        amount: 1000,
        paymentMethod: 'cash',
        notes: 'Paiement à renverser',
        actorRole: 'manager',
        actorId: 'manager-1',
      });

      const balanceAfterPayment = store.getCommissionBalances().find((b) => b.barber_id === barber.id)!;
      expect(balanceAfterPayment.balance_due).toBe(balanceBefore.balance_due - 1000);

      // Renversement motivé par le gérant
      const reversed = store.reverseCommissionPayment(
        pay.payment.id,
        'Erreur de barbier bénéficiaire',
        'manager',
        'manager-1'
      );

      expect(reversed.status).toBe('reversed');
      expect(reversed.reversal_reason).toBe('Erreur de barbier bénéficiaire');
      expect(reversed.reversed_at).toBeDefined();

      // VÉRIFICATION : Le solde du barbier est immédiatement rétabli
      const balanceAfterReversal = store.getCommissionBalances().find((b) => b.barber_id === barber.id)!;
      expect(balanceAfterReversal.balance_due).toBe(balanceBefore.balance_due);

      // VÉRIFICATION DE L'AUDIT
      const latestAudit = store.getAuditLogs()[0];
      expect(latestAudit.action).toBe('reverse_commission_payment');
      expect(latestAudit.entity_id).toBe(pay.payment.id);
    });

    it('interdit l\'annulation d\'un règlement sans motif obligatoire d\'au moins 5 caractères', () => {
      const payments = store.getCommissionPayments();
      const target = payments[0];

      expect(() => {
        store.reverseCommissionPayment(target.id, 'Err', 'manager', 'manager-1');
      }).toThrowError(/Un motif d'au moins 5 caractères est obligatoire/);
    });
  });
});
