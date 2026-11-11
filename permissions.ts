/**
 * Permissions & Access Control for LAME D'OR
 * Roles: manager (Gérant), cashier (Caissier), barber (Barbier)
 */
import { AppRole } from '../types';

export const PERMISSIONS = {
  // POS & Sales
  CREATE_SALE: ['manager', 'cashier'] as AppRole[],
  VIEW_ALL_SALES: ['manager', 'cashier'] as AppRole[],
  VIEW_OWN_SALES: ['manager', 'cashier', 'barber'] as AppRole[],
  CANCEL_SALE: ['manager'] as AppRole[],
  PRICE_OVERRIDE: ['manager'] as AppRole[],

  // Commissions
  VIEW_ALL_COMMISSIONS: ['manager'] as AppRole[],
  VIEW_OWN_COMMISSIONS: ['manager', 'barber'] as AppRole[],
  CREATE_COMMISSION_PAYMENT: ['manager'] as AppRole[],
  REVERSE_COMMISSION_PAYMENT: ['manager'] as AppRole[],

  // Cash Closing
  VALIDATE_CLOSING: ['manager'] as AppRole[],
  VIEW_CLOSINGS: ['manager'] as AppRole[],
  ADD_CLOSING_ADJUSTMENT: ['manager'] as AppRole[],

  // Catalogs & Team
  MANAGE_SERVICES: ['manager'] as AppRole[],
  MANAGE_COMMISSION_RATES: ['manager'] as AppRole[],
  MANAGE_BARBERS: ['manager'] as AppRole[],

  // Audit & Dashboard
  VIEW_DASHBOARD: ['manager'] as AppRole[],
  VIEW_AUDIT_LOGS: ['manager'] as AppRole[],
  EXPORT_REPORTS: ['manager'] as AppRole[],
};

export function hasPermission(role: AppRole, requiredRoles: AppRole[]): boolean {
  return requiredRoles.includes(role);
}
