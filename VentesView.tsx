import { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Ban,
  Printer,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { AppRole, Sale } from '../../types';
import { salonStore } from '../../services/store';
import {
  formatFCFA,
  formatPercent,
  formatDateTimeBamako,
  formatPaymentMethodLabel,
} from '../../lib/format';

interface VentesViewProps {
  currentRole: AppRole;
  isOnline: boolean;
  onRefresh?: () => void;
}

export function VentesView({ currentRole, isOnline, onRefresh }: VentesViewProps) {
  const barbers = salonStore.getBarbers();
  const sales = salonStore.getSales();

  const [selectedBarber, setSelectedBarber] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Cancellation modal state
  const [cancelSaleTarget, setCancelSaleTarget] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Selected receipt preview modal
  const [viewReceipt, setViewReceipt] = useState<Sale | null>(null);

  // Filter sales
  const filteredSales = sales.filter((s) => {
    if (selectedBarber !== 'all' && s.barber_id !== selectedBarber) return false;
    if (selectedMethod !== 'all' && s.payment_method !== selectedMethod) return false;
    if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchReceipt = s.receipt_number.toLowerCase().includes(term);
      const matchService = s.service_name_snapshot.toLowerCase().includes(term);
      if (!matchReceipt && !matchService) return false;
    }
    return true;
  });

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCancelError(null);
    if (!cancelSaleTarget) return;

    if (!isOnline) {
      setCancelError('Connexion Internet requise pour annuler une vente côté serveur.');
      return;
    }

    try {
      salonStore.cancelSale(cancelSaleTarget.id, cancelReason, currentRole, 'manager-1');
      setCancelSaleTarget(null);
      setCancelReason('');
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCancelError(err.message);
      } else {
        setCancelError('Erreur lors de l\'annulation.');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#232b3d]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <span>Journal des Ventes & Recettes</span>
            <span className="text-xs font-mono bg-[#1c2333] border border-[#2c374e] text-slate-300 px-2.5 py-0.5 rounded-full">
              {filteredSales.length} enregistrements
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Chaque ligne conserve les snapshots originaux (nom, tarif catalogue, taux et commission).
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#121722] border border-[#202737] rounded-2xl p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Rechercher par n° de reçu ou prestation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        {/* Barber Filter */}
        <select
          value={selectedBarber}
          onChange={(e) => setSelectedBarber(e.target.value)}
          aria-label="Filtrer par barbier"
          className="bg-[#0b0e14] border border-[#222938] text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
        >
          <option value="all">Tous les barbiers</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.full_name}
            </option>
          ))}
        </select>

        {/* Payment Filter */}
        <select
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          aria-label="Filtrer par moyen de paiement"
          className="bg-[#0b0e14] border border-[#222938] text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
        >
          <option value="all">Tous paiements</option>
          <option value="cash">Espèces</option>
          <option value="orange_money">Orange Money</option>
          <option value="moov_money">Moov Money</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          aria-label="Filtrer par statut"
          className="bg-[#0b0e14] border border-[#222938] text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
        >
          <option value="all">Tous statuts</option>
          <option value="completed">Validées</option>
          <option value="cancelled">Annulées</option>
        </select>
      </div>

      {/* Sales Table */}
      <div className="bg-[#121722] border border-[#202737] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0e121a] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1f2637]">
              <tr>
                <th className="px-4 py-3.5">Reçu / Date</th>
                <th className="px-4 py-3.5">Prestation</th>
                <th className="px-4 py-3.5">Barbier</th>
                <th className="px-4 py-3.5">Montant Encaissé</th>
                <th className="px-4 py-3.5">Commission</th>
                <th className="px-4 py-3.5">Paiement</th>
                <th className="px-4 py-3.5">Statut</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2232]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Aucune vente ne correspond aux critères sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const barber = barbers.find((b) => b.id === sale.barber_id);
                  const isCancelled = sale.status === 'cancelled';
                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-[#161c29] transition-colors ${
                        isCancelled ? 'opacity-60 bg-red-950/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-semibold text-white block">
                          {sale.receipt_number}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatDateTimeBamako(sale.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-white block">
                          {sale.service_name_snapshot}
                        </span>
                        {sale.price_override_reason && (
                          <span className="text-[10px] text-amber-400 block truncate max-w-[150px]">
                            Dérogatoire : {sale.price_override_reason}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {barber ? barber.full_name : 'Inconnu'}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#E5C05B] tabular-nums whitespace-nowrap">
                        {formatFCFA(sale.amount_received)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-emerald-400 tabular-nums">
                          {formatFCFA(sale.commission_amount)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">
                          ({formatPercent(sale.commission_rate_snapshot)})
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[11px] text-slate-300">
                          {formatPaymentMethodLabel(sale.payment_method)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Annulée</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Complétée</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewReceipt(sale)}
                            title="Voir reçu"
                            className="p-1.5 rounded-lg bg-[#1c2333] hover:bg-[#252f44] text-slate-300 hover:text-white transition-all"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[#D4AF37]" />
                          </button>
                          {currentRole === 'manager' && !isCancelled && (
                            <button
                              onClick={() => {
                                setCancelSaleTarget(sale);
                                setCancelReason('');
                                setCancelError(null);
                              }}
                              title="Annuler cette vente"
                              className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-all"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancelSaleTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121722] border border-red-800/80 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-white text-base">Annulation de Vente</h3>
                <span className="text-xs text-red-300 font-mono">
                  {cancelSaleTarget.receipt_number} — {formatFCFA(cancelSaleTarget.amount_received)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Conformément aux règles contractuelles : la vente n'est jamais supprimée physiquement. Elle sera marquée{' '}
              <strong className="text-red-400">cancelled</strong> et exclue des commissions dues et du tiroir-caisse.
            </p>

            {cancelError && (
              <div className="p-2.5 rounded-lg bg-red-950 text-red-200 text-xs border border-red-700">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Motif obligatoire d'annulation (min. 5 caractères) :
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex : Erreur de prestation saisie, client a changé d'avis..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelSaleTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-[#1a2130] transition-all"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={!isOnline || cancelReason.trim().length < 5}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                    !isOnline || cancelReason.trim().length < 5
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                  }`}
                >
                  {!isOnline ? 'Annulation bloquée (Hors-ligne)' : 'Confirmer l\'Annulation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket / Reçu Modal */}
      {viewReceipt && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e121a] border border-[#D4AF37]/40 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative font-mono text-xs">
            <div className="text-center pb-3 border-b border-dashed border-[#2b354d]">
              <h2 className="text-base font-bold text-white tracking-widest uppercase">LAME D'OR</h2>
              <p className="text-[10px] text-slate-400">Salon de Coiffure & Soins VIP</p>
              <p className="text-[10px] text-slate-400">Bamako, Mali · Tél: +223 70 00 00 00</p>
            </div>

            <div className="space-y-1.5 py-2 border-b border-dashed border-[#2b354d]">
              <div className="flex justify-between">
                <span className="text-slate-400">Reçu N°:</span>
                <span className="text-white font-bold">{viewReceipt.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date/Heure:</span>
                <span className="text-slate-300">{formatDateTimeBamako(viewReceipt.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Prestation:</span>
                <span className="text-white">{viewReceipt.service_name_snapshot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Moyen paiement:</span>
                <span className="text-slate-300">{formatPaymentMethodLabel(viewReceipt.payment_method)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Statut:</span>
                <span className={viewReceipt.status === 'completed' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {viewReceipt.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="py-2 border-b border-dashed border-[#2b354d]">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-white">TOTAL PAYÉ :</span>
                <span className="text-[#E5C05B]">{formatFCFA(viewReceipt.amount_received)}</span>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-[10px] text-slate-400">Merci de votre visite à LAME D'OR !</p>
            </div>

            <div className="flex items-center justify-between pt-3">
              <button
                onClick={() => setViewReceipt(null)}
                className="px-3 py-1.5 rounded-lg bg-[#1a2130] text-slate-300 hover:text-white text-xs"
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-[#0b0e14] font-bold text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
