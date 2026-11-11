import { WifiOff, AlertTriangle, ShieldAlert } from 'lucide-react';

interface NetworkBannerProps {
  isOnline: boolean;
  unconfirmedSaleNotice?: {
    receiptNumber?: string;
    idempotencyKey: string;
    message: string;
  } | null;
  onDismissNotice?: () => void;
}

export function NetworkBanner({ isOnline, unconfirmedSaleNotice, onDismissNotice }: NetworkBannerProps) {
  if (isOnline && !unconfirmedSaleNotice) return null;

  return (
    <div className="flex flex-col">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-gradient-to-r from-red-950/95 via-red-900/90 to-red-950/95 border-b border-red-700/80 text-red-200 px-4 py-3 flex items-center justify-between text-sm shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900 rounded-xl text-red-100 shrink-0 border border-red-700">
              <WifiOff className="w-5 h-5 text-red-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide uppercase text-xs sm:text-sm">
                  Connexion Internet Indisponible (Mode dégradé bloquant)
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-900/80 text-red-200 border border-red-600">
                  Network-Only
                </span>
              </div>
              <p className="text-xs text-red-200/90 mt-0.5">
                Autorité serveur stricte : Aucune vente, règlement ou clôture ne peut être validé hors ligne. Aucun stockage local (IndexedDB/Background Sync) n'est autorisé.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-xs text-red-300 bg-red-900/60 px-3 py-1.5 rounded-lg border border-red-800">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Guichet sécurisé</span>
          </div>
        </div>
      )}

      {/* Unconfirmed Server Response Notice (Dropped connection during transaction) */}
      {unconfirmedSaleNotice && (
        <div className="bg-amber-950/95 border-b border-amber-600/80 text-amber-100 px-4 py-3 flex items-start sm:items-center justify-between text-sm shadow-xl">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-900/80 rounded-xl text-amber-200 shrink-0 border border-amber-600 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-amber-200 tracking-wide uppercase text-xs sm:text-sm">
                  Confirmation serveur non reçue — Vérification requise
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/80 text-amber-300 border border-amber-700">
                  Clé: {unconfirmedSaleNotice.idempotencyKey.slice(0, 8)}...
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5">
                {unconfirmedSaleNotice.message}
              </p>
            </div>
          </div>
          {onDismissNotice && (
            <button
              onClick={onDismissNotice}
              className="text-xs px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-200 rounded-lg border border-amber-700 ml-3 shrink-0"
            >
              Fermer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
