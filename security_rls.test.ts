import { describe, it, expect, beforeEach } from 'vitest';
import { SalonStore } from '../../src/services/store';
import { AppRole } from '../../src/types';
import { PERMISSIONS, hasPermission } from '../../src/lib/permissions';

describe('Base et Sécurité — Rôles, RLS et Restrictions Financières (Prompt 2)', () => {
  let store: SalonStore;

  beforeEach(() => {
    store = new SalonStore();
    store.setForcedOnline(true);
  });

  describe('Matrice des rôles et contrôle d\'accès', () => {
    it('permet au gérant d\'effectuer toutes les opérations sensibles', () => {
      const managerRole: AppRole = 'manager';
      expect(hasPermission(managerRole, PERMISSIONS.CREATE_SALE)).toBe(true);
      expect(hasPermission(managerRole, PERMISSIONS.CANCEL_SALE)).toBe(true);
      expect(hasPermission(managerRole, PERMISSIONS.PRICE_OVERRIDE)).toBe(true);
      expect(hasPermission(managerRole, PERMISSIONS.CREATE_COMMISSION_PAYMENT)).toBe(true);
      expect(hasPermission(managerRole, PERMISSIONS.VALIDATE_CLOSING)).toBe(true);
      expect(hasPermission(managerRole, PERMISSIONS.MANAGE_SERVICES)).toBe(true);
      expect(hasPermission(managerRole, PERMISSIONS.MANAGE_BARBERS)).toBe(true);
      expect(hasPermission(managerRole, PERMISSIONS.VIEW_AUDIT_LOGS)).toBe(true);
    });

    it('limite le caissier à l\'encaissement et interdit les opérations administratives et financières critiques', () => {
      const cashierRole: AppRole = 'cashier';
      expect(hasPermission(cashierRole, PERMISSIONS.CREATE_SALE)).toBe(true);
      expect(hasPermission(cashierRole, PERMISSIONS.VIEW_ALL_SALES)).toBe(true);

      // Accès strictement interdits au caissier
      expect(hasPermission(cashierRole, PERMISSIONS.PRICE_OVERRIDE)).toBe(false);
      expect(hasPermission(cashierRole, PERMISSIONS.CANCEL_SALE)).toBe(false);
      expect(hasPermission(cashierRole, PERMISSIONS.CREATE_COMMISSION_PAYMENT)).toBe(false);
      expect(hasPermission(cashierRole, PERMISSIONS.VALIDATE_CLOSING)).toBe(false);
      expect(hasPermission(cashierRole, PERMISSIONS.MANAGE_SERVICES)).toBe(false);
      expect(hasPermission(cashierRole, PERMISSIONS.MANAGE_BARBERS)).toBe(false);
      expect(hasPermission(cashierRole, PERMISSIONS.VIEW_AUDIT_LOGS)).toBe(false);
    });

    it('isole le barbier à la seule consultation de ses prestations et de son solde', () => {
      const barberRole: AppRole = 'barber';
      expect(hasPermission(barberRole, PERMISSIONS.CREATE_SALE)).toBe(false);
      expect(hasPermission(barberRole, PERMISSIONS.VIEW_ALL_SALES)).toBe(false);
      expect(hasPermission(barberRole, PERMISSIONS.VIEW_OWN_SALES)).toBe(true);
      expect(hasPermission(barberRole, PERMISSIONS.VIEW_OWN_COMMISSIONS)).toBe(true);
      expect(hasPermission(barberRole, PERMISSIONS.VIEW_ALL_COMMISSIONS)).toBe(false);
      expect(hasPermission(barberRole, PERMISSIONS.VALIDATE_CLOSING)).toBe(false);
      expect(hasPermission(barberRole, PERMISSIONS.MANAGE_SERVICES)).toBe(false);
    });
  });

  describe('Règles de sécurité transactionnelles côté serveur', () => {
    it('refuse formellement qu\'un caissier applique un tarif dérogatoire', () => {
      const barbers = store.getBarbers();
      const services = store.getServices();

      expect(() => {
        store.createSale({
          idempotencyKey: 'idemp-test-security-1',
          requestFingerprint: 'fp-security-1',
          barberId: barbers[0].id,
          serviceId: services[0].id,
          amountReceived: services[0].current_price - 1000, // Dérogatoire
          paymentMethod: 'cash',
          priceOverrideReason: 'Réduction amicale',
          actorRole: 'cashier', // Caissier
          actorId: 'cashier-1',
        });
      }).toThrowError(/Seul le gérant est autorisé à appliquer un tarif dérogatoire/);
    });

    it('refuse au gérant un tarif dérogatoire sans motif obligatoire', () => {
      const barbers = store.getBarbers();
      const services = store.getServices();

      expect(() => {
        store.createSale({
          idempotencyKey: 'idemp-test-security-2',
          requestFingerprint: 'fp-security-2',
          barberId: barbers[0].id,
          serviceId: services[0].id,
          amountReceived: services[0].current_price - 500, // Dérogatoire
          paymentMethod: 'cash',
          priceOverrideReason: '', // Motif vide
          actorRole: 'manager',
          actorId: 'manager-1',
        });
      }).toThrowError(/Un motif obligatoire doit être fourni/);
    });

    it('interdit à un caissier d\'annuler une vente', () => {
      const sales = store.getSales();
      const targetSale = sales[0];

      expect(() => {
        store.cancelSale(targetSale.id, 'Erreur de saisie client', 'cashier', 'cashier-1');
      }).toThrowError(/Seul le gérant peut annuler une vente/);
    });

    it('interdit à un caissier de verser des règlements de commissions', () => {
      const barbers = store.getBarbers();

      expect(() => {
        store.createCommissionPayment({
          barberId: barbers[0].id,
          amount: 1000,
          paymentMethod: 'cash',
          actorRole: 'cashier',
          actorId: 'cashier-1',
        });
      }).toThrowError(/Seul le gérant peut effectuer des règlements de commission/);
    });

    it('interdit à un caissier de certifier la clôture journalière', () => {
      expect(() => {
        store.validateCashClosing({
          businessDate: '2026-11-10',
          openingCash: 5000,
          countedCash: 25000,
          actorRole: 'cashier',
          actorId: 'cashier-1',
        });
      }).toThrowError(/Seul le gérant peut valider la clôture/);
    });

    it('interdit formellement toute vente lorsque la connexion Internet est perdue', () => {
      store.setForcedOnline(false); // Simule la coupure réseau 4G
      const barbers = store.getBarbers();
      const services = store.getServices();

      expect(() => {
        store.createSale({
          idempotencyKey: 'idemp-test-offline',
          requestFingerprint: 'fp-offline',
          barberId: barbers[0].id,
          serviceId: services[0].id,
          amountReceived: services[0].current_price,
          paymentMethod: 'cash',
          actorRole: 'manager',
          actorId: 'manager-1',
        });
      }).toThrowError(/Connexion Internet indisponible.*hors ligne/);
    });
  });

  describe('Garantie d\'immuabilité et audit', () => {
    it('enregistre une trace inaltérable dans audit_logs lors d\'une opération sensible', () => {
      const initialLogsCount = store.getAuditLogs().length;
      const barbers = store.getBarbers();
      const services = store.getServices();

      store.createSale({
        idempotencyKey: 'idemp-audit-check',
        requestFingerprint: 'fp-audit-check',
        barberId: barbers[0].id,
        serviceId: services[0].id,
        amountReceived: services[0].current_price,
        paymentMethod: 'cash',
        actorRole: 'manager',
        actorId: 'manager-1',
      });

      const updatedLogs = store.getAuditLogs();
      expect(updatedLogs.length).toBe(initialLogsCount + 1);
      expect(updatedLogs[0].action).toBe('create_sale');
      expect(updatedLogs[0].entity_type).toBe('sale');
    });
  });
});
