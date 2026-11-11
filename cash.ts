/**
 * Cash & Closings service layer for LAME D'OR
 */
import { CashClosing, AppRole } from '../types';
import { salonStore } from './store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ValidateCashClosingDTO {
  businessDate: string;
  openingCash: number;
  countedCash: number;
  note?: string;
  actorRole: AppRole;
  actorId: string;
}

export async function validateCashClosingService(dto: ValidateCashClosingDTO): Promise<CashClosing> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('validate_cash_closing', {
      p_business_date: dto.businessDate,
      p_opening_cash: dto.openingCash,
      p_counted_cash: dto.countedCash,
      p_note: dto.note || null,
    });
    if (error) throw new Error(error.message);
    return data as CashClosing;
  }

  return salonStore.validateCashClosing(dto);
}
