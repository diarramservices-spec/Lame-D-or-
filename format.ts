/**
 * Formatting utilities for LAME D'OR
 * Timezone: Africa/Bamako
 * Currency: FCFA (XOF)
 */

export function formatFCFA(amount: number): string {
  if (isNaN(amount)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

export function formatPercent(rate: number): string {
  return `${rate.toFixed(0)}%`;
}

export function formatDateBamako(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Bamako',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTimeBamako(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Bamako',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getTodayBamako(): string {
  // Return YYYY-MM-DD in Africa/Bamako timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Africa/Bamako',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

export function formatPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'cash':
      return 'Espèces (Cash)';
    case 'orange_money':
      return 'Orange Money';
    case 'moov_money':
      return 'Moov Money';
    default:
      return method;
  }
}

export function formatRoleLabel(role: string): string {
  switch (role) {
    case 'manager':
      return 'Gérant';
    case 'cashier':
      return 'Caissier';
    case 'barber':
      return 'Barbier';
    default:
      return role;
  }
}
