import { describe, it, expect, beforeEach } from 'vitest';
import { SalonStore } from '../../src/services/store';
import { getTodayBamako } from '../../src/lib/format';

describe('Prompt 4 — Caisse & RPC createSale (Idempotence, Calcul Serveur, Double-Clic, Réseau)', () => {
  let store: SalonStore;

  beforeEach(() => {
    store = new SalonStore();
    store.setForcedOnline(true);
  });

  describe('Exécution transactionnelle de createSale', () => {
    it('relit les données actives côté serveur, calcule la commission et enregistre les snapshots immuables', () => {
      const barbers = store.getBarbers();
      const services = store.getServices();
      const targetService = services.find((s) => s.id === 's2-prestige')!; // 5000 FCFA, 40%
      const targetBarber = barbers[0];

      const sale = store.createSale({
        idempotencyKey: 'a1000000-0000-0000-0000-000000000001',
        requestFingerprint: 'fp-prestige-1',
        barberId: targetBarber.id,
        serviceId: targetService.id,
        amountReceived: targetService.current_price, // 5000 FCFA
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      expect(sale.id).toBeDefined();
      expect(sale.service_name_snapshot).toBe('Coupe + Barbe Prestige');
      expect(sale.catalog_price_snapshot).toBe(5000);
      expect(sale.commission_rate_snapshot).toBe(40);
      expect(sale.amount_received).toBe(5000);
      expect(sale.commission_amount).toBe(2000); // 5000 * 40% = 2000 FCFA
      expect(sale.receipt_number).toMatch(/^REC-\d{8}-\d{5}$/);
      expect(sale.status).toBe('completed');
    });

    it('refuse d\'enregistrer une vente si le barbier est inactif', () => {
      const barbers = store.getBarbers();
      const services = store.getServices();
      const barber = barbers[0];

      // Désactiver le barbier
      store.toggleBarberStatus(barber.id, 'manager');
      expect(store.getBarbers().find((b) => b.id === barber.id)?.active).toBe(false);

      expect(() => {
        store.createSale({
          idempotencyKey: 'a1000000-0000-0000-0000-000000000002',
          requestFingerprint: 'fp-inactive-barber',
          barberId: barber.id,
          serviceId: services[0].id,
          amountReceived: services[0].current_price,
          paymentMethod: 'cash',
          actorRole: 'cashier',
          actorId: 'cashier-1',
        });
      }).toThrowError(/Barbier introuvable ou inactif/);
    });

    it('refuse d\'enregistrer une vente si la prestation est inactive', () => {
      const barbers = store.getBarbers();
      const services = store.getServices();
      const service = services[0];

      // Désactiver la prestation
      store.toggleServiceStatus(service.id, 'manager');
      expect(store.getServices().find((s) => s.id === service.id)?.active).toBe(false);

      expect(() => {
        store.createSale({
          idempotencyKey: 'a1000000-0000-0000-0000-000000000003',
          requestFingerprint: 'fp-inactive-service',
          barberId: barbers[0].id,
          serviceId: service.id,
          amountReceived: service.current_price,
          paymentMethod: 'cash',
          actorRole: 'cashier',
          actorId: 'cashier-1',
        });
      }).toThrowError(/Prestation introuvable ou inactive/);
    });
  });

  describe('Protection Idempotence, Double-Clic et Retry', () => {
    it('gère le double-clic : retourne la vente existante sans dupliquer la transaction', () => {
      const barbers = store.getBarbers();
      const services = store.getServices();
      const countBefore = store.getSales().length;

      const idempotencyKey = 'a1000000-0000-0000-0000-000000000004';
      const fingerprint = 'fp-double-click-safe';

      // Premier clic
      const firstCall = store.createSale({
        idempotencyKey,
        requestFingerprint: fingerprint,
        barberId: barbers[0].id,
        serviceId: services[0].id,
        amountReceived: services[0].current_price,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      // Deuxième clic immédiat (même clé, même fingerprint)
      const secondCall = store.createSale({
        idempotencyKey,
        requestFingerprint: fingerprint,
        barberId: barbers[0].id,
        serviceId: services[0].id,
        amountReceived: services[0].current_price,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      expect(secondCall.id).toBe(firstCall.id);
      expect(secondCall.receipt_number).toBe(firstCall.receipt_number);
      // Le nombre total de ventes n'a augmenté que de 1
      expect(store.getSales().length).toBe(countBefore + 1);
    });

    it('rejette un retry si la même clé d\'idempotence est réutilisée avec un contenu altéré', () => {
      const barbers = store.getBarbers();
      const services = store.getServices();
      const idempotencyKey = 'a1000000-0000-0000-0000-000000000005';

      store.createSale({
        idempotencyKey,
        requestFingerprint: 'fp-payload-initial',
        barberId: barbers[0].id,
        serviceId: services[0].id,
        amountReceived: services[0].current_price,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      // Tentative frauduleuse de soumission avec la même clé mais fingerprint différent
      expect(() => {
        store.createSale({
          idempotencyKey,
          requestFingerprint: 'fp-payload-altered',
          barberId: barbers[1].id,
          serviceId: services[1].id,
          amountReceived: services[1].current_price,
          paymentMethod: 'orange_money',
          actorRole: 'cashier',
          actorId: 'cashier-1',
        });
      }).toThrowError(/Conflit d'idempotence : empreinte différente pour la même clé/);
    });
  });

  describe('Isolation et Verrouillage par Date Métier Clôturée', () => {
    it('refuse toute nouvelle vente si la date métier est déjà clôturée', () => {
      const barbers = store.getBarbers();
      const services = store.getServices();
      const today = getTodayBamako();

      // Le gérant clôture la date d'aujourd'hui
      store.validateCashClosing({
        businessDate: today,
        openingCash: 5000,
        countedCash: 20000,
        note: 'Clôture anticipée test',
        actorRole: 'manager',
        actorId: 'manager-1',
      });

      // Tentative d'ajouter une vente après clôture
      expect(() => {
        store.createSale({
          idempotencyKey: 'a1000000-0000-0000-0000-000000000006',
          requestFingerprint: 'fp-post-closing',
          barberId: barbers[0].id,
          serviceId: services[0].id,
          amountReceived: services[0].current_price,
          paymentMethod: 'cash',
          actorRole: 'cashier',
          actorId: 'cashier-1',
        });
      }).toThrowError(/La caisse est déjà clôturée pour le/);
    });
  });

  describe('Absence Totale de Mode Hors Ligne', () => {
    it('bloque instantanément la validation si la connexion est coupée', () => {
      store.setForcedOnline(false);
      const barbers = store.getBarbers();
      const services = store.getServices();
      const initialCount = store.getSales().length;

      expect(() => {
        store.createSale({
          idempotencyKey: 'a1000000-0000-0000-0000-000000000007',
          requestFingerprint: 'fp-offline-refusal',
          barberId: barbers[0].id,
          serviceId: services[0].id,
          amountReceived: services[0].current_price,
          paymentMethod: 'cash',
          actorRole: 'cashier',
          actorId: 'cashier-1',
        });
      }).toThrowError(/Connexion Internet indisponible.*hors ligne/);

      // Aucune ligne créée en mémoire
      expect(store.getSales().length).toBe(initialCount);
    });
  });
});
