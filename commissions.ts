/**
 * Commissions service layer for LAME D'OR
 */
import { CommissionPayment, PaymentMethod, AppRole, BarberCommissionBalance } from '../types';
import { salonStore } from './store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface CreateCommissionPaymentDTO {
  barberId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  actorRole: AppRole;
  actorId: string;
}

export async function createCommissionPaymentService(
  dto: CreateCommissionPaymentDTO
): Promise<{ payment: CommissionPayment; newBalance: number }> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('create_commission_payment', {
      p_barber_id: dto.barberId,
      p_amount: dto.amount,
      p_payment_method: dto.paymentMethod,
      p_reference: dto.reference || null,
      p_notes: dto.notes || null,
    });
    if (error) throw new Error(error.message);
    return data as { payment: CommissionPayment; newBalance: number };
  }

  return salonStore.createCommissionPayment(dto);
}

export function getCommissionBalancesService(): BarberCommissionBalance[] {
  return salonStore.getCommissionBalances();
}
