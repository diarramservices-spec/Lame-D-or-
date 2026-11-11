import {
  CreditCard,
  Receipt,
  Percent,
  Lock,
  Scissors,
  Users,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';
import { AppRole } from '../../types';

export type TabId =
  | 'caisse'
  | 'ventes'
  | 'commissions'
  | 'clotures'
  | 'prestations'
  | 'barbiers'
  | 'dashboard'
  | 'audit';

interface NavigationProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  currentRole: AppRole;
}

export function Navigation({ currentTab, onSelectTab, currentRole }: NavigationProps) {
  // Navigation tabs with role filtering
  const tabs = [
    {
      id: 'caisse' as TabId,
      label: 'Caisse',
      icon: CreditCard,
      allowed: ['manager', 'cashier'],
    },
    {
      id: 'ventes' as TabId,
      label: 'Ventes',
      icon: Receipt,
      allowed: ['manager', 'cashier', 'barber'],
    },
    {
      id: 'commissions' as TabId,
      label: 'Commissions',
      icon: Percent,
      allowed: ['manager', 'barber'],
    },
    {
      id: 'clotures' as TabId,
      label: 'Clôture Journalière',
      icon: Lock,
      allowed: ['manager'],
    },
    {
      id: 'dashboard' as TabId,
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowed: ['manager'],
    },
    {
      id: 'prestations' as TabId,
      label: 'Prestations',
      icon: Scissors,
      allowed: ['manager'],
    },
    {
      id: 'barbiers' as TabId,
      label: 'Barbiers',
      icon: Users,
      allowed: ['manager'],
    },
    {
      id: 'audit' as TabId,
      label: 'Journal d\'Audit',
      icon: ShieldCheck,
      allowed: ['manager'],
    },
  ];

  const visibleTabs = tabs.filter((t) => t.allowed.includes(currentRole));

  return (
    <nav className="bg-[#10141d] border-b border-[#222938] px-4">
      <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-[#D4AF37]/15 text-[#F3E5AB] border border-[#D4AF37]/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#181f2c]'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-[#D4AF37]' : 'text-slate-500'
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
