import { X, TrendingUp, TrendingDown } from "lucide-react";
import { formatBRT } from "@/utils/dateUtils";

export default function EmployeeHistoryModal({ employee, transactions, onClose }) {
  if (!employee) return null;

  const empTxs = [...transactions]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const total = empTxs
    .filter(t => !t.description?.startsWith("Resgate:"))
    .reduce((s, t) => s + (t.points || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center shrink-0">
              {employee.photo_url ? (
                <img src={employee.photo_url} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 font-bold">{employee.name?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="text-white font-bold">{employee.name}</p>
              <p className="text-green-400 text-sm font-semibold">{total.toLocaleString()} pts no período</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {empTxs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhuma pontuação registrada.</p>
          ) : (
            empTxs.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.points >= 0 ? "bg-green-900/40" : "bg-red-900/40"}`}>
                  {tx.points >= 0
                    ? <TrendingUp className="w-4 h-4 text-green-400" />
                    : <TrendingDown className="w-4 h-4 text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{tx.mission_title || tx.description || "Pontuação manual"}</p>
                  <p className="text-gray-500 text-xs">por {tx.awarded_by_name || "Sistema"} · {formatBRT(tx.created_date)}</p>
                </div>
                <span className={`font-bold text-sm shrink-0 ${tx.points >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {tx.points >= 0 ? "+" : ""}{tx.points}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}