import React, { useState } from 'react';
import {
  Percent,
  Banknote,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { AppRole, PaymentMethod } from '../../types';
import { salonStore } from '../../services/store';
import {
  formatFCFA,
  formatDateTimeBamako,
  formatPaymentMethodLabel,
} from '../../lib/format';

interface CommissionsViewProps {
  currentRole: AppRole;
  isOnline: boolean;
  onRefresh?: () => void;
}

export function CommissionsView({ currentRole, isOnline, onRefresh }: CommissionsViewProps) {
  const balances = salonStore.getCommissionBalances();
  const payments = salonStore.getCommissionPayments();

  // Payment form state
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reversal state
  const [reverseTargetId, setReverseTargetId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState<string>('');

  const targetBarberBalance = balances.find((b) => b.barber_id === selectedBarberId);

  const handleOpenPayment = (barberId: string) => {
    setSelectedBarberId(barberId);
    const b = balances.find((item) => item.barber_id === barberId);
    if (b) {
      setPaymentAmount(b.balance_due > 0 ? b.balance_due : 0);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isOnline) {
      setErrorMsg('Connexion requise pour valider un règlement.');
      return;
    }

    if (currentRole !== 'manager') {
      setErrorMsg('Seul le gérant peut effectuer des règlements de commission.');
      return;
    }

    try {
      const res = salonStore.createCommissionPayment({
        barberId: selectedBarberId,
        amount: paymentAmount,
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        actorRole: currentRole,
        actorId: 'manager-1',
      });

      setSuccessMsg(`Règlement de ${formatFCFA(res.payment.amount)} validé. Nouveau solde dû : ${formatFCFA(res.newBalance)}`);
      setSelectedBarberId('');
      setPaymentAmount(0);
      setReference('');
      setNotes('');
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Erreur lors du paiement.');
      }
    }
  };

  const handleReverseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reverseTargetId) return;

    if (!isOnline) {
      setErrorMsg('Connexion requise pour annuler un règlement.');
      return;
    }

    try {
      salonStore.reverseCommissionPayment(reverseTargetId, reverseReason, currentRole, 'manager-1');
      setReverseTargetId(null);
      setReverseReason('');
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-[#232b3d]">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          <span>Gestion des Commissions Barbiers</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Solde dû = Somme des commissions des ventes validées − Règlements enregistrés.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-700 text-red-200 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Balances Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.map((item) => {
          const hasDebt = item.balance_due > 0;
          return (
            <div
              key={item.barber_id}
              className="bg-[#121722] border border-[#202737] hover:border-[#323d54] rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white">{item.barber_name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {item.sales_count} coupes
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Commissions générées :</span>
                    <span className="text-slate-200 tabular-nums font-semibold">
                      {formatFCFA(item.total_earned)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Commissions déjà payées :</span>
                    <span className="text-slate-300 tabular-nums">
                      {formatFCFA(item.total_paid)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#1d2331] flex justify-between items-baseline">
                    <span className="font-semibold text-slate-300">Solde Net Dû :</span>
                    <span
                      className={`text-base font-bold tabular-nums ${
                        item.balance_due > 0
                          ? 'text-[#E5C05B]'
                          : item.balance_due < 0
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {formatFCFA(item.balance_due)}
                    </span>
                  </div>
                  {item.balance_due < 0 && (
                    <div className="mt-2 p-2 rounded bg-red-950/50 border border-red-800 text-[10px] text-red-300">
                      ⚠️ Régularisation requise : Solde négatif suite à une annulation de vente post-règlement.
                    </div>
                  )}
                </div>
              </div>

              {currentRole === 'manager' && (
                <div className="mt-5">
                  <button
                    onClick={() => handleOpenPayment(item.barber_id)}
                    disabled={item.balance_due <= 0}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      item.balance_due > 0
                        ? 'bg-[#D4AF37] hover:bg-[#c29f2f] text-[#0b0e14] shadow cursor-pointer'
                        : 'bg-[#181f2c] text-slate-600 cursor-not-allowed border border-[#202735]'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Régler la commission</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {selectedBarberId && targetBarberBalance && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121722] border border-[#D4AF37]/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#222938]">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#E5C05B]">
                  Paiement de Commission
                </span>
                <h3 className="text-lg font-bold text-white">{targetBarberBalance.barber_name}</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Solde Actuel Dû</span>
                <span className="text-sm font-bold text-[#E5C05B] tabular-nums">
                  {formatFCFA(targetBarberBalance.balance_due)}
                </span>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Montant à régler (FCFA) :
                </label>
                <input
                  type="number"
                  min="1"
                  max={targetBarberBalance.balance_due}
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3.5 py-2.5 text-white font-bold text-base focus:border-[#D4AF37] focus:outline-none tabular-nums"
                />
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(targetBarberBalance.balance_due)}
                    className="text-[11px] text-[#D4AF37] hover:underline"
                  >
                    Régler la totalité ({formatFCFA(targetBarberBalance.balance_due)})
                  </button>
                  {targetBarberBalance.balance_due > 2000 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(Math.floor(targetBarberBalance.balance_due / 2))}
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      · Acompte 50%
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Moyen de versement :
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="cash">Espèces (Dédit la caisse physique ce soir)</option>
                  <option value="orange_money">Orange Money (Compte externe)</option>
                  <option value="moov_money">Moov Money (Compte externe)</option>
                </select>
                {paymentMethod === 'cash' && (
                  <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Rappel : Ce montant sera automatiquement déduit du tiroir-caisse théorique lors de la clôture.
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Référence / Transaction (Optionnel) :
                </label>
                <input
                  type="text"
                  placeholder="Ex : N° transaction Orange Money ou Reçu interne"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Note / Observation (Optionnel) :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Semaine en cours, avance transport..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2535]">
                <button
                  type="button"
                  onClick={() => setSelectedBarberId('')}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={paymentAmount <= 0 || !isOnline}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow ${
                    !isOnline
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-[#D4AF37] hover:bg-[#c29f2f] text-[#0b0e14] cursor-pointer'
                  }`}
                >
                  {!isOnline ? 'Règlement bloqué (Hors-ligne)' : 'Confirmer le Règlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverse Modal */}
      {reverseTargetId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121722] border border-red-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Annuler ce Règlement de Commission</h3>
            <p className="text-xs text-slate-300">
              L'annulation rétablira immédiatement le montant dans le solde dû du barbier et inscrira une trace dans le journal d'audit.
            </p>
            <form onSubmit={handleReverseSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Motif d'annulation obligatoire :
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Erreur de saisie, mauvaise destination..."
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReverseTargetId(null)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={!isOnline || !reverseReason.trim()}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    !isOnline
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                  }`}
                >
                  {!isOnline ? 'Renversement bloqué (Hors-ligne)' : 'Confirmer le Renversement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-[#121722] border border-[#202737] rounded-2xl overflow-hidden shadow-xl mt-6">
        <div className="p-4 border-b border-[#202737] flex items-center justify-between">
          <h2 className="font-bold text-sm text-white flex items-center gap-2">
            <span>Historique des Règlements de Commissions</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {payments.length} règlements historisés
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0e121a] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1f2637]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Barbier</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Moyen</th>
                <th className="px-4 py-3">Référence / Note</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2232]">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Aucun règlement de commission enregistré pour l'instant.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const barber = balances.find((b) => b.barber_id === p.barber_id);
                  const isReversed = p.status === 'reversed';
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#161c29] transition-colors ${
                        isReversed ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatDateTimeBamako(p.paid_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        {barber ? barber.barber_name : p.barber_id}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-400 tabular-nums">
                        {formatFCFA(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatPaymentMethodLabel(p.payment_method)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {p.reference && <span className="font-mono text-white mr-1">[{p.reference}]</span>}
                        {p.notes || '-'}
                        {p.reversal_reason && (
                          <span className="block text-[10px] text-red-400">
                            Motif annulation : {p.reversal_reason}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isReversed ? 'bg-red-950 text-red-300' : 'bg-emerald-950 text-emerald-300'
                          }`}
                        >
                          {isReversed ? 'ANNULÉ' : 'PAYÉ'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {currentRole === 'manager' && !isReversed && (
                          <button
                            onClick={() => {
                              setReverseTargetId(p.id);
                              setReverseReason('');
                            }}
                            title="Annuler ce règlement"
                            className="p-1 rounded bg-[#1f2637] hover:bg-red-950 text-slate-400 hover:text-red-300 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
