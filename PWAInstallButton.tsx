import React, { useState } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed or running standalone, suppress button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition shadow-sm"
        title="Installer l'application LAME D'OR sur votre écran d'accueil"
      >
        <Download className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">Installer l'App</span>
        <span className="sm:hidden">Installer</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 text-amber-300 border border-amber-500/20 hover:bg-white/10 transition"
          title="Installer sur iPhone ou iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Installer PWA</span>
          <span className="sm:hidden">Installer</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#111622] border border-amber-500/30 p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-base">Installer sur iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                Pour utiliser <strong className="text-amber-400 font-semibold">LAME D'OR</strong> en plein écran sur votre iPhone ou iPad :
              </p>

              <div className="space-y-3 bg-[#0B0E14] p-3.5 rounded-xl border border-gray-800 text-xs text-gray-300">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded bg-white/5 text-amber-400 shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <span>
                    1. Appuyez sur le bouton <strong>Partager</strong> dans la barre inférieure de Safari.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded bg-white/5 text-amber-400 shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <span>
                    2. Faites défiler et choisissez <strong>Sur l'écran d'accueil</strong>.
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-amber-400/80 mt-3 italic">
                * Note de sécurité : Même installée sur votre écran d'accueil, l'application requiert une connexion Internet active pour toutes les transactions financières.
              </p>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
