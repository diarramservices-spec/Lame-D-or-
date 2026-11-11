import React, { useState } from 'react';
import {
  Scissors,
  Plus,
  Percent,
  AlertCircle,
  Edit2,
  Power,
  ShieldAlert,
} from 'lucide-react';
import { AppRole, ServiceItem } from '../../types';
import { salonStore } from '../../services/store';
import { formatFCFA, formatPercent } from '../../lib/format';

interface PrestationsViewProps {
  currentRole: AppRole;
  isOnline: boolean;
  onRefresh?: () => void;
}

export function PrestationsView({ currentRole, isOnline, onRefresh }: PrestationsViewProps) {
  const services = salonStore.getServices();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPrice, setCreatePrice] = useState<number>(3000);
  const [createRate, setCreateRate] = useState<number>(40);

  // Edit Service & Rate Modal
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editDescription, setEditDescription] = useState('');
  const [editRate, setEditRate] = useState<number>(40);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenEdit = (svc: ServiceItem) => {
    const activeRule = salonStore.getActiveRuleForService(svc.id);
    setEditingService(svc);
    setEditName(svc.name);
    setEditPrice(svc.current_price);
    setEditDescription(svc.description || '');
    setEditRate(activeRule ? activeRule.commission_rate : 40);
    setErrorMsg(null);
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (currentRole !== 'manager') {
      setErrorMsg('Seul le gérant est autorisé à créer ou modifier les prestations.');
      return;
    }

    try {
      salonStore.addService(createName, createPrice, createRate, createDescription, currentRole);
      setIsCreateModalOpen(false);
      setCreateName('');
      setCreateDescription('');
      setCreatePrice(3000);
      setCreateRate(40);
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setErrorMsg(null);

    if (currentRole !== 'manager') {
      setErrorMsg('Seul le gérant est autorisé à modifier les prestations.');
      return;
    }

    try {
      // 1. Update service details
      salonStore.updateService(
        editingService.id,
        {
          name: editName,
          price: editPrice,
          description: editDescription,
        },
        currentRole
      );

      // 2. Version commission rate if changed
      const currentActiveRule = salonStore.getActiveRuleForService(editingService.id);
      if (!currentActiveRule || currentActiveRule.commission_rate !== editRate) {
        salonStore.updateServiceRate(editingService.id, editRate, currentRole);
      }

      setEditingService(null);
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
    }
  };

  const handleToggleStatus = (svc: ServiceItem) => {
    try {
      salonStore.toggleServiceStatus(svc.id, currentRole);
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#232b3d]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <span>Catalogue des Prestations & Taux Versionnés</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Garantie d'immuabilité : Les modifications de tarif ou de taux n'altèrent jamais les snapshots des ventes déjà enregistrées.
          </p>
        </div>

        {currentRole === 'manager' && (
          <button
            onClick={() => {
              setIsCreateModalOpen(true);
              setErrorMsg(null);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#c29f2f] text-[#0b0e14] font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Prestation</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-700 text-red-200 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid of services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((svc) => {
          const activeRule = salonStore.getActiveRuleForService(svc.id);
          const currentRate = activeRule ? activeRule.commission_rate : 40;
          return (
            <div
              key={svc.id}
              className={`bg-[#121722] border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                svc.active ? 'border-[#202737] hover:border-[#323d54]' : 'border-red-950/40 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">{svc.name}</h3>
                    {!svc.active && (
                      <span className="text-[10px] font-semibold text-red-400 bg-red-950/60 border border-red-800 px-1.5 py-0.5 rounded">
                        Désactivée
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-[#E5C05B] tabular-nums whitespace-nowrap">
                    {formatFCFA(svc.current_price)}
                  </span>
                </div>
                {svc.description && (
                  <p className="text-xs text-slate-400 mt-2">{svc.description}</p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-[#1e2535] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Percent className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Taux barbier :</span>
                  <span className="font-bold text-emerald-400">{formatPercent(currentRate)}</span>
                </div>

                {currentRole === 'manager' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(svc)}
                      title={svc.active ? 'Désactiver' : 'Activer'}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        svc.active ? 'text-slate-500 hover:text-red-400' : 'text-emerald-400 hover:bg-emerald-950/40'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(svc)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181f2c] hover:bg-[#20293a] text-[11px] text-[#D4AF37] border border-[#2b354d]"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Modifier</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121722] border border-[#D4AF37]/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Ajouter une prestation</h3>
            <form onSubmit={handleCreateService} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Nom de la prestation :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Barbe VIP + Soin serviette"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Tarif catalogue (FCFA) :</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  required
                  value={createPrice}
                  onChange={(e) => setCreatePrice(Number(e.target.value))}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-white font-bold tabular-nums focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Taux de commission initial du barbier (%) :
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={createRate}
                  onChange={(e) => setCreateRate(Number(e.target.value))}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-white font-bold tabular-nums focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Description (Optionnel) :</label>
                <textarea
                  rows={2}
                  placeholder="Détails de la prestation..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D4AF37] text-[#0b0e14]"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121722] border border-[#D4AF37]/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#222938]">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#E5C05B]">
                  Administration Référentiel
                </span>
                <h3 className="font-bold text-white text-base">Modifier la prestation</h3>
              </div>
            </div>

            <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-[11px] text-amber-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Principe d'immuabilité :</strong> La modification du tarif ou du taux crée une nouvelle version. Toutes les ventes passées conservent leur snapshot originel scellé.
              </span>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Nom de la prestation :</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Tarif catalogue (FCFA) :</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-white font-bold tabular-nums focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Taux de commission du barbier (%) :
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={editRate}
                  onChange={(e) => setEditRate(Number(e.target.value))}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-white font-bold tabular-nums focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Si modifié, l'ancienne règle est archivée avec valid_to et la nouvelle est activée.
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Description :</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1e2535]">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D4AF37] text-[#0b0e14]"
                >
                  Enregistrer les Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
