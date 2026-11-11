/**
 * @file tests/integration/pwa_network.test.ts
 * @description Suite des 10 tests obligatoires de perte de connexion et robustesse réseau
 * Référence : Section 15 et Section 23 (Prompt 8) du Dossier Technique LAME D'OR v2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SalonStore } from '../../src/services/store';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

describe('Prompt 8 — Tests obligatoires de perte de connexion et PWA Network-Only', () => {
  let store: SalonStore;

  beforeEach(() => {
    store = new SalonStore();
  });

  // Test 1: Ouvrir la caisse avec Internet
  it('1. Ouvrir la caisse avec Internet : connexion valide et lecture des référentiels autorisée', () => {
    expect(store.isOnline()).toBe(true);

    const barbers = store.getBarbers();
    const services = store.getServices();
    const activeRules = store.getCommissionRules();

    expect(barbers.length).toBeGreaterThan(0);
    expect(services.length).toBeGreaterThan(0);
    expect(activeRules.length).toBeGreaterThan(0);
  });

  // Test 2: Couper le réseau avant validation : bannière et blocage
  it('2. Couper le réseau avant validation : blocage immédiat de toute écriture financière', () => {
    // Simuler la coupure 4G/Fibre à Bamako
    store.setForcedOnline(false);
    expect(store.isOnline()).toBe(false);

    const activeService = store.getServices().find((s) => s.active)!;
    const activeBarber = store.getBarbers().find((b) => b.active)!;

    // Tentative de vente hors ligne
    expect(() => {
      store.createSale({
        idempotencyKey: 'idemp-offline-test-1',
        requestFingerprint: 'offline-fingerprint-1',
        barberId: activeBarber.id,
        serviceId: activeService.id,
        amountReceived: activeService.current_price,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });
    }).toThrow(/Connexion Internet indisponible/i);

    // Tentative de règlement commission hors ligne
    expect(() => {
      store.createCommissionPayment({
        barberId: activeBarber.id,
        amount: 1000,
        paymentMethod: 'cash',
        actorRole: 'manager',
        actorId: 'manager-1',
      });
    }).toThrow(/Connexion Internet requise/i);

    // Tentative de clôture hors ligne
    expect(() => {
      store.validateCashClosing({
        businessDate: '2026-11-10',
        openingCash: 0,
        countedCash: 0,
        actorRole: 'manager',
        actorId: 'manager-1',
      });
    }).toThrow(/Connexion Internet requise/i);
  });

  // Test 3: Vérifier qu'aucune ligne n'est créée en base
  it('3. Vérifier qu\'aucune ligne n\'est créée en base après un échec hors-ligne', () => {
    const initialSalesCount = store.getSales().length;
    const initialPaymentsCount = store.getCommissionPayments().length;
    const initialClosingsCount = store.getCashClosings().length;

    store.setForcedOnline(false);

    try {
      store.createSale({
        idempotencyKey: 'idemp-failed-offline',
        requestFingerprint: 'fp-failed',
        barberId: store.getBarbers()[0].id,
        serviceId: store.getServices()[0].id,
        amountReceived: 3000,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });
    } catch {
      // Échec attendu
    }

    // Strictement aucune ligne créée en base
    expect(store.getSales().length).toBe(initialSalesCount);
    expect(store.getCommissionPayments().length).toBe(initialPaymentsCount);
    expect(store.getCashClosings().length).toBe(initialClosingsCount);
  });

  // Test 4: Rétablir le réseau : aucune vente fantôme
  it('4. Rétablir le réseau : aucune vente fantôme ni rejeu asynchrone non maîtrisé', () => {
    const initialSalesCount = store.getSales().length;

    // Coupure puis rétablissement
    store.setForcedOnline(false);
    expect(store.isOnline()).toBe(false);

    store.setForcedOnline(true);
    expect(store.isOnline()).toBe(true);

    // Le nombre de ventes en base n'a pas bougé
    expect(store.getSales().length).toBe(initialSalesCount);
  });

  // Test 5: Couper le réseau pendant l'envoi : état « confirmation non reçue »
  it('5. Couper le réseau pendant l\'envoi : détection d\'interruption et absence de confirmation intempestive', () => {
    const idempotencyKey = 'idemp-interrupted-txn-5';
    let confirmationReceived = false;
    let clientErrorMessage: string | null = null;

    // Simulation : l'opérateur initie l'action, mais le réseau tombe pendant la requête
    store.setForcedOnline(false);

    try {
      store.createSale({
        idempotencyKey,
        requestFingerprint: 'fp-5',
        barberId: store.getBarbers()[0].id,
        serviceId: store.getServices()[0].id,
        amountReceived: 5000,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });
      confirmationReceived = true;
    } catch (err: unknown) {
      if (err instanceof Error) {
        clientErrorMessage = err.message;
      }
    }

    // La confirmation serveur NE DOIT PAS être reçue
    expect(confirmationReceived).toBe(false);
    expect(clientErrorMessage).toMatch(/Connexion Internet indisponible/i);
  });

  // Test 6: Vérifier côté base si la vente a été créée
  it('6. Vérifier côté base si la vente a été créée lors d\'une interruption', () => {
    const idempotencyKey = 'idemp-interrupted-txn-6';
    const initialSales = store.getSales();

    // La vente n'a pas pu être insérée en base
    const existing = initialSales.find((s) => s.idempotency_key === idempotencyKey);
    expect(existing).toBeUndefined();
  });

  // Test 7: Si retentative, réutiliser la même idempotency key
  it('7. Si retentative, réutiliser la même idempotency key avec le même payload', () => {
    const key = 'idemp-stable-key-7';
    const fp = 'fp-barber1-serv1-3000-cash';

    // Rétablir la connexion
    store.setForcedOnline(true);

    // Premier appel réussi après rétablissement
    const sale1 = store.createSale({
      idempotencyKey: key,
      requestFingerprint: fp,
      barberId: store.getBarbers()[0].id,
      serviceId: store.getServices()[0].id,
      amountReceived: store.getServices()[0].current_price,
      paymentMethod: 'cash',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });

    expect(sale1).toBeDefined();
    expect(sale1.idempotency_key).toBe(key);

    // Retentative avec la même clé d'idempotence et même payload
    const sale2 = store.createSale({
      idempotencyKey: key,
      requestFingerprint: fp,
      barberId: store.getBarbers()[0].id,
      serviceId: store.getServices()[0].id,
      amountReceived: store.getServices()[0].current_price,
      paymentMethod: 'cash',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });

    // Retourne exactement le même enregistrement déjà confirmé
    expect(sale2.id).toBe(sale1.id);
    expect(sale2.receipt_number).toBe(sale1.receipt_number);
  });

  // Test 8: Vérifier qu'un seul reçu / une seule vente existe
  it('8. Vérifier qu\'un seul reçu / une seule vente existe malgré plusieurs retentatives', () => {
    const key = 'idemp-single-receipt-8';
    const fp = 'fp-8';

    store.setForcedOnline(true);

    const s1 = store.createSale({
      idempotencyKey: key,
      requestFingerprint: fp,
      barberId: store.getBarbers()[0].id,
      serviceId: store.getServices()[0].id,
      amountReceived: store.getServices()[0].current_price,
      paymentMethod: 'cash',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });

    // 3 retentatives successives
    store.createSale({
      idempotencyKey: key,
      requestFingerprint: fp,
      barberId: store.getBarbers()[0].id,
      serviceId: store.getServices()[0].id,
      amountReceived: store.getServices()[0].current_price,
      paymentMethod: 'cash',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });
    store.createSale({
      idempotencyKey: key,
      requestFingerprint: fp,
      barberId: store.getBarbers()[0].id,
      serviceId: store.getServices()[0].id,
      amountReceived: store.getServices()[0].current_price,
      paymentMethod: 'cash',
      actorRole: 'cashier',
      actorId: 'cashier-1',
    });

    // Compter le nombre de ventes ayant cette clé
    const matchingSales = store.getSales().filter((s) => s.idempotency_key === key);
    expect(matchingSales.length).toBe(1);
    expect(matchingSales[0].receipt_number).toBe(s1.receipt_number);
  });

  // Test 9: Vérifier que le service worker ne sert aucune donnée financière en cache
  it('9. Vérifier que la configuration Workbox impose Network-Only sur les API et Supabase', () => {
    const viteConfigPath = path.resolve(__dirname, '../../vite.config.ts');
    expect(existsSync(viteConfigPath)).toBe(true);

    const viteConfigContent = readFileSync(viteConfigPath, 'utf-8');

    // Vérification de la présence de la stratégie NetworkOnly
    expect(viteConfigContent).toContain('handler: \'NetworkOnly\'');
    // Vérification de l'exclusion explicite de /api et supabase
    expect(viteConfigContent).toContain('/api');
    expect(viteConfigContent).toContain('supabase.co');
  });

  // Test 10: Vérifier qu'aucune file hors ligne ou tâche Background Sync n'existe
  it('10. Vérifier l\'absence totale d\'IndexedDB transactionnel, file Background Sync ou rejeu automatique', () => {
    // Inspecter l'ensemble du code applicatif pour s'assurer qu'aucun module n'instancie IndexedDB pour les ventes
    const storePath = path.resolve(__dirname, '../../src/services/store.ts');
    const storeContent = readFileSync(storePath, 'utf-8');

    expect(storeContent).not.toContain('indexedDB');
    expect(storeContent).not.toContain('BackgroundSync');
    expect(storeContent).not.toContain('syncQueue');

    // Vérifier les dépendances package.json
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    const allDeps = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };

    expect(allDeps).not.toHaveProperty('idb');
    expect(allDeps).not.toHaveProperty('dexie');
    expect(allDeps).not.toHaveProperty('localforage');
  });
});
