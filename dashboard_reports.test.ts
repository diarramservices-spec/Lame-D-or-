import { describe, it, expect, beforeEach } from 'vitest';
import { SalonStore } from '../../src/services/store';
import { getFilteredReportMetrics, generateSalesCSV } from '../../src/services/reports';

describe('Prompt 7 — Dashboard & Exports (Filtres, Rapports, Exclusion Annulations/Renversements)', () => {
  let store: SalonStore;

  beforeEach(() => {
    store = new SalonStore();
    store.setForcedOnline(true);
  });

  describe('Exclusion stricte des ventes annulées et règlements renversés', () => {
    it('exclut formellement les ventes annulées du CA brut et des commissions générées', () => {
      const barbers = store.getBarbers();
      const services = store.getServices();

      const initialMetrics = getFilteredReportMetrics({ store });

      // Création d'une vente de 8 000 FCFA (soin royal)
      const sale = store.createSale({
        idempotencyKey: 'dashboard-test-sale-1',
        requestFingerprint: 'fp-dash-1',
        barberId: barbers[0].id,
        serviceId: services.find((s) => s.current_price === 8000)!.id,
        amountReceived: 8000,
        paymentMethod: 'cash',
        actorRole: 'cashier',
        actorId: 'cashier-1',
      });

      const metricsAfterSale = getFilteredReportMetrics({ store });
      expect(metricsAfterSale.totalCA).toBe(initialMetrics.totalCA + 8000);
      expect(metricsAfterSale.salesCount).toBe(initialMetrics.salesCount + 1);

      // Annulation de la vente par le gérant
      store.cancelSale(sale.id, 'Client mécontent - remboursement', 'manager', 'manager-1');

      // VÉRIFICATION STRICTE : Le CA et le nombre de prestations reviennent exactement aux valeurs initiales
      const metricsAfterCancel = getFilteredReportMetrics({ store });
      expect(metricsAfterCancel.totalCA).toBe(initialMetrics.totalCA);
      expect(metricsAfterCancel.salesCount).toBe(initialMetrics.salesCount);
      expect(metricsAfterCancel.totalCommissionsEarned).toBe(initialMetrics.totalCommissionsEarned);
    });

    it('exclut formellement les règlements renversés des commissions payées', () => {
      const barbers = store.getBarbers();
      const initialMetrics = getFilteredReportMetrics({ store });

      // Paiement d'une commission de 1 000 FCFA
      const pay = store.createCommissionPayment({
        barberId: barbers[0].id,
        amount: 1000,
        paymentMethod: 'cash',
        notes: 'Paiement test',
        actorRole: 'manager',
        actorId: 'manager-1',
      });

      const metricsAfterPay = getFilteredReportMetrics({ store });
      expect(metricsAfterPay.totalCommissionsPaid).toBe(initialMetrics.totalCommissionsPaid + 1000);

      // Renversement du paiement
      store.reverseCommissionPayment(pay.payment.id, 'Erreur de saisie', 'manager', 'manager-1');

      // VÉRIFICATION STRICTE : Le total payé revient à la valeur initiale
      const metricsAfterReversal = getFilteredReportMetrics({ store });
      expect(metricsAfterReversal.totalCommissionsPaid).toBe(initialMetrics.totalCommissionsPaid);
    });
  });

  describe('Filtres et Cohérence des Données d\'Export', () => {
    it('filtre fidèlement les métriques par moyen de paiement', () => {
      const allMetrics = getFilteredReportMetrics({ store });
      const cashMetrics = getFilteredReportMetrics({ paymentMethod: 'cash', store });
      const orangeMetrics = getFilteredReportMetrics({ paymentMethod: 'orange_money', store });

      expect(cashMetrics.totalCA).toBe(allMetrics.totalCash);
      expect(orangeMetrics.totalCA).toBe(allMetrics.totalOrange);
    });

    it('filtre fidèlement les métriques par barbier', () => {
      const barbers = store.getBarbers();
      const targetBarber = barbers[0];

      const barberMetrics = getFilteredReportMetrics({ barberId: targetBarber.id, store });
      expect(barberMetrics.barbers.length).toBe(1);
      expect(barberMetrics.barbers[0].barber_id).toBe(targetBarber.id);
      expect(barberMetrics.totalCA).toBe(barberMetrics.barbers[0].total_generated_ca);
    });

    it('génère un export CSV dont les chiffres correspondent exactement aux données affichées', () => {
      const csvData = generateSalesCSV({ period: 'all', store });
      expect(csvData).toContain('Numero_Recu;Date_Heure;Prestation;Barbier;Montant_Encaissé_FCFA');

      const completedSales = store.getSales().filter((s) => s.status === 'completed');
      for (const sale of completedSales) {
        expect(csvData).toContain(sale.receipt_number);
        expect(csvData).toContain(String(sale.amount_received));
      }

      // Vérifie qu'aucune vente annulée n'apparaît dans le CSV
      const cancelledSales = store.getSales().filter((s) => s.status === 'cancelled');
      for (const cancelled of cancelledSales) {
        expect(csvData).not.toContain(cancelled.receipt_number);
      }
    });
  });
});
