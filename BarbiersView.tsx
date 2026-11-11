import React, { useState } from 'react';
import { Users, Plus, Phone, CheckCircle, XCircle, AlertCircle, Edit2, Shield } from 'lucide-react';
import { AppRole, Barber } from '../../types';
import { salonStore } from '../../services/store';

interface BarbiersViewProps {
  currentRole: AppRole;
  isOnline: boolean;
  onRefresh?: () => void;
}

export function BarbiersView({ currentRole, isOnline, onRefresh }: BarbiersViewProps) {
  const barbers = salonStore.getBarbers();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');

  // Edit Barber Modal
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenEdit = (barber: Barber) => {
    setEditingBarber(barber);
    setEditName(barber.full_name);
    setEditPhone(barber.phone || '');
    setErrorMsg(null);
  };

  const handleCreateBarber = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (currentRole !== 'manager') {
      setErrorMsg('Seul le gérant est autorisé à enregistrer un nouveau barbier.');
      return;
    }

    try {
      salonStore.addBarber(createName, createPhone, currentRole);
      setIsCreateModalOpen(false);
      setCreateName('');
      setCreatePhone('');
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarber) return;
    setErrorMsg(null);

    if (currentRole !== 'manager') {
      setErrorMsg('Seul le gérant est autorisé à modifier un barbier.');
      return;
    }

    try {
      salonStore.updateBarber(editingBarber.id, editName, editPhone, currentRole);
      setEditingBarber(null);
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
    }
  };

  const handleToggleStatus = (barberId: string) => {
    try {
      salonStore.toggleBarberStatus(barberId, currentRole);
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
            <span>Gestion de l'Équipe des Barbiers</span>
            <span className="text-xs font-mono bg-[#1c2333] border border-[#2c374e] text-slate-300 px-2.5 py-0.5 rounded-full">
              {barbers.length} barbiers
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Seul le gérant administre l'équipe. L'historique des modifications est tracé dans le journal d'audit.
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
            <span>Nouveau Barbier</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-700 text-red-200 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {barbers.map((barber) => (
          <div
            key={barber.id}
            className={`bg-[#121722] border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all ${
              barber.active ? 'border-[#202737]' : 'border-red-950/40 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-base text-white">{barber.full_name}</h3>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    barber.active
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {barber.active ? 'ACTIF' : 'INACTIF'}
                </span>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{barber.phone || 'Aucun numéro renseigné'}</span>
                </div>
              </div>
            </div>

            {currentRole === 'manager' && (
              <div className="mt-5 pt-3 border-t border-[#1d2331] flex items-center justify-between">
                <button
                  onClick={() => handleToggleStatus(barber.id)}
                  className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                    barber.active
                      ? 'text-red-400 hover:bg-red-950/50'
                      : 'text-emerald-400 hover:bg-emerald-950/50'
                  }`}
                >
                  {barber.active ? 'Désactiver' : 'Réactiver'}
                </button>
                <button
                  onClick={() => handleOpenEdit(barber)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#181f2c] hover:bg-[#20293a] text-[11px] text-[#D4AF37] border border-[#2b354d]"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Modifier</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121722] border border-[#D4AF37]/50 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Ajouter un barbier</h3>
            <form onSubmit={handleCreateBarber} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Nom complet :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Moussa Sissoko"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Téléphone (Optionnel) :</label>
                <input
                  type="text"
                  placeholder="+223 70 00 00 00"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-white focus:outline-none"
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

      {/* Edit Modal */}
      {editingBarber && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121722] border border-[#D4AF37]/50 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Modifier le barbier</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Nom complet :</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Téléphone :</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-[#0b0e14] border border-[#222938] rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1e2535]">
                <button
                  type="button"
                  onClick={() => setEditingBarber(null)}
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
    </div>
  );
}
