/**
 * Sales service layer for LAME D'OR
 */
import { Sale, PaymentMethod, AppRole } from '../types';
import { salonStore } from './store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface CreateSaleDTO {
  idempotencyKey: string;
  requestFingerprint: string;
  barberId: string;
  serviceId: string;
  amountReceived: number;
  paymentMethod: PaymentMethod;
  priceOverrideReason?: string;
  actorRole: AppRole;
  actorId: string;
}

export async function createSaleService(dto: CreateSaleDTO): Promise<Sale> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('create_sale', {
      p_idempotency_key: dto.idempotencyKey,
      p_request_fingerprint: dto.requestFingerprint,
      p_barber_id: dto.barberId,
      p_service_id: dto.serviceId,
      p_amount_received: dto.amountReceived,
      p_payment_method: dto.paymentMethod,
      p_price_override_reason: dto.priceOverrideReason || null,
    });
    if (error) throw new Error(error.message);
    return data as Sale;
  }

  // Local authority store
  return salonStore.createSale(dto);
}
