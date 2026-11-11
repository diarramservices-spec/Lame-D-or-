/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LAME D'OR — Application privée de caisse et de commissions
 * Diarra Multi Services (Bamako, Mali)
 */

export type AppRole = 'manager' | 'cashier' | 'barber';
export type PaymentMethod = 'cash' | 'orange_money' | 'moov_money';
export type SaleStatus = 'completed' | 'cancelled';
export type CommissionPaymentStatus = 'paid' | 'reversed';
export type ClosingStatus = 'validated';

export interface Profile {
  id: string;
  full_name: string;
  role: AppRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Barber {
  id: string;
  profile_id?: string | null;
  full_name: string;
  phone?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description?: string | null;
  current_price: number; // BIGINT in FCFA
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommissionRule {
  id: string;
  service_id: string;
  commission_rate: number; // Percentage e.g. 40.00
  valid_from: string;
  valid_to?: string | null;
  created_by: string;
  created_at: string;
}

export interface Sale {
  id: string;
  idempotency_key: string;
  request_fingerprint: string;
  receipt_number: string;
  barber_id: string;
  service_id: string;
  service_name_snapshot: string;
  catalog_price_snapshot: number;
  commission_rule_id?: string | null;
  commission_rate_snapshot: number;
  commission_base_amount: number;
  amount_received: number;
  commission_amount: number;
  price_override_reason?: string | null;
  payment_method: PaymentMethod;
  status: SaleStatus;
  created_by: string;
  created_at: string;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
}

export interface CommissionPayment {
  id: string;
  barber_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: CommissionPaymentStatus;
  reference?: string | null;
  notes?: string | null;
  paid_by: string;
  paid_at: string;
  reversed_by?: string | null;
  reversed_at?: string | null;
  reversal_reason?: string | null;
}

export interface CashClosing {
  id: string;
  business_date: string; // YYYY-MM-DD
  opening_cash: number;
  cash_sales: number;
  orange_money_sales: number;
  moov_money_sales: number;
  cash_commission_payments: number;
  orange_commission_payments: number;
  moov_commission_payments: number;
  expected_cash: number;
  counted_cash: number;
  difference: number;
  status: ClosingStatus;
  note?: string | null;
  created_by: string;
  validated_by: string;
  validated_at: string;
}

export interface CashClosingAdjustment {
  id: string;
  closing_id: string;
  amount_delta: number;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  request_id?: string | null;
  created_at: string;
}

export interface BarberCommissionBalance {
  barber_id: string;
  barber_name: string;
  total_earned: number;
  total_paid: number;
  balance_due: number;
  sales_count: number;
}
