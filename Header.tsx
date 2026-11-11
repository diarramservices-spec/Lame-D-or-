import { Shield, User, Wifi, WifiOff, Scissors } from 'lucide-react';
import { AppRole } from '../../types';
import { formatRoleLabel } from '../../lib/format';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentRole: AppRole;
  onRoleChange: (role: AppRole) => void;
  isOnline: boolean;
  onToggleOnline: () => void;
}

export function Header({ currentRole, onRoleChange, isOnline, onToggleOnline }: HeaderProps) {
  return (
    <header className="bg-[#0e121a] border-b border-[#222938] px-4 sm:px-6 py-3 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] via-[#AA820A] to-[#604903] p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#0B0E14] rounded-[10px] flex items-center justify-center">
              <Scissors className="w-5 h-5 text-[#D4AF37]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-wider text-white uppercase font-serif">
                LAME D’OR
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#D4AF37]/15 text-[#E5C05B] border border-[#D4AF37]/30">
                BAMAKO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Diarra Multi Services · Système Caisse & Commissions
            </p>
          </div>
        </div>

        {/* Right Zone Controls: PWA install, Network toggle simulation & Role selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA In-App Install Prompt */}
          <PWAInstallButton />

          {/* Network Simulator Switch */}
          <button
            onClick={onToggleOnline}
            title={isOnline ? 'Cliquer pour simuler une coupure 4G' : 'Cliquer pour rétablir la connexion'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isOnline
                ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-red-950/60 border-red-600 text-red-300 hover:bg-red-900/50'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Connecté (Serveur OK)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Hors-ligne (Test)</span>
              </>
            )}
          </button>

          {/* Active Role Selector */}
          <div className="flex items-center gap-1.5 bg-[#141923] border border-[#232b3d] px-2 py-1 rounded-xl">
            <User className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as AppRole)}
              aria-label="Sélectionner le rôle actif"
              className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              <option value="manager" className="bg-[#141923] text-white">
                Rôle : Gérant
              </option>
              <option value="cashier" className="bg-[#141923] text-white">
                Rôle : Caissier
              </option>
              <option value="barber" className="bg-[#141923] text-white">
                Rôle : Barbier
              </option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
