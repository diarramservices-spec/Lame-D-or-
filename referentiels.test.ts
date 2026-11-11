import { describe, it, expect, beforeEach } from 'vitest';
import { SalonStore } from '../../src/services/store';

describe('Prompt 3 — Référentiels (Barbiers, Prestations, Taux Versionnés & Snapshots)', () => {
  let store: SalonStore;

  beforeEach(() => {
    store = new SalonStore();
    store.setForcedOnline(true);
  });

  describe('Administration des Barbiers (Gérant uniquement)', () => {
    it('permet au gérant de créer un barbier avec audit', () => {
      const initialLogs = store.getAuditLogs().length;
      const newBarber = store.addBarber('Seydou Keita', '+223 71 22 33 44', 'manager');

      expect(newBarber.id).toBeDefined();
      expect(newBarber.full_name).toBe('Seydou Keita');
      expect(newBarber.active).toBe(true);

      const logs = store.getAuditLogs();
      expect(logs.length).toBe(initialLogs + 1);
      expect(logs[0].action).toBe('create_barber');
      expect(logs[0].entity_id).toBe(newBarber.id);
    });

    it('interdit à un caissier d\'ajouter un barbier', () => {
      expect(() => {
        store.addBarber('Fraudeur', '+223 00 00 00 00', 'cashier');
      }).toThrowError(/Seul le gérant peut ajouter un barbier/);
    });

    it('permet au gérant de modifier les coordonnées d\'un barbier avec trace d\'audit', () => {
      const barbers = store.getBarbers();
      const target = barbers[0];

      const updated = store.updateBarber(target.id, 'Ibrahim Diallo Modifié', '+223 77 77 77 77', 'manager');
      expect(updated.full_name).toBe('Ibrahim Diallo Modifié');
      expect(updated.phone).toBe('+223 77 77 77 77');

      const logs = store.getAuditLogs();
      expect(logs[0].action).toBe('update_barber');
      expect((logs[0].old_values as { full_name: string }).full_name).toBe('Ibrahim Diallo');
    });

    it('interdit au caissier de modifier un barbier ou de changer son statut', () => {
      const barbers = store.getBarbers();
      expect(() => {
        store.updateBarber(barbers[0].id, 'Tentative', '', 'cashier');
      }).toThrowError(/Seul le gérant peut modifier un barbier/);

      expect(() => {
        store.toggleBarberStatus(barbers[0].id, 'cashier');
      }).toThrowError(/Seul le gérant peut modifier le statut d'un barbier/);
    });
  });

  describe('Administration des Prestations & Versionnement des Commissions', () => {
    it('permet au gérant de créer une prestation avec son taux de commission initial', () => {
      const service = store.addService(
        'Soin Barbe & Vapeur Eucalyptus',
        4000,
        45,
        'Traitement hydratant et rasage au coupe-chou',
        'manager'
      );

      expect(service.name).toBe('Soin Barbe & Vapeur Eucalyptus');
      expect(service.current_price).toBe(4000);

      const activeRule = store.getActiveRuleForService(service.id);
      expect(activeRule).toBeDefined();
      expect(activeRule?.commission_rate).toBe(45);
      expect(activeRule?.valid_to).toBeUndefined();
    });

    it('interdit au caissier de créer une prestation ou de modifier un tarif', () => {
      expect(() => {
        store.addService('Prestation Illégale', 5000, 50, '', 'cashier');
      }).toThrowError(/Seul le gérant peut créer une prestation/);
    });

    it('versionne le taux de commission en archivant l\'ancien et en activant le nouveau', () => {
      const service = store.addService('Coupe Afro Contour', 3000, 35, '', 'manager');
      const initialRule = store.getActiveRuleForService(service.id);
      expect(initialRule?.commission_rate).toBe(35);

      // Le gérant décide d'augmenter le taux à 45%
      const newRule = store.updateServiceRate(service.id, 45, 'manager');
      expect(newRule.commission_rate).toBe(45);
      expect(newRule.valid_to).toBeUndefined();

      // Vérifier que l'ancienne règle a bien été clôturée avec un horodatage valid_to
      expect(initialRule?.valid_to).toBeDefined();

      // Vérifier que getActiveRuleForService renvoie la nouvelle règle
      const currentActive = store.getActiveRuleForService(service.id);
      expect(currentActive?.commission_rate).toBe(45);
      expect(currentActive?.id).toBe(newRule.id);
    });
  });

  describe('Garantie Absolue d\'Immuabilité des Snapshots Historiques', () => {
    it('ne modifie JAMAIS les snapshots d\'une vente existante lors du changement ultérieur du tarif catalogue ou du taux', () => {
      const barbers = store.getBarbers();
      const services = store.getServices();
      const targetService = services[0]; // Coupe Homme Classique (3 000 FCFA, 40%)

      // 1. Enregistrement d'une vente initiale
      const sale = store.createSale({
        idempotencyKey: 'idemp-snapshot-immutability-1',
        requestFingerprint: 'fp-immutability-1',
        barberId: barbers[0].id,
        serviceId: targetService.id,
        amountReceived: targetService.current_price, // 3 000 FCFA
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      expect(sale.catalog_price_snapshot).toBe(3000);
      expect(sale.commission_rate_snapshot).toBe(40);
      expect(sale.commission_amount).toBe(1200);

      // 2. Le gérant augmente le tarif de la prestation à 5 000 FCFA
      store.updateService(targetService.id, { price: 5000 }, 'manager');
      expect(store.getServices().find((s) => s.id === targetService.id)?.current_price).toBe(5000);

      // 3. Le gérant augmente également le taux de commission à 50%
      store.updateServiceRate(targetService.id, 50, 'manager');
      expect(store.getActiveRuleForService(targetService.id)?.commission_rate).toBe(50);

      // 4. VÉRIFICATION STRICTE : La vente antérieure n'a subi AUCUNE modification
      const recordedSale = store.getSales().find((s) => s.id === sale.id);
      expect(recordedSale).toBeDefined();
      expect(recordedSale?.catalog_price_snapshot).toBe(3000); // INCHANGÉ
      expect(recordedSale?.commission_rate_snapshot).toBe(40);   // INCHANGÉ
      expect(recordedSale?.commission_amount).toBe(1200);        // INCHANGÉ
      expect(recordedSale?.amount_received).toBe(3000);          // INCHANGÉ

      // 5. Une nouvelle vente utilise en revanche bien les nouveaux paramètres
      const newSale = store.createSale({
        idempotencyKey: 'idemp-snapshot-immutability-2',
        requestFingerprint: 'fp-immutability-2',
        barberId: barbers[0].id,
        serviceId: targetService.id,
        amountReceived: 5000,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      expect(newSale.catalog_price_snapshot).toBe(5000);
      expect(newSale.commission_rate_snapshot).toBe(50);
      expect(newSale.commission_amount).toBe(2500); // 5000 * 50% = 2500
    });
  });
});
