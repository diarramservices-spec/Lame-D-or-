import React, { useState } from 'react';
import {
  Scissors,
  User,
  Banknote,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Printer,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AppRole, PaymentMethod, Sale } from '../../types';
import { salonStore } from '../../services/store';
import { formatFCFA, formatPercent, formatPaymentMethodLabel } from '../../lib/format';

interface CaisseViewProps {
  currentRole: AppRole;
  isOnline: boolean;
  onSaleCreated?: () => void;
}

export function CaisseView({ currentRole, isOnline, onSaleCreated }: CaisseViewProps) {
  const barbers = salonStore.getBarbers().filter((b) => b.active);
  const services = salonStore.getServices().filter((s) => s.active);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id || '');
  const [selectedBarberId, setSelectedBarberId] = useState<string>(barbers[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState<number>(services[0]?.current_price || 3000);
  const [priceOverrideReason, setPriceOverrideReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentIdempotencyKey, setCurrentIdempotencyKey] = useState<string>(
    () => `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  // Current selected service & rule
  const selectedService = services.find((s) => s.id === selectedServiceId);
  const activeRule = selectedService ? salonStore.getActiveRuleForService(selectedService.id) : undefined;
  const rate = activeRule ? activeRule.commission_rate : 40;

  // Handle service change: auto-fill price
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const s = services.find((item) => item.id === serviceId);
    if (s) {
      setAmountReceived(s.current_price);
      setPriceOverrideReason('');
      setErrorMsg(null);
    }
  };

  const isPriceOverridden = selectedService && amountReceived !== selectedService.current_price;
  const previewCommission = Math.round((amountReceived * rate) / 100);

  const [unconfirmedNotice, setUnconfirmedNotice] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setUnconfirmedNotice(null);

    if (!isOnline) {
      setErrorMsg('Connexion Internet indisponible : Les écritures financières hors ligne sont formellement bloquées. Aucun stockage local (IndexedDB) n\'est utilisé.');
      return;
    }

    if (!selectedService || !selectedBarberId) {
      setErrorMsg('Veuillez sélectionner une prestation et un barbier.');
      return;
    }

    if (amountReceived <= 0) {
      setErrorMsg('Le montant encaissé doit être supérieur à 0 FCFA.');
      return;
    }

    if (isPriceOverridden && currentRole !== 'manager') {
      setErrorMsg('Seul le gérant est autorisé à enregistrer un montant différent du tarif catalogue.');
      return;
    }

    if (isPriceOverridden && (!priceOverrideReason || priceOverrideReason.trim().length === 0)) {
      setErrorMsg('Un motif obligatoire doit être renseigné pour justifier le tarif dérogatoire.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fingerprint = `${selectedBarberId}-${selectedServiceId}-${amountReceived}-${paymentMethod}`;

      const sale = salonStore.createSale({
        idempotencyKey: currentIdempotencyKey,
        requestFingerprint: fingerprint,
        barberId: selectedBarberId,
        serviceId: selectedService.id,
        amountReceived,
        paymentMethod,
        priceOverrideReason: isPriceOverridden ? priceOverrideReason : undefined,
        actorRole: currentRole,
        actorId: currentRole === 'manager' ? 'manager-1' : 'cashier-1',
      });

      setLastSale(sale);
      setUnconfirmedNotice(null);
      if (onSaleCreated) onSaleCreated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.toLowerCase().includes('connexion') || err.message.toLowerCase().includes('réseau') || !isOnline) {
          setUnconfirmedNotice(
            `Confirmation serveur non reçue — Vérification requise : La connexion a été interrompue. Veuillez consulter le journal des ventes récentes avant de ressaisir. Votre clé d'idempotence (${currentIdempotencyKey.slice(0, 16)}...) est conservée.`
          );
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg('Erreur lors de l\'enregistrement de la vente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setLastSale(null);
    setErrorMsg(null);
    setCurrentIdempotencyKey(`idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between pb-3 border-b border-[#232b3d]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <span>Terminal de Caisse (POS)</span>
            <span className="text-xs bg-[#D4AF37]/15 text-[#E5C05B] border border-[#D4AF37]/30 px-2 py-0.5 rounded-md font-mono">
              Enregistrement Direct Serveur
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Chaque encaissement génère un reçu certifié et consigne un snapshot immuable de la prestation.
          </p>
        </div>
      </div>

      {/* Confirmation Modal / Card when sale is successful */}
      {lastSale ? (
        <div className="bg-[#121722] border border-[#D4AF37]/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Vente validée par le serveur
                </span>
                <h3 className="text-xl font-bold text-white font-mono mt-0.5">
                  {lastSale.receipt_number}
                </h3>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c2333] hover:bg-[#252f44] text-xs font-medium text-slate-200 border border-[#2b354d] transition-all"
            >
              <Printer className="w-4 h-4 text-[#D4AF37]" />
              <span>Imprimer Reçu</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 p-4 rounded-xl bg-[#0b0e14] border border-[#1e2535]">
            <div>
              <span className="text-[11px] text-slate-400 block">Prestation</span>
              <span className="text-sm font-semibold text-white">{lastSale.service_name_snapshot}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Montant Encaissé</span>
              <span className="text-sm font-bold text-[#E5C05B] tabular-nums">
                {formatFCFA(lastSale.amount_received)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Commission Barbier ({formatPercent(lastSale.commission_rate_snapshot)})</span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                {formatFCFA(lastSale.commission_amount)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Moyen de Paiement</span>
              <span className="text-sm font-medium text-slate-200">
                {formatPaymentMethodLabel(lastSale.payment_method)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#bfa030] text-[#0B0E14] font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Nouvel Encaissement</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs sm:text-sm flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {unconfirmedNotice && (
            <div className="p-4 rounded-xl bg-amber-950/80 border border-amber-600/80 text-amber-200 text-xs sm:text-sm space-y-1.5">
              <div className="flex items-center gap-2 text-amber-300 font-bold uppercase tracking-wider text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Confirmation serveur non reçue — Vérification requise</span>
              </div>
              <p className="text-amber-200/90 leading-relaxed">
                {unconfirmedNotice}
              </p>
              <div className="pt-1 flex items-center gap-2 text-[11px] font-mono text-amber-400">
                <span>Clé conservée :</span>
                <span className="bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/60">
                  {currentIdempotencyKey}
                </span>
              </div>
            </div>
          )}

          {/* 1. Prestation Selection */}
          <div className="bg-[#121722] border border-[#202737] rounded-2xl p-4 sm:p-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#E5C05B] mb-3 flex items-center gap-1.5">
              <Scissors className="w-4 h-4 text-[#D4AF37]" />
              <span>1. Choisir la prestation</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {services.map((svc) => {
                const isSelected = svc.id === selectedServiceId;
                const r = salonStore.getActiveRuleForService(svc.id);
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => handleServiceChange(svc.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#1a2130] border-[#D4AF37] shadow-md shadow-[#D4AF37]/5'
                        : 'bg-[#0b0e14] border-[#1d2331] hover:border-[#2f394e]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-white">{svc.name}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-[#D4AF37]" />}
                      </div>
                      {svc.description && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{svc.description}</p>
                      )}
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#1a2130] flex items-center justify-between text-xs">
                      <span className="text-[#E5C05B] font-bold tabular-nums">{formatFCFA(svc.current_price)}</span>
                      <span className="text-slate-400">Comm : {r ? formatPercent(r.commission_rate) : '40%'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Barbier Selection */}
          <div className="bg-[#121722] border border-[#202737] rounded-2xl p-4 sm:p-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#E5C05B] mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#D4AF37]" />
              <span>2. Choisir le barbier réalisateur</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {barbers.map((barber) => {
                const isSelected = barber.id === selectedBarberId;
                return (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => setSelectedBarberId(barber.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1a2130] border-[#D4AF37] shadow-sm'
                        : 'bg-[#0b0e14] border-[#1d2331] hover:border-[#2f394e]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs sm:text-sm text-white truncate block">
                        {barber.full_name}
                      </span>
                      {isSelected && <CheckCircle className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{barber.phone || 'Salon'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Encaissement & Règlement */}
          <div className="bg-[#121722] border border-[#202737] rounded-2xl p-4 sm:p-5 space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#E5C05B] flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-[#D4AF37]" />
              <span>3. Montant et moyen de paiement</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Montant encaissé */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Montant réellement encaissé (FCFA)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={amountReceived || ''}
                    onChange={(e) => setAmountReceived(Number(e.target.value))}
                    className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3.5 py-2.5 text-white font-bold text-base focus:border-[#D4AF37] focus:outline-none tabular-nums"
                  />
                  <span className="absolute right-3.5 top-3 text-xs text-slate-400 font-semibold">FCFA</span>
                </div>
                {isPriceOverridden && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    Tarif dérogatoire détecté (Prix catalogue : {formatFCFA(selectedService?.current_price || 0)})
                  </p>
                )}
              </div>

              {/* Moyen de paiement */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Moyen de paiement déclaré</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium text-center transition-all ${
                      paymentMethod === 'cash'
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#F3E5AB]'
                        : 'bg-[#0b0e14] border-[#1d2331] text-slate-400'
                    }`}
                  >
                    Espèces
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('orange_money')}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium text-center transition-all ${
                      paymentMethod === 'orange_money'
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                        : 'bg-[#0b0e14] border-[#1d2331] text-slate-400'
                    }`}
                  >
                    Orange Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('moov_money')}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium text-center transition-all ${
                      paymentMethod === 'moov_money'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-[#0b0e14] border-[#1d2331] text-slate-400'
                    }`}
                  >
                    Moov Money
                  </button>
                </div>
              </div>
            </div>

            {/* Motif dérogatoire si prix modifié */}
            {isPriceOverridden && (
              <div className="pt-2 border-t border-[#1d2433]">
                <label className="text-xs text-amber-300 font-medium block mb-1">
                  Motif obligatoire de dérogation (Gérant requis) :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Geste commercial, client régulier, réduction groupe..."
                  value={priceOverrideReason}
                  onChange={(e) => setPriceOverrideReason(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-amber-600/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            )}

            {/* Live calculation summary */}
            <div className="bg-[#0b0e14] rounded-xl p-3.5 border border-[#1e2535] flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block">Estimation Commission ({formatPercent(rate)})</span>
                <span className="text-emerald-400 font-bold text-sm tabular-nums">
                  {formatFCFA(previewCommission)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Part Salon</span>
                <span className="text-[#E5C05B] font-bold text-sm tabular-nums">
                  {formatFCFA(amountReceived - previewCommission)}
                </span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !isOnline}
              className={`w-full py-4 rounded-xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
                !isOnline
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-[#D4AF37] via-[#AA820A] to-[#D4AF37] text-[#0B0E14] hover:opacity-95 active:scale-[0.99] cursor-pointer'
              }`}
            >
              {!isOnline ? (
                <span>Validation Bloquée (Hors-Ligne)</span>
              ) : isSubmitting ? (
                <span>Validation Serveur en cours...</span>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Valider l'Encaissement ({formatFCFA(amountReceived)})</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-2">
              Le calcul de la commission et le numéro de reçu sont certifiés de manière atomique par le serveur PostgreSQL.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
