/**
 * Data management and transaction simulation for LAME D'OR
 * Follows exact PostgreSQL RPC business logic described in Migrations 0001-0003
 */
import {
  Barber,
  ServiceItem,
  CommissionRule,
  Sale,
  CommissionPayment,
  CashClosing,
  CashClosingAdjustment,
  AuditLog,
  AppRole,
  PaymentMethod,
  BarberCommissionBalance,
} from '../types';
import { getTodayBamako } from '../lib/format';

// Seed barbers
const INITIAL_BARBERS: Barber[] = [
  { id: 'b1-ibrahim', full_name: 'Ibrahim Diallo', phone: '+223 76 12 34 56', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'b2-mamadou', full_name: 'Mamadou Traoré', phone: '+223 65 98 76 54', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'b3-oumar', full_name: 'Oumar Koné', phone: '+223 70 45 67 89', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'b4-bakary', full_name: 'Bakary Coulibaly', phone: '+223 79 11 22 33', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// Seed services & commission rules
const INITIAL_SERVICES: ServiceItem[] = [
  { id: 's1-classique', name: 'Coupe Homme Classique', description: 'Dégradé américain ou ciseaux, finition rasoir', current_price: 3000, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 's2-prestige', name: 'Coupe + Barbe Prestige', description: 'Coupe complète, traçage barbe et serviette chaude', current_price: 5000, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 's3-barbe', name: 'Taille & Soin de Barbe', description: 'Traçage barbe sculptée, huile nourrissante et baume', current_price: 2500, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 's4-enfant', name: 'Coupe Enfant / Junior', description: 'Pour enfants de moins de 12 ans', current_price: 2000, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 's5-teinture', name: 'Teinture & Coloration', description: 'Coloration noire naturelle anti-taches', current_price: 6000, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 's6-soin', name: 'Soin Visage Royal', description: 'Nettoyage vapeur, gommage et masque purifiant', current_price: 8000, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const INITIAL_RULES: CommissionRule[] = [
  { id: 'r1', service_id: 's1-classique', commission_rate: 40, valid_from: new Date().toISOString(), created_by: 'manager-1', created_at: new Date().toISOString() },
  { id: 'r2', service_id: 's2-prestige', commission_rate: 40, valid_from: new Date().toISOString(), created_by: 'manager-1', created_at: new Date().toISOString() },
  { id: 'r3', service_id: 's3-barbe', commission_rate: 40, valid_from: new Date().toISOString(), created_by: 'manager-1', created_at: new Date().toISOString() },
  { id: 'r4', service_id: 's4-enfant', commission_rate: 40, valid_from: new Date().toISOString(), created_by: 'manager-1', created_at: new Date().toISOString() },
  { id: 'r5', service_id: 's5-teinture', commission_rate: 35, valid_from: new Date().toISOString(), created_by: 'manager-1', created_at: new Date().toISOString() },
  { id: 'r6', service_id: 's6-soin', commission_rate: 30, valid_from: new Date().toISOString(), created_by: 'manager-1', created_at: new Date().toISOString() },
];

// Initial pre-loaded sales for realistic demo testing
const todayStr = getTodayBamako();
const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-101',
    idempotency_key: 'idemp-101',
    request_fingerprint: 'fp-101',
    receipt_number: `REC-${todayStr.replace(/-/g, '')}-01001`,
    barber_id: 'b1-ibrahim',
    service_id: 's2-prestige',
    service_name_snapshot: 'Coupe + Barbe Prestige',
    catalog_price_snapshot: 5000,
    commission_rate_snapshot: 40,
    commission_base_amount: 5000,
    amount_received: 5000,
    commission_amount: 2000,
    payment_method: 'cash',
    status: 'completed',
    created_by: 'manager-1',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'sale-102',
    idempotency_key: 'idemp-102',
    request_fingerprint: 'fp-102',
    receipt_number: `REC-${todayStr.replace(/-/g, '')}-01002`,
    barber_id: 'b2-mamadou',
    service_id: 's1-classique',
    service_name_snapshot: 'Coupe Homme Classique',
    catalog_price_snapshot: 3000,
    commission_rate_snapshot: 40,
    commission_base_amount: 3000,
    amount_received: 3000,
    commission_amount: 1200,
    payment_method: 'orange_money',
    status: 'completed',
    created_by: 'manager-1',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'sale-103',
    idempotency_key: 'idemp-103',
    request_fingerprint: 'fp-103',
    receipt_number: `REC-${todayStr.replace(/-/g, '')}-01003`,
    barber_id: 'b3-oumar',
    service_id: 's6-soin',
    service_name_snapshot: 'Soin Visage Royal',
    catalog_price_snapshot: 8000,
    commission_rate_snapshot: 30,
    commission_base_amount: 8000,
    amount_received: 8000,
    commission_amount: 2400,
    payment_method: 'cash',
    status: 'completed',
    created_by: 'cashier-1',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

const INITIAL_PAYMENTS: CommissionPayment[] = [
  {
    id: 'pay-201',
    barber_id: 'b1-ibrahim',
    amount: 1000,
    payment_method: 'cash',
    status: 'paid',
    reference: 'Acompte déjeuner',
    notes: 'Avance sur journée',
    paid_by: 'manager-1',
    paid_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

export class SalonStore {
  private barbers: Barber[] = INITIAL_BARBERS.map((b) => ({ ...b }));
  private services: ServiceItem[] = INITIAL_SERVICES.map((s) => ({ ...s }));
  private commissionRules: CommissionRule[] = INITIAL_RULES.map((r) => ({ ...r }));
  private sales: Sale[] = INITIAL_SALES.map((s) => ({ ...s }));
  private commissionPayments: CommissionPayment[] = INITIAL_PAYMENTS.map((p) => ({ ...p }));
  private cashClosings: CashClosing[] = [];
  private cashClosingAdjustments: CashClosingAdjustment[] = [];
  private auditLogs: AuditLog[] = [
    {
      id: 1,
      actor_name: 'Gérant (Admin)',
      action: 'INITIALISATION_SYSTEME',
      entity_type: 'system',
      created_at: new Date().toISOString(),
      new_values: { version: '2.0', mode: 'network-only' },
    },
  ];
  private receiptCounter: number = 1004;
  private isOnlineForced: boolean = true; // Can be toggled in UI to simulate network loss

  // Online status management
  public isOnline(): boolean {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      if (!navigator.onLine) return false;
    }
    return this.isOnlineForced;
  }

  public setForcedOnline(online: boolean) {
    this.isOnlineForced = online;
  }

  // Barbers
  public getBarbers(): Barber[] {
    return [...this.barbers];
  }

  public addBarber(name: string, phone: string, actorRole: AppRole): Barber {
    if (!this.isOnline()) {
      throw new Error('Connexion Internet requise.');
    }
    if (actorRole !== 'manager') {
      throw new Error('Seul le gérant peut ajouter un barbier.');
    }
    const barber: Barber = {
      id: `b-${Date.now()}`,
      full_name: name.trim(),
      phone: phone.trim() || null,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.barbers.push(barber);
    this.logAudit('create_barber', 'barber', barber.id, actorRole, null, barber);
    return barber;
  }

  public updateBarber(barberId: string, name: string, phone: string, actorRole: AppRole): Barber {
    if (!this.isOnline()) {
      throw new Error('Connexion Internet requise.');
    }
    if (actorRole !== 'manager') {
      throw new Error('Seul le gérant peut modifier un barbier.');
    }
    const barber = this.barbers.find((b) => b.id === barberId);
    if (!barber) throw new Error('Barbier introuvable.');
    const oldValues = { ...barber };
    barber.full_name = name.trim();
    barber.phone = phone.trim() || null;
    barber.updated_at = new Date().toISOString();
    this.logAudit('update_barber', 'barber', barber.id, actorRole, oldValues, barber);
    return barber;
  }

  public toggleBarberStatus(barberId: string, actorRole: AppRole): Barber {
    if (actorRole !== 'manager') {
      throw new Error('Seul le gérant peut modifier le statut d\'un barbier.');
    }
    const barber = this.barbers.find((b) => b.id === barberId);
    if (!barber) throw new Error('Barbier introuvable.');
    const oldValues = { ...barber };
    barber.active = !barber.active;
    barber.updated_at = new Date().toISOString();
    this.logAudit('update_barber_status', 'barber', barber.id, actorRole, oldValues, { active: barber.active });
    return barber;
  }

  // Services
  public getServices(): ServiceItem[] {
    return [...this.services];
  }

  public getCommissionRules(): CommissionRule[] {
    return [...this.commissionRules];
  }

  public getActiveRuleForService(serviceId: string): CommissionRule | undefined {
    return this.commissionRules.find((r) => r.service_id === serviceId && !r.valid_to);
  }

  public addService(name: string, price: number, commissionRate: number, description: string, actorRole: AppRole): ServiceItem {
    if (!this.isOnline()) {
      throw new Error('Connexion Internet requise.');
    }
    if (actorRole !== 'manager') {
      throw new Error('Seul le gérant peut créer une prestation.');
    }
    if (!name || name.trim().length < 2) {
      throw new Error('Le nom de la prestation doit comporter au moins 2 caractères.');
    }
    if (price < 0) {
      throw new Error('Le tarif catalogue ne peut pas être négatif.');
    }
    if (commissionRate < 0 || commissionRate > 100) {
      throw new Error('Le taux de commission doit être compris entre 0% et 100%.');
    }

    const service: ServiceItem = {
      id: `s-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || null,
      current_price: price,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.services.push(service);

    const rule: CommissionRule = {
      id: `r-${Date.now()}`,
      service_id: service.id,
      commission_rate: commissionRate,
      valid_from: new Date().toISOString(),
      created_by: actorRole,
      created_at: new Date().toISOString(),
    };
    this.commissionRules.push(rule);
    this.logAudit('create_service', 'service', service.id, actorRole, null, { service, rule });
    return service;
  }

  public updateService(
    serviceId: string,
    params: { name?: string; price?: number; description?: string; active?: boolean },
    actorRole: AppRole
  ): ServiceItem {
    if (!this.isOnline()) {
      throw new Error('Connexion Internet requise.');
    }
    if (actorRole !== 'manager') {
      throw new Error('Seul le gérant peut modifier une prestation.');
    }
    const service = this.services.find((s) => s.id === serviceId);
    if (!service) throw new Error('Prestation introuvable.');

    const oldValues = { ...service };
    if (params.name !== undefined) service.name = params.name.trim();
    if (params.description !== undefined) service.description = params.description.trim() || null;
    if (params.price !== undefined) {
      if (params.price < 0) throw new Error('Le tarif catalogue ne peut pas être négatif.');
      service.current_price = params.price;
    }
    if (params.active !== undefined) service.active = params.active;
    service.updated_at = new Date().toISOString();

    this.logAudit('update_service', 'service', service.id, actorRole, oldValues, service);
    return service;
  }

  public toggleServiceStatus(serviceId: string, actorRole: AppRole): ServiceItem {
    if (!this.isOnline()) {
      throw new Error('Connexion Internet requise.');
    }
    if (actorRole !== 'manager') {
      throw new Error('Seul le gérant peut modifier le statut d\'une prestation.');
    }
    const service = this.services.find((s) => s.id === serviceId);
    if (!service) throw new Error('Prestation introuvable.');
    const oldValues = { ...service };
    service.active = !service.active;
    service.updated_at = new Date().toISOString();
    this.logAudit('toggle_service_status', 'service', service.id, actorRole, oldValues, { active: service.active });
    return service;
  }

  public updateServiceRate(serviceId: string, newRate: number, actorRole: AppRole): CommissionRule {
    if (!this.isOnline()) {
      throw new Error('Connexion Internet requise.');
    }
    if (actorRole !== 'manager') {
      throw new Error('Seul le gérant peut modifier les taux de commission.');
    }
    if (newRate < 0 || newRate > 100) {
      throw new Error('Le taux de commission doit être compris entre 0% et 100%.');
    }
    const existingRule = this.getActiveRuleForService(serviceId);
    if (existingRule) {
      existingRule.valid_to = new Date().toISOString();
    }
    const newRule: CommissionRule = {
      id: `r-${Date.now()}`,
      service_id: serviceId,
      commission_rate: newRate,
      valid_from: new Date().toISOString(),
      created_by: actorRole,
      created_at: new Date().toISOString(),
    };
    this.commissionRules.push(newRule);
    this.logAudit('update_commission_rate', 'commission_rule', newRule.id, actorRole, existingRule, newRule);
    return newRule;
  }

  // Sales (createSale RPC equivalent)
  public getSales(filterBarberId?: string): Sale[] {
    if (filterBarberId) {
      return this.sales.filter((s) => s.barber_id === filterBarberId);
    }
    return [...this.sales];
  }

  public createSale(params: {
    idempotencyKey: string;
    requestFingerprint: string;
    barberId: string;
    serviceId: string;
    amountReceived: number;
    paymentMethod: PaymentMethod;
    priceOverrideReason?: string;
    actorRole: AppRole;
    actorId: string;
  }): Sale {
    // 0. Network check (Absolute rule: No offline sales)
    if (!this.isOnline()) {
      throw new Error('Connexion Internet indisponible. Aucune vente ne peut être enregistrée hors ligne.');
    }

    // 1. Role verification
    if (params.actorRole !== 'manager' && params.actorRole !== 'cashier') {
      throw new Error('Accès refusé : rôle caissier ou gérant requis.');
    }

    // 2. Business date check
    const businessDate = getTodayBamako();
    const isClosed = this.cashClosings.some((c) => c.business_date === businessDate && c.status === 'validated');
    if (isClosed) {
      throw new Error(`La caisse est déjà clôturée pour le ${businessDate}. Impossible d'ajouter une vente.`);
    }

    // 3. Idempotency verification
    const existingSale = this.sales.find((s) => s.idempotency_key === params.idempotencyKey);
    if (existingSale) {
      if (existingSale.request_fingerprint === params.requestFingerprint) {
        return existingSale;
      } else {
        throw new Error('Conflit d\'idempotence : empreinte différente pour la même clé.');
      }
    }

    // 4. Verify barber
    const barber = this.barbers.find((b) => b.id === params.barberId && b.active);
    if (!barber) throw new Error('Barbier introuvable ou inactif.');

    // 5. Verify service and active rule
    const service = this.services.find((s) => s.id === params.serviceId && s.active);
    if (!service) throw new Error('Prestation introuvable ou inactive.');

    const rule = this.getActiveRuleForService(params.serviceId);
    if (!rule) throw new Error('Aucune règle de commission active pour cette prestation.');

    // 6. Price override rule
    if (params.amountReceived !== service.current_price) {
      if (params.actorRole !== 'manager') {
        throw new Error('Seul le gérant est autorisé à appliquer un tarif dérogatoire.');
      }
      if (!params.priceOverrideReason || params.priceOverrideReason.trim().length === 0) {
        throw new Error('Un motif obligatoire doit être fourni pour tout tarif dérogatoire.');
      }
    }

    // 7. Server calculation of commission: ROUND(amountReceived * rate / 100)
    const commissionAmount = Math.round((params.amountReceived * rule.commission_rate) / 100);

    // 8. Generate normalized receipt number
    const dateCompact = businessDate.replace(/-/g, '');
    const receiptNumber = `REC-${dateCompact}-${String(this.receiptCounter++).padStart(5, '0')}`;

    // 9. Create and store sale with immutable snapshots
    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      idempotency_key: params.idempotencyKey,
      request_fingerprint: params.requestFingerprint,
      receipt_number: receiptNumber,
      barber_id: barber.id,
      service_id: service.id,
      service_name_snapshot: service.name,
      catalog_price_snapshot: service.current_price,
      commission_rule_id: rule.id,
      commission_rate_snapshot: rule.commission_rate,
      commission_base_amount: params.amountReceived,
      amount_received: params.amountReceived,
      commission_amount: commissionAmount,
      price_override_reason: params.priceOverrideReason || null,
      payment_method: params.paymentMethod,
      status: 'completed',
      created_by: params.actorId,
      created_at: new Date().toISOString(),
    };

    this.sales.unshift(newSale);
    this.logAudit('create_sale', 'sale', newSale.id, params.actorRole, null, newSale);
    return newSale;
  }

  // Cancel sale
  public cancelSale(saleId: string, reason: string, actorRole: AppRole, actorId: string): Sale {
    if (!this.isOnline()) {
      throw new Error('Connexion Internet requise.');
    }
    if (actorRole !== 'manager') {
      throw new Error('Seul le gérant peut annuler une vente.');
    }
    if (!reason || reason.trim().length < 5) {
      throw new Error('Un motif explicite d\'au moins 5 caractères est obligatoire pour annuler une vente.');
    }

    const sale = this.sales.find((s) => s.id === saleId);
    if (!sale) throw new Error('Vente introuvable.');
    if (sale.status === 'cancelled') throw new Error('Cette vente est déjà annulée.');

    // Check if the sale was on a date already closed
    const saleDate = sale.created_at.slice(0, 10);
    const isClosed = this.cashClosings.some((c) => c.business_date === saleDate && c.status === 'validated');
    if (isClosed) {
      throw new Error('Impossible d\'annuler une vente d\'une journée déjà clôturée. Utilisez un ajustement post-clôture.');
    }

    const oldValues = { ...sale };
    sale.status = 'cancelled';
    sale.cancelled_by = actorId;
    sale.cancelled_at = new Date().toISOString();
    sale.cancellation_reason = reason.trim();

    this.logAudit('cancel_sale', 'sale', sale.id, actorRole, oldValues, sale);
    return sale;
  }

  // Commissions
  public getCommissionBalances(): BarberCommissionBalance[] {
    return this.barbers.map((barber) => {
      const completedSales = this.sales.filter((s) => s.barber_id === barber.id && s.status === 'completed');
      const totalEarned = completedSales.reduce((sum, s) => sum + s.commission_amount, 0);

      const paidPayments = this.commissionPayments.filter((p) => p.barber_id === barber.id && p.status === 'paid');
      const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

      return {
        barber_id: barber.id,
        barber_name: barber.full_name,
        total_earned: totalEarned,
        total_paid: totalPaid,
        balance_due: totalEarned - totalPaid,
        sales_count: completedSales.length,
      };
    });
  }

  public getCommissionPayments(barberId?: string): CommissionPayment[] {
    if (barberId) {
      return this.commissionPayments.filter((p) => p.barber_id === barberId);
    }
    return [...this.commissionPayments];
  }

  public createCommissionPayment(params: {
    barberId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    reference?: string;
    notes?: string;
    actorRole: AppRole;
    actorId: string;
  }): { payment: CommissionPayment; newBalance: number } {
    if (!this.isOnline()) {
      throw new Error('Connexion Internet requise.');
    }
    if (params.actorRole !== 'manager') {
      throw new Error('Seul le gérant peut effectuer des règlements de commission.');
    }

    const businessDate = getTodayBamako();
    const isClosed = this.cashClosings.some((c) => c.business_date === businessDate && c.status === 'validated');
    if (isClosed) {
      throw new Error(`La caisse est déjà clôturée pour le ${businessDate}.`);
    }

    const balances = this.getCommissionBalances();
    const barberBalance = balances.find((b) => b.barber_id === params.barberId);
    if (!barberBalance) throw new Error('Barbier introuvable.');

    if (params.amount <= 0) {
      throw new Error('Le montant du règlement doit être supérieur à zéro.');
    }

    if (params.amount > barberBalance.balance_due) {
      throw new Error(`Le montant (${params.amount} FCFA) dépasse le solde dû (${barberBalance.balance_due} FCFA). Aucun découvert autorisé.`);
    }

    const newPayment: CommissionPayment = {
      id: `pay-${Date.now()}`,
      barber_id: params.barberId,
      amount: params.amount,
      payment_method: params.paymentMethod,
      status: 'paid',
      reference: params.reference || null,
      notes: params.notes || null,
      paid_by: params.actorId,
      paid_at: new Date().toISOString(),
    };

    this.commissionPayments.unshift(newPayment);
    this.logAudit('create_commission_payment', 'commission_payment', newPayment.id, params.actorRole, null, newPayment);

    return {
      payment: newPayment,
      newBalance: barberBalance.balance_due - params.amount,
    };
  }

  public reverseCommissionPayment(paymentId: string, reason: string, actorRole: AppRole, actorId: string): CommissionPayment {
    if (!this.isOnline()) throw new Error('Connexion Internet requise.');
    if (actorRole !== 'manager') throw new Error('Seul le gérant peut annuler un règlement.');
    if (!reason || reason.trim().length < 5) throw new Error('Un motif d\'au moins 5 caractères est obligatoire.');

    const payment = this.commissionPayments.find((p) => p.id === paymentId);
    if (!payment) throw new Error('Règlement introuvable.');
    if (payment.status === 'reversed') throw new Error('Ce règlement est déjà annulé.');

    const oldValues = { ...payment };
    payment.status = 'reversed';
    payment.reversed_by = actorId;
    payment.reversed_at = new Date().toISOString();
    payment.reversal_reason = reason.trim();

    this.logAudit('reverse_commission_payment', 'commission_payment', payment.id, actorRole, oldValues, payment);
    return payment;
  }

  // Cash Closings
  public getCashClosings(): CashClosing[] {
    return [...this.cashClosings];
  }

  public getClosingSummaryForDate(dateStr: string) {
    const daySales = this.sales.filter(
      (s) => s.created_at.slice(0, 10) === dateStr && s.status === 'completed'
    );
    const dayPayments = this.commissionPayments.filter(
      (p) => p.paid_at.slice(0, 10) === dateStr && p.status === 'paid'
    );

    const cashSales = daySales.filter((s) => s.payment_method === 'cash').reduce((sum, s) => sum + s.amount_received, 0);
    const orangeSales = daySales.filter((s) => s.payment_method === 'orange_money').reduce((sum, s) => sum + s.amount_received, 0);
    const moovSales = daySales.filter((s) => s.payment_method === 'moov_money').reduce((sum, s) => sum + s.amount_received, 0);

    const cashComm = dayPayments.filter((p) => p.payment_method === 'cash').reduce((sum, p) => sum + p.amount, 0);
    const orangeComm = dayPayments.filter((p) => p.payment_method === 'orange_money').reduce((sum, p) => sum + p.amount, 0);
    const moovComm = dayPayments.filter((p) => p.payment_method === 'moov_money').reduce((sum, p) => sum + p.amount, 0);

    return {
      date: dateStr,
      salesCount: daySales.length,
      cashSales,
      orangeSales,
      moovSales,
      totalSales: cashSales + orangeSales + moovSales,
      cashCommissionPayments: cashComm,
      orangeCommissionPayments: orangeComm,
      moovCommissionPayments: moovComm,
      totalCommissionPayments: cashComm + orangeComm + moovComm,
    };
  }

  public validateCashClosing(params: {
    businessDate: string;
    openingCash: number;
    countedCash: number;
    note?: string;
    actorRole: AppRole;
    actorId: string;
  }): CashClosing {
    if (!this.isOnline()) throw new Error('Connexion Internet requise.');
    if (params.actorRole !== 'manager') throw new Error('Seul le gérant peut valider la clôture.');

    const today = getTodayBamako();
    if (params.businessDate > today) {
      throw new Error('Impossible de clôturer une date future.');
    }

    if (this.cashClosings.some((c) => c.business_date === params.businessDate)) {
      throw new Error(`La journée du ${params.businessDate} a déjà été clôturée.`);
    }

    const summary = this.getClosingSummaryForDate(params.businessDate);
    const expectedCash = params.openingCash + summary.cashSales - summary.cashCommissionPayments;
    const difference = params.countedCash - expectedCash;

    const closing: CashClosing = {
      id: `closing-${Date.now()}`,
      business_date: params.businessDate,
      opening_cash: params.openingCash,
      cash_sales: summary.cashSales,
      orange_money_sales: summary.orangeSales,
      moov_money_sales: summary.moovSales,
      cash_commission_payments: summary.cashCommissionPayments,
      orange_commission_payments: summary.orangeCommissionPayments,
      moov_commission_payments: summary.moovCommissionPayments,
      expected_cash: expectedCash,
      counted_cash: params.countedCash,
      difference: difference,
      status: 'validated',
      note: params.note || null,
      created_by: params.actorId,
      validated_by: params.actorId,
      validated_at: new Date().toISOString(),
    };

    this.cashClosings.unshift(closing);
    this.logAudit('validate_cash_closing', 'cash_closing', closing.id, params.actorRole, null, closing);
    return closing;
  }

  // Post-closing adjustments (Append-only)
  public getClosingAdjustments(closingId?: string): CashClosingAdjustment[] {
    if (closingId) {
      return this.cashClosingAdjustments.filter((a) => a.closing_id === closingId);
    }
    return [...this.cashClosingAdjustments];
  }

  public addClosingAdjustment(
    closingId: string,
    amountDelta: number,
    reason: string,
    actorRole: AppRole,
    actorId: string
  ): CashClosingAdjustment {
    if (!this.isOnline()) throw new Error('Connexion Internet requise.');
    if (actorRole !== 'manager') throw new Error('Seul le gérant peut ajouter un ajustement post-clôture.');
    if (amountDelta === 0) throw new Error('Le montant de l\'ajustement doit être différent de zéro.');
    if (!reason || reason.trim().length < 5) throw new Error('Un motif d\'au moins 5 caractères est obligatoire pour justifier l\'ajustement.');

    const closing = this.cashClosings.find((c) => c.id === closingId);
    if (!closing) throw new Error('Clôture introuvable.');

    const adjustment: CashClosingAdjustment = {
      id: `adj-${Date.now()}`,
      closing_id: closingId,
      amount_delta: amountDelta,
      reason: reason.trim(),
      created_by: actorId,
      created_at: new Date().toISOString(),
    };

    this.cashClosingAdjustments.unshift(adjustment);
    this.logAudit('add_closing_adjustment', 'cash_closing_adjustment', adjustment.id, actorRole, null, adjustment);
    return adjustment;
  }

  // Audit
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  private logAudit(
    action: string,
    entityType: string,
    entityId: string,
    actorRole: string,
    oldValues?: unknown,
    newValues?: unknown
  ) {
    this.auditLogs.unshift({
      id: Date.now() + Math.floor(Math.random() * 1000),
      actor_name: actorRole === 'manager' ? 'Gérant (Admin)' : 'Caissier Caisse 1',
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: (oldValues as Record<string, unknown>) || null,
      new_values: (newValues as Record<string, unknown>) || null,
      created_at: new Date().toISOString(),
    });
  }
}

export const salonStore = new SalonStore();
