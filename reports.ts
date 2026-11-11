/**
 * Reporting and export service for LAME D'OR
 * Diarra Multi Services (Bamako, Mali)
 */
import { salonStore } from './store';
import { getTodayBamako, formatFCFA, formatDateBamako } from '../lib/format';
import { PaymentMethod } from '../types';

export type ReportPeriod = 'today' | '7days' | 'month' | 'all';

export interface FilterOptions {
  period?: ReportPeriod;
  barberId?: string;
  paymentMethod?: string;
  store?: typeof salonStore;
}

export interface BarberReportItem {
  barber_id: string;
  barber_name: string;
  sales_count: number;
  total_generated_ca: number;
  commissions_earned: number;
  commissions_paid: number;
  balance_due: number;
}

export interface DetailedReportMetrics {
  totalCA: number;
  totalCash: number;
  totalOrange: number;
  totalMoov: number;
  totalCommissionsEarned: number;
  totalCommissionsPaid: number;
  totalBalanceDue: number;
  netSalon: number;
  salesCount: number;
  barbers: BarberReportItem[];
}

export function getFilteredReportMetrics(filters: FilterOptions = {}): DetailedReportMetrics {
  const { period = 'all', barberId, paymentMethod, store = salonStore } = filters;
  const today = getTodayBamako();

  // 1. Filter completed sales ONLY (strict exclusion of cancelled sales)
  let sales = store.getSales().filter((s) => s.status === 'completed');

  if (period === 'today') {
    sales = sales.filter((s) => s.created_at.slice(0, 10) === today);
  } else if (period === '7days') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateLimit = sevenDaysAgo.toISOString().slice(0, 10);
    sales = sales.filter((s) => s.created_at.slice(0, 10) >= dateLimit);
  } else if (period === 'month') {
    const currentMonth = today.slice(0, 7); // YYYY-MM
    sales = sales.filter((s) => s.created_at.slice(0, 7) === currentMonth);
  }

  if (barberId && barberId !== 'all') {
    sales = sales.filter((s) => s.barber_id === barberId);
  }

  if (paymentMethod && paymentMethod !== 'all') {
    sales = sales.filter((s) => s.payment_method === paymentMethod);
  }

  // 2. Filter paid commission payments ONLY (strict exclusion of reversed payments)
  let payments = store.getCommissionPayments().filter((p) => p.status === 'paid');
  if (period === 'today') {
    payments = payments.filter((p) => p.paid_at.slice(0, 10) === today);
  } else if (period === 'month') {
    const currentMonth = today.slice(0, 7);
    payments = payments.filter((p) => p.paid_at.slice(0, 7) === currentMonth);
  }
  if (barberId && barberId !== 'all') {
    payments = payments.filter((p) => p.barber_id === barberId);
  }

  const totalCA = sales.reduce((sum, s) => sum + s.amount_received, 0);
  const totalCash = sales.filter((s) => s.payment_method === 'cash').reduce((sum, s) => sum + s.amount_received, 0);
  const totalOrange = sales.filter((s) => s.payment_method === 'orange_money').reduce((sum, s) => sum + s.amount_received, 0);
  const totalMoov = sales.filter((s) => s.payment_method === 'moov_money').reduce((sum, s) => sum + s.amount_received, 0);

  const totalCommissionsEarned = sales.reduce((sum, s) => sum + s.commission_amount, 0);
  const totalCommissionsPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalBalanceDue = Math.max(0, totalCommissionsEarned - totalCommissionsPaid);

  // Barber specific breakdown
  const allBarbers = store.getBarbers();
  const relevantBarbers = barberId && barberId !== 'all'
    ? allBarbers.filter((b) => b.id === barberId)
    : allBarbers;

  const barberItems: BarberReportItem[] = relevantBarbers.map((b) => {
    const bSales = sales.filter((s) => s.barber_id === b.id);
    const bPayments = payments.filter((p) => p.barber_id === b.id);
    const bCA = bSales.reduce((sum, s) => sum + s.amount_received, 0);
    const bEarned = bSales.reduce((sum, s) => sum + s.commission_amount, 0);
    const bPaid = bPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      barber_id: b.id,
      barber_name: b.full_name,
      sales_count: bSales.length,
      total_generated_ca: bCA,
      commissions_earned: bEarned,
      commissions_paid: bPaid,
      balance_due: bEarned - bPaid,
    };
  });

  return {
    totalCA,
    totalCash,
    totalOrange,
    totalMoov,
    totalCommissionsEarned,
    totalCommissionsPaid,
    totalBalanceDue,
    netSalon: totalCA - totalCommissionsEarned,
    salesCount: sales.length,
    barbers: barberItems,
  };
}

export function generateSalesCSV(filters: FilterOptions = {}): string {
  const { period = 'all', barberId, paymentMethod, store = salonStore } = filters;
  const today = getTodayBamako();

  let sales = store.getSales().filter((s) => s.status === 'completed');

  if (period === 'today') {
    sales = sales.filter((s) => s.created_at.slice(0, 10) === today);
  } else if (period === 'month') {
    const currentMonth = today.slice(0, 7);
    sales = sales.filter((s) => s.created_at.slice(0, 7) === currentMonth);
  }

  if (barberId && barberId !== 'all') {
    sales = sales.filter((s) => s.barber_id === barberId);
  }

  if (paymentMethod && paymentMethod !== 'all') {
    sales = sales.filter((s) => s.payment_method === paymentMethod);
  }

  const barbers = store.getBarbers();
  const headers = [
    'Numero_Recu',
    'Date_Heure',
    'Prestation',
    'Barbier',
    'Montant_Encaissé_FCFA',
    'Taux_Commission_%',
    'Montant_Commission_FCFA',
    'Part_Salon_FCFA',
    'Moyen_Paiement',
    'Statut',
  ];

  const rows = sales.map((s) => {
    const b = barbers.find((barber) => barber.id === s.barber_id);
    return [
      s.receipt_number,
      s.created_at,
      `"${s.service_name_snapshot}"`,
      `"${b ? b.full_name : s.barber_id}"`,
      s.amount_received,
      s.commission_rate_snapshot,
      s.commission_amount,
      s.amount_received - s.commission_amount,
      s.payment_method,
      s.status,
    ];
  });

  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}
