import { useState } from 'react';
import {
  TrendingUp,
  Banknote,
  Percent,
  Download,
  Printer,
  Calendar,
  Filter,
  Users,
  CheckCircle,
  Archive,
  FolderDown,
  FileCode,
  X,
  Copy,
  ExternalLink,
  Check,
} from 'lucide-react';
import { AppRole } from '../../types';
import { salonStore } from '../../services/store';
import {
  getFilteredReportMetrics,
  generateSalesCSV,
  ReportPeriod,
} from '../../services/reports';
import { formatFCFA, formatPercent, getTodayBamako } from '../../lib/format';

interface DashboardViewProps {
  currentRole: AppRole;
  isOnline: boolean;
}

export function DashboardView({ currentRole }: DashboardViewProps) {
  const barbers = salonStore.getBarbers();
  const closings = salonStore.getCashClosings();
  const today = getTodayBamako();
  const isTodayClosed = closings.some((c) => c.business_date === today && c.status === 'validated');

  const [period, setPeriod] = useState<ReportPeriod>('all');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showZipModal, setShowZipModal] = useState<boolean>(false);
  const [downloadingZip, setDownloadingZip] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleDownloadZip = async (filename: string) => {
    setDownloadingZip(filename);
    try {
      const res = await fetch(`/${filename}`);
      if (!res.ok) throw new Error('Fichier introuvable');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
    } catch {
      window.open(`${window.location.origin}/${filename}`, '_blank');
    } finally {
      setDownloadingZip(null);
    }
  };

  const copyDirectUrl = (filename: string) => {
    const url = `${window.location.origin}/${filename}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(filename);
    setTimeout(() => setCopiedLink(null), 3000);
  };

  const metrics = getFilteredReportMetrics({
    period,
    barberId: selectedBarberId,
    paymentMethod: selectedPaymentMethod,
  });

  const handleExportCSV = () => {
    const csvData = generateSalesCSV({
      period,
      barberId: selectedBarberId,
      paymentMethod: selectedPaymentMethod,
    });

    const blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LAME_DOR_Rapport_${period}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#232b3d]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <span>Tableau de Bord & Performance Financière</span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono border ${
                isTodayClosed
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-700 text-amber-300'
              }`}
            >
              {isTodayClosed ? 'Caisse du jour : Clôturée' : 'Caisse du jour : Ouverte'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Agrégats certifiés côté serveur · Les ventes annulées et règlements renversés sont strictement exclus.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#181f2c] hover:bg-[#222b3d] text-slate-200 border border-[#2b354d] text-xs font-semibold transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Imprimer Rapport</span>
          </button>
          <button
            onClick={() => setShowZipModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 text-amber-300 border border-amber-500/40 font-bold text-xs shadow transition-all cursor-pointer"
            title="Télécharger les archives ZIP (Code source & Build production pour hébergement)"
          >
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span>Télécharger ZIP</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#c29f2f] text-[#0b0e14] font-bold text-xs shadow transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#121722] border border-[#202737] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-[#0b0e14] p-1 rounded-xl border border-[#1e2535]">
          <button
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === 'today'
                ? 'bg-[#D4AF37] text-[#0b0e14] font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setPeriod('7days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === '7days'
                ? 'bg-[#D4AF37] text-[#0b0e14] font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            7 Derniers Jours
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === 'month'
                ? 'bg-[#D4AF37] text-[#0b0e14] font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ce Mois
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === 'all'
                ? 'bg-[#D4AF37] text-[#0b0e14] font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Historique Complet
          </button>
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Barber filter */}
          <select
            value={selectedBarberId}
            onChange={(e) => setSelectedBarberId(e.target.value)}
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

          {/* Payment filter */}
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            aria-label="Filtrer par mode de règlement"
            className="bg-[#0b0e14] border border-[#222938] text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="all">Tous paiements</option>
            <option value="cash">Espèces</option>
            <option value="orange_money">Orange Money</option>
            <option value="moov_money">Moov Money</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chiffre d'Affaires Brut */}
        <div className="bg-[#121722] border border-[#202737] rounded-2xl p-5 shadow-lg">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Chiffre d'Affaires Brut
          </span>
          <span className="text-2xl font-bold text-white mt-2 block tabular-nums">
            {formatFCFA(metrics.totalCA)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {metrics.salesCount} prestations encaissées
          </span>
        </div>

        {/* Marge Nette Salon */}
        <div className="bg-[#121722] border border-[#202737] rounded-2xl p-5 shadow-lg">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E5C05B] block">
            Part Nette Salon (Marge)
          </span>
          <span className="text-2xl font-bold text-[#E5C05B] mt-2 block tabular-nums">
            {formatFCFA(metrics.netSalon)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            Après déduction commissions barbiers
          </span>
        </div>

        {/* Commissions Réglées */}
        <div className="bg-[#121722] border border-[#202737] rounded-2xl p-5 shadow-lg">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block">
            Commissions Réglées
          </span>
          <span className="text-2xl font-bold text-emerald-400 mt-2 block tabular-nums">
            {formatFCFA(metrics.totalCommissionsPaid)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            Versées sur la période
          </span>
        </div>

        {/* Commissions Dues */}
        <div className="bg-[#121722] border border-[#202737] rounded-2xl p-5 shadow-lg">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
            Commissions Dues (Restant)
          </span>
          <span className="text-2xl font-bold text-amber-400 mt-2 block tabular-nums">
            {formatFCFA(metrics.totalBalanceDue)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            Solde net restant à verser
          </span>
        </div>
      </div>

      {/* Row 2 : Payment breakdown & Barber performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-[#121722] border border-[#202737] rounded-2xl p-5 shadow-xl">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#E5C05B] mb-4">
            Ventilation des Encaissements
          </h2>
          <div className="space-y-4 text-xs">
            {/* Cash */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-white font-medium">Espèces (Tiroir-caisse physique)</span>
                <span className="text-white font-bold tabular-nums">
                  {formatFCFA(metrics.totalCash)} ({metrics.totalCA > 0 ? ((metrics.totalCash / metrics.totalCA) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="w-full bg-[#0b0e14] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#D4AF37] h-full rounded-full transition-all"
                  style={{ width: `${metrics.totalCA > 0 ? (metrics.totalCash / metrics.totalCA) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Orange Money */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-orange-400 font-medium">Orange Money (Compte marchand)</span>
                <span className="text-white font-bold tabular-nums">
                  {formatFCFA(metrics.totalOrange)} ({metrics.totalCA > 0 ? ((metrics.totalOrange / metrics.totalCA) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="w-full bg-[#0b0e14] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all"
                  style={{ width: `${metrics.totalCA > 0 ? (metrics.totalOrange / metrics.totalCA) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Moov Money */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-blue-400 font-medium">Moov Money (Compte marchand)</span>
                <span className="text-white font-bold tabular-nums">
                  {formatFCFA(metrics.totalMoov)} ({metrics.totalCA > 0 ? ((metrics.totalMoov / metrics.totalCA) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="w-full bg-[#0b0e14] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${metrics.totalCA > 0 ? (metrics.totalMoov / metrics.totalCA) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Barber Rankings & Balances */}
        <div className="bg-[#121722] border border-[#202737] rounded-2xl p-5 shadow-xl">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#E5C05B] mb-4">
            Performances Individuelles des Barbiers
          </h2>
          <div className="space-y-3">
            {metrics.barbers.map((b) => (
              <div
                key={b.barber_id}
                className="bg-[#0b0e14] border border-[#1e2535] rounded-xl p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block">{b.barber_name}</span>
                  <span className="text-[11px] text-slate-400">
                    {b.sales_count} coupes · CA : {formatFCFA(b.total_generated_ca)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold block tabular-nums">
                    {formatFCFA(b.commissions_earned)} générées
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Dû : <strong className="text-amber-400">{formatFCFA(b.balance_due)}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Official Print Report Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e121a] border border-[#D4AF37]/50 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-mono text-xs text-slate-200">
            <div className="text-center pb-4 border-b border-dashed border-[#2b354d]">
              <h2 className="text-lg font-bold text-white tracking-widest uppercase font-serif">
                LAME D'OR — BAMAKO
              </h2>
              <p className="text-[11px] text-[#E5C05B] font-bold">RAPPORT DE GESTION & CHIFFRE D'AFFAIRES</p>
              <p className="text-[10px] text-slate-400">Diarra Multi Services · Date : {today}</p>
              <p className="text-[10px] text-slate-400">Filtre période : {period.toUpperCase()}</p>
            </div>

            <div className="space-y-2 py-3 border-b border-dashed border-[#2b354d]">
              <div className="flex justify-between font-bold text-white">
                <span>Chiffre d'Affaires Brut :</span>
                <span className="text-[#E5C05B]">{formatFCFA(metrics.totalCA)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>- Encaissements Espèces :</span>
                <span className="text-white">{formatFCFA(metrics.totalCash)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>- Encaissements Orange Money :</span>
                <span className="text-white">{formatFCFA(metrics.totalOrange)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>- Encaissements Moov Money :</span>
                <span className="text-white">{formatFCFA(metrics.totalMoov)}</span>
              </div>
              <div className="pt-2 border-t border-[#1e2535] flex justify-between font-bold text-emerald-400">
                <span>Total Commissions Barbiers :</span>
                <span>{formatFCFA(metrics.totalCommissionsEarned)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#E5C05B]">
                <span>Marge Nette Salon LAME D'OR :</span>
                <span>{formatFCFA(metrics.netSalon)}</span>
              </div>
            </div>

            {/* Barber breakdown summary */}
            <div className="space-y-1.5 py-2">
              <span className="font-bold text-white block mb-1">Détail par Barbier :</span>
              {metrics.barbers.map((b) => (
                <div key={b.barber_id} className="flex justify-between text-[11px]">
                  <span>{b.barber_name} ({b.sales_count} coupes) :</span>
                  <span className="text-slate-300">
                    CA {formatFCFA(b.total_generated_ca)} · Comm {formatFCFA(b.commissions_earned)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-[#2b354d]">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 rounded-xl bg-[#1a2130] text-slate-300 text-xs font-medium"
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0b0e14] font-bold text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Project Archives ZIP Modal */}
      {showZipModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#10141e] border border-amber-500/40 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#222a3d]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide">
                    Télécharger les Archives du Projet
                  </h2>
                  <p className="text-xs text-slate-400">
                    LAME D'OR v2.0 · Fichiers prêts pour hébergement
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowZipModal(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1 : Code Source Complet */}
              <div className="bg-[#0b0e14] border border-[#202737] rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <FileCode className="w-4 h-4" />
                    <span>Code Source Complet</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Tout le code source React 19, TypeScript, Tailwind CSS, migrations PostgreSQL Supabase, tests Vitest et documentation.
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono block mt-2">
                    Taille : ~311 Ko · 70+ fichiers
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadZip('lamedor-source-code.zip')}
                    disabled={downloadingZip === 'lamedor-source-code.zip'}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-[#0b0e14] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    <FolderDown className="w-4 h-4" />
                    <span>
                      {downloadingZip === 'lamedor-source-code.zip'
                        ? 'Téléchargement...'
                        : 'Télécharger Source (.zip)'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyDirectUrl('lamedor-source-code.zip')}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#181f2c] hover:bg-[#222b3d] text-slate-300 border border-[#2b354d] text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedLink === 'lamedor-source-code.zip' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Lien copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Copier le lien direct</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(`${window.location.origin}/lamedor-source-code.zip`, '_blank')}
                      className="p-1.5 rounded-lg bg-[#181f2c] hover:bg-[#222b3d] text-slate-300 border border-[#2b354d] transition cursor-pointer"
                      title="Ouvrir dans un nouvel onglet"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Option 2 : Build Production Compilé */}
              <div className="bg-[#0b0e14] border border-amber-500/30 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-md shadow-amber-500/5">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <FolderDown className="w-4 h-4" />
                    <span>Build Web Prêt à l'Emploi</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Dossier <code>dist/</code> compilé et minifié (HTML, CSS, JS, PWA Service Worker et icônes). Prêt pour Vercel, Netlify ou cPanel.
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono block mt-2">
                    Taille : ~263 Ko · Production Ready
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadZip('lamedor-production-build.zip')}
                    disabled={downloadingZip === 'lamedor-production-build.zip'}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#D4AF37] hover:bg-[#c29f2f] text-[#0b0e14] font-bold text-xs flex items-center justify-center gap-2 shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {downloadingZip === 'lamedor-production-build.zip'
                        ? 'Téléchargement...'
                        : 'Télécharger Build (.zip)'}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyDirectUrl('lamedor-production-build.zip')}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#181f2c] hover:bg-[#222b3d] text-slate-300 border border-[#2b354d] text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedLink === 'lamedor-production-build.zip' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Lien copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copier le lien direct</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(`${window.location.origin}/lamedor-production-build.zip`, '_blank')}
                      className="p-1.5 rounded-lg bg-[#181f2c] hover:bg-[#222b3d] text-slate-300 border border-[#2b354d] transition cursor-pointer"
                      title="Ouvrir dans un nouvel onglet"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Deploy Instructions */}
            <div className="bg-[#080a0f] p-3.5 rounded-xl border border-gray-800 text-[11px] text-slate-300 space-y-1.5">
              <span className="font-semibold text-white block">🚀 Instructions rapides pour héberger :</span>
              <p>
                <strong>Option A (Recommandée — Vercel / Netlify)</strong> : Téléchargez le <em>Code Source (.zip)</em>, extrayez-le et liez votre dépôt Git. La commande de build est <code>npm run build</code>.
              </p>
              <p>
                <strong>Option B (Hébergement FTP / Apache / Nginx / cPanel)</strong> : Téléchargez le <em>Build Web (.zip)</em> et dézippez son contenu directement dans le dossier public de votre serveur (ex: <code>public_html/</code>).
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowZipModal(false)}
                className="px-4 py-2 rounded-xl bg-[#1c2333] hover:bg-[#252f44] text-xs font-medium text-slate-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
