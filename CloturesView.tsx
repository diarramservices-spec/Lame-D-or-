import React, { useState } from 'react';
import {
  Lock,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { AppRole, CashClosing } from '../../types';
import { salonStore } from '../../services/store';
import {
  formatFCFA,
  getTodayBamako,
  formatDateBamako,
  formatDateTimeBamako,
} from '../../lib/format';

interface CloturesViewProps {
  currentRole: AppRole;
  isOnline: boolean;
  onRefresh?: () => void;
}

export function CloturesView({ currentRole, isOnline, onRefresh }: CloturesViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayBamako());
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [closingNote, setClosingNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [reportClosing, setReportClosing] = useState<CashClosing | null>(null);

  const existingClosings = salonStore.getCashClosings();
  const isDateAlreadyClosed = existingClosings.some(
    (c) => c.business_date === selectedDate && c.status === 'validated'
  );

  const summary = salonStore.getClosingSummaryForDate(selectedDate);
  const expectedCash = openingCash + summary.cashSales - summary.cashCommissionPayments;
  const difference = countedCash - expectedCash;

  const handleValidateClosing = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isOnline) {
      setErrorMsg('Connexion requise : La clôture doit être enregistrée côté serveur.');
      return;
    }

    if (currentRole !== 'manager') {
      setErrorMsg('Seul le gérant est habilité à certifier la clôture journalière.');
      return;
    }

    try {
      const closing = salonStore.validateCashClosing({
        businessDate: selectedDate,
        openingCash,
        countedCash,
        note: closingNote.trim() || undefined,
        actorRole: currentRole,
        actorId: 'manager-1',
      });

      setSuccessMsg(`Clôture du ${selectedDate} validée avec succès.`);
      setReportClosing(closing);
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Erreur lors de la clôture.');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#232b3d]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <span>Clôture Quotidienne & Contrôle de Caisse</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Contrôle physique des espèces, ventilation des encaissements et certification comptable.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-[#121722] border border-[#202737] px-3 py-1.5 rounded-xl">
          <Calendar className="w-4 h-4 text-[#D4AF37]" />
          <input
            type="date"
            max={getTodayBamako()}
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            aria-label="Sélectionner la date métier"
            className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-700 text-red-200 text-xs sm:text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Closing Section */}
      {isDateAlreadyClosed ? (
        (() => {
          const closedDay = existingClosings.find((c) => c.business_date === selectedDate);
          const adjustments = closedDay ? salonStore.getClosingAdjustments(closedDay.id) : [];
          return (
            <div className="space-y-4">
              <div className="bg-[#121722] border border-emerald-600/40 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        La journée du {formatDateBamako(selectedDate)} est officiellement clôturée
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Le snapshot financier est scellé. Aucune nouvelle vente ni annulation directe n'est possible sur cette date.
                      </p>
                    </div>
                  </div>
                  {closedDay && (
                    <button
                      onClick={() => setReportClosing(closedDay)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1c2333] hover:bg-[#252f44] text-[#E5C05B] border border-[#2b354d] text-xs font-semibold"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Imprimer le Rapport Scellé</span>
                    </button>
                  )}
                </div>

                {closedDay && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 p-4 rounded-xl bg-[#0b0e14] border border-[#1e2535] text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Ventes Espèces</span>
                      <span className="font-bold text-white tabular-nums">{formatFCFA(closedDay.cash_sales)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Commissions Espèces</span>
                      <span className="font-bold text-amber-400 tabular-nums">-{formatFCFA(closedDay.cash_commission_payments)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Espèces Comptées</span>
                      <span className="font-bold text-white tabular-nums">{formatFCFA(closedDay.counted_cash)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Écart Constaté</span>
                      <span className={`font-bold tabular-nums ${closedDay.difference === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatFCFA(closedDay.difference)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Adjustments append-only section */}
              {closedDay && (
                <div className="bg-[#121722] border border-[#202737] rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between pb-3 border-b border-[#202737]">
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">
                        Ajustements Post-Clôture (Append-Only)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Consignation motivée d'erreurs ou décalages découverts après scellement de la journée.
                      </p>
                    </div>
                  </div>

                  {adjustments.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">
                      Aucun ajustement post-clôture enregistré pour cette journée.
                    </p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      {adjustments.map((adj) => (
                        <div key={adj.id} className="p-3 bg-[#0b0e14] border border-[#1e2535] rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-medium text-white block">{adj.reason}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{formatDateTimeBamako(adj.created_at)}</span>
                          </div>
                          <span className={`font-bold tabular-nums ${adj.amount_delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {adj.amount_delta > 0 ? `+${formatFCFA(adj.amount_delta)}` : formatFCFA(adj.amount_delta)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2 : Live Breakdown */}
          <div className="lg:col-span-2 space-y-4">
            {/* Ventilation par moyen de paiement */}
            <div className="bg-[#121722] border border-[#202737] rounded-2xl p-5 shadow-lg">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#E5C05B] mb-4">
                1. Recettes enregistrées au {formatDateBamako(selectedDate)} ({summary.salesCount} ventes)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#0b0e14] border border-[#1e2535] rounded-xl p-3.5">
                  <span className="text-[11px] text-slate-400 block">Ventes Espèces (Cash)</span>
                  <span className="text-base font-bold text-white tabular-nums">
                    {formatFCFA(summary.cashSales)}
                  </span>
                </div>
                <div className="bg-[#0b0e14] border border-[#1e2535] rounded-xl p-3.5">
                  <span className="text-[11px] text-orange-400 block">Orange Money</span>
                  <span className="text-base font-bold text-white tabular-nums">
                    {formatFCFA(summary.orangeSales)}
                  </span>
                </div>
                <div className="bg-[#0b0e14] border border-[#1e2535] rounded-xl p-3.5">
                  <span className="text-[11px] text-blue-400 block">Moov Money</span>
                  <span className="text-base font-bold text-white tabular-nums">
                    {formatFCFA(summary.moovSales)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1e2535] flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Total Chiffre d'Affaires Brut :</span>
                <span className="text-sm font-bold text-[#E5C05B] tabular-nums">
                  {formatFCFA(summary.totalSales)}
                </span>
              </div>
            </div>

            {/* Commissions sorties du tiroir */}
            <div className="bg-[#121722] border border-[#202737] rounded-2xl p-5 shadow-lg">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#E5C05B] mb-4">
                2. Déductions : Règlements de commissions effectués ce jour
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#0b0e14] border border-amber-900/40 rounded-xl p-3.5">
                  <span className="text-[11px] text-amber-300 block">Commissions réglées en Espèces</span>
                  <span className="text-base font-bold text-amber-400 tabular-nums">
                    -{formatFCFA(summary.cashCommissionPayments)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Dédit obligatoire de la caisse physique
                  </span>
                </div>
                <div className="bg-[#0b0e14] border border-[#1e2535] rounded-xl p-3.5">
                  <span className="text-[11px] text-slate-400 block">Commissions Orange Money</span>
                  <span className="text-base font-bold text-slate-200 tabular-nums">
                    {formatFCFA(summary.orangeCommissionPayments)}
                  </span>
                </div>
                <div className="bg-[#0b0e14] border border-[#1e2535] rounded-xl p-3.5">
                  <span className="text-[11px] text-slate-400 block">Commissions Moov Money</span>
                  <span className="text-base font-bold text-slate-200 tabular-nums">
                    {formatFCFA(summary.moovCommissionPayments)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3 : Formula & Counting Form */}
          <div className="bg-[#121722] border border-[#202737] rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#E5C05B] mb-3 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#D4AF37]" />
                <span>3. Rapprochement du Tiroir-Caisse</span>
              </h2>

              <form onSubmit={handleValidateClosing} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Fonds de caisse d'ouverture (FCFA) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={openingCash || ''}
                    onChange={(e) => setOpeningCash(Number(e.target.value))}
                    className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-white font-bold focus:border-[#D4AF37] focus:outline-none tabular-nums"
                  />
                </div>

                {/* Theoretical Cash Calculation */}
                <div className="bg-[#0b0e14] border border-[#202737] rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Fonds ouverture :</span>
                    <span className="tabular-nums">+{formatFCFA(openingCash)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Ventes espèces :</span>
                    <span className="tabular-nums">+{formatFCFA(summary.cashSales)}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 text-[11px]">
                    <span>Commissions payées (cash) :</span>
                    <span className="tabular-nums">-{formatFCFA(summary.cashCommissionPayments)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#1e2535] flex justify-between font-bold text-xs text-white">
                    <span>Espèces Théoriques Attendues :</span>
                    <span className="text-[#E5C05B] tabular-nums">{formatFCFA(expectedCash)}</span>
                  </div>
                </div>

                {/* Counted Cash input */}
                <div>
                  <label className="text-slate-200 font-bold block mb-1">
                    Espèces Physiques Réellement Comptées (FCFA) :
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={countedCash || ''}
                    onChange={(e) => setCountedCash(Number(e.target.value))}
                    placeholder="Billetage et pièces..."
                    className="w-full bg-[#0b0e14] border border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-white font-bold text-base focus:outline-none tabular-nums shadow-inner"
                  />
                </div>

                {/* Difference Badge */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    difference === 0
                      ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                      : difference > 0
                      ? 'bg-blue-950/40 border-blue-700 text-blue-300'
                      : 'bg-red-950/40 border-red-700 text-red-300'
                  }`}
                >
                  <span>Écart de Caisse :</span>
                  <span className="text-sm tabular-nums">
                    {difference > 0 ? `+${formatFCFA(difference)} (Excédent)` : difference < 0 ? `${formatFCFA(difference)} (Déficit)` : '0 FCFA (Équilibré)'}
                  </span>
                </div>

                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">
                    Note / Observation du gérant :
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex : RAS, monnaie d'appoint..."
                    value={closingNote}
                    onChange={(e) => setClosingNote(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!isOnline || currentRole !== 'manager'}
                  className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 ${
                    !isOnline || currentRole !== 'manager'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-[#D4AF37] hover:bg-[#c29f2f] text-[#0b0e14] cursor-pointer'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {!isOnline ? 'Clôture bloquée (Hors-ligne)' : 'Certifier & Clôturer la Journée'}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Historical Closings Table */}
      <div className="bg-[#121722] border border-[#202737] rounded-2xl overflow-hidden shadow-xl mt-8">
        <div className="p-4 border-b border-[#202737] flex items-center justify-between">
          <h2 className="font-bold text-sm text-white">Historique des Clôtures Validées</h2>
          <span className="text-xs text-slate-400 font-mono">
            {existingClosings.length} clôtures archivées
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0e121a] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1f2637]">
              <tr>
                <th className="px-4 py-3">Date Métier</th>
                <th className="px-4 py-3">Ventes Espèces</th>
                <th className="px-4 py-3">Orange Money</th>
                <th className="px-4 py-3">Moov Money</th>
                <th className="px-4 py-3">Commissions Cash</th>
                <th className="px-4 py-3">Espèces Comptées</th>
                <th className="px-4 py-3">Écart</th>
                <th className="px-4 py-3 text-right">Rapport</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2232]">
              {existingClosings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Aucune clôture n'a encore été enregistrée.
                  </td>
                </tr>
              ) : (
                existingClosings.map((c) => (
                  <tr key={c.id} className="hover:bg-[#161c29] transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">
                      {formatDateBamako(c.business_date)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatFCFA(c.cash_sales)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatFCFA(c.orange_money_sales)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatFCFA(c.moov_money_sales)}</td>
                    <td className="px-4 py-3 text-amber-400 tabular-nums">
                      -{formatFCFA(c.cash_commission_payments)}
                    </td>
                    <td className="px-4 py-3 font-bold text-white tabular-nums">
                      {formatFCFA(c.counted_cash)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold tabular-nums ${
                          c.difference === 0
                            ? 'text-emerald-400'
                            : c.difference > 0
                            ? 'text-blue-400'
                            : 'text-red-400'
                        }`}
                      >
                        {formatFCFA(c.difference)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setReportClosing(c)}
                        className="p-1 rounded bg-[#1e2535] hover:bg-[#283247] text-slate-300"
                        title="Imprimer rapport de clôture"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Closing Report Modal */}
      {reportClosing && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e121a] border border-[#D4AF37]/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="text-center pb-3 border-b border-dashed border-[#2b354d]">
              <h2 className="text-base font-bold text-white tracking-widest uppercase">
                RAPPORT OFFICIEL DE CLÔTURE
              </h2>
              <p className="text-[10px] text-slate-400">LAME D'OR — Diarra Multi Services</p>
              <p className="text-xs text-[#E5C05B] mt-1 font-bold">
                Date : {formatDateBamako(reportClosing.business_date)}
              </p>
            </div>

            <div className="space-y-2 py-2 border-b border-dashed border-[#2b354d]">
              <div className="flex justify-between">
                <span className="text-slate-400">Fonds d'ouverture :</span>
                <span className="text-white">{formatFCFA(reportClosing.opening_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ventes Espèces :</span>
                <span className="text-white">+{formatFCFA(reportClosing.cash_sales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400">Commissions Espèces :</span>
                <span className="text-amber-400">-{formatFCFA(reportClosing.cash_commission_payments)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-[#1a2130]">
                <span className="text-white">Espèces Théoriques :</span>
                <span className="text-[#E5C05B]">{formatFCFA(reportClosing.expected_cash)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-white">Espèces Comptées :</span>
                <span className="text-white">{formatFCFA(reportClosing.counted_cash)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-[#1a2130]">
                <span className="text-slate-300">Écart Constaté :</span>
                <span className={reportClosing.difference === 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {formatFCFA(reportClosing.difference)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 py-2 border-b border-dashed border-[#2b354d]">
              <div className="flex justify-between">
                <span className="text-orange-400">Orange Money Net :</span>
                <span className="text-white">{formatFCFA(reportClosing.orange_money_sales - reportClosing.orange_commission_payments)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">Moov Money Net :</span>
                <span className="text-white">{formatFCFA(reportClosing.moov_money_sales - reportClosing.moov_commission_payments)}</span>
              </div>
            </div>

            {reportClosing.note && (
              <p className="text-[11px] text-slate-400 italic">Note : {reportClosing.note}</p>
            )}

            <div className="flex justify-between pt-3">
              <button
                onClick={() => setReportClosing(null)}
                className="px-3 py-1.5 rounded-lg bg-[#1a2130] text-slate-300"
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-[#0b0e14] font-bold"
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
