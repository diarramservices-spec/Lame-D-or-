import { ShieldCheck, History } from 'lucide-react';
import { AppRole } from '../../types';
import { salonStore } from '../../services/store';
import { formatDateTimeBamako } from '../../lib/format';

interface AuditViewProps {
  currentRole: AppRole;
}

export function AuditView({ currentRole }: AuditViewProps) {
  const logs = salonStore.getAuditLogs();

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="pb-3 border-b border-[#232b3d]">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          <span>Journal d'Audit Financier & Sécurité</span>
          <span className="text-xs font-mono bg-[#1c2333] border border-[#2c374e] text-slate-300 px-2.5 py-0.5 rounded-full">
            Append-Only
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Historique inaltérable de toutes les opérations sensibles (création de vente, annulation, règlement de commission, modification de tarif, clôture).
        </p>
      </div>

      <div className="bg-[#121722] border border-[#202737] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0e121a] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#1f2637]">
              <tr>
                <th className="px-4 py-3">Horodatage</th>
                <th className="px-4 py-3">Acteur</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entité</th>
                <th className="px-4 py-3">Données Consignées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2232]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#161c29] transition-colors">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                    {formatDateTimeBamako(log.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                    {log.actor_name || 'Système'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#1c2333] text-[#E5C05B] border border-[#2c374e]">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                    {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <pre className="text-[10px] text-slate-400 font-mono max-w-md truncate bg-[#0b0e14] p-1.5 rounded border border-[#1e2535]">
                      {JSON.stringify(log.new_values || log.old_values || {}, null, 1)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
