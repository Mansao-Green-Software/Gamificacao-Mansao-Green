import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Plus, Loader2 } from "lucide-react";

export default function AdminMatchSync({ onSynced }) {
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [form, setForm] = useState({ home_team: "", away_team: "", match_date: "", stage: "Fase de Grupos" });
  const [saving, setSaving] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setMsg("");
    try {
      const res = await base44.functions.invoke("syncWorldCupMatches", {});
      setMsg(res.data?.message || res.data?.error || "Concluído");
      if (onSynced) onSynced();
    } catch (e) {
      setMsg("Erro: " + (e.response?.data?.error || e.message));
    } finally {
      setSyncing(false);
    }
  };

  const handleManualAdd = async () => {
    if (!form.home_team || !form.away_team || !form.match_date) return;
    setSaving(true);
    await base44.entities.BolaoMatch.create({
      ...form,
      match_id: `manual_${Date.now()}`,
      status: "agendado",
    });
    setForm({ home_team: "", away_team: "", match_date: "", stage: "Fase de Grupos" });
    setSaving(false);
    setShowManual(false);
    if (onSynced) onSynced();
  };

  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-sm">Administrar Jogos</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowManual(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Manual
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sincronizar API
          </button>
        </div>
      </div>
      {msg && <p className="text-green-400 text-xs">{msg}</p>}

      {showManual && (
        <div className="space-y-2 pt-2 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Time Casa"
              value={form.home_team}
              onChange={e => setForm(f => ({ ...f, home_team: e.target.value }))}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
            <input
              placeholder="Time Visitante"
              value={form.away_team}
              onChange={e => setForm(f => ({ ...f, away_team: e.target.value }))}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="datetime-local"
              value={form.match_date}
              onChange={e => setForm(f => ({ ...f, match_date: e.target.value }))}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
            <input
              placeholder="Fase (ex: Grupo A)"
              value={form.stage}
              onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <button
            onClick={handleManualAdd}
            disabled={saving}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Adicionar Jogo"}
          </button>
        </div>
      )}
    </div>
  );
}