import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Star, Plus, History, Trash2 } from "lucide-react";

const SECTORS = ["Social Media", "Audiovisual", "Tráfego", "Líder de Projeto", "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Gestão de IA"];

export default function ManagePoints() {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [missions, setMissions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState("add");
  const [allTransactions, setAllTransactions] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("Todos");
  const [form, setForm] = useState({ employee_id: "", points: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);

      const isAdmin = u.role === "admin";
      const [emps, txs, ms, allTxs] = await Promise.all([
        base44.entities.EmployeeProfile.list(),
        base44.entities.PointTransaction.list("-created_date", 200),
        base44.entities.Mission.filter({ is_active: true }),
        isAdmin ? base44.entities.PointTransaction.list("-created_date", 1000) : Promise.resolve([]),
      ]);
      const myProfile = emps.find(p => p.user_id === u.id || p.email === u.email);
      const mySector = myProfile?.sector;

      const isGerencia = mySector === "Gerência";
      const myExtraSectors = myProfile?.extra_sectors || [];
      const allMySectors = mySector ? [mySector, ...myExtraSectors] : [];

      const filtered = (isAdmin && !mySector)
        ? emps
        : emps.filter(e => {
            if (isGerencia) return e.role === "manager" || e.role === "supervisor";
            return allMySectors.includes(e.sector) && e.role !== "admin";
          });
      setEmployees(filtered);
      const filteredTxs = (isAdmin && !mySector) ? txs : txs.filter(t => allMySectors.includes(t.sector));
      setTransactions(filteredTxs);
      const filteredMissions = (isAdmin && !mySector) ? ms : ms.filter(m => allMySectors.includes(m.sector) || m.sector === "Todos");
      setMissions(filteredMissions);
      if (isAdmin) setAllTransactions(allTxs);
      setLoading(false);
    };
    load();
  }, []);

  const isAdmin = user?.role === "admin";

  const handleAddPoints = async () => {
    if (!form.employee_id || !form.points) return;
    setSaving(true);

    const emp = employees.find(e => e.user_id === form.employee_id || e.id === form.employee_id);
    const isManagerRole = emp?.role === "manager" || emp?.role === "admin";
    const transactionSector = isManagerRole ? "Gerência" : (emp?.sector || user?.sector);
    const tx = await base44.entities.PointTransaction.create({
      employee_id: emp?.user_id || form.employee_id,
      employee_name: emp?.full_name || "Desconhecido",
      sector: transactionSector,
      points: parseInt(form.points),
      type: "manual",
      description: form.description || "Pontuação manual",
      awarded_by_name: user?.full_name,
    });

    setTransactions(prev => [tx, ...prev]);
    setForm({ employee_id: "", points: "", description: "" });
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  const handleDeleteTx = async (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    setAllTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await base44.entities.PointTransaction.delete(id);
    } catch (e) {
      // já deletado ou não encontrado — ignora
    }
  };

  const getEmployeeTotalPoints = (userId) => {
    return transactions.filter(t => t.employee_id === userId).reduce((s, t) => s + (t.points || 0), 0);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (user?.role !== "admin" && user?.role !== "manager" && user?.role !== "supervisor") {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>Acesso restrito a gerentes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Star className="w-6 h-6 text-green-400" />
          Gerenciar Pontos
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {isAdmin ? "Gerencie pontos de todos os setores" : `Setor: ${user?.sector}`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-800 border border-gray-700 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("add")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "add" ? "bg-green-500 text-white" : "text-gray-400 hover:text-white"}`}
        >
          Adicionar Pontos
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "history" ? "bg-green-500 text-white" : "text-gray-400 hover:text-white"}`}
        >
          Histórico
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab("historyAll")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "historyAll" ? "bg-green-500 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Histórico Geral
          </button>
        )}
      </div>

      {/* Add points tab */}
      {tab === "add" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-400" />
              Adicionar Pontuação
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Colaborador</label>
                <select
                  value={form.employee_id}
                  onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione o colaborador</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.user_id || e.id}>{e.full_name} — {e.sector}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Selecionar Tarefa (opcional)</label>
                <select
                  onChange={e => {
                    const mission = missions.find(m => m.id === e.target.value);
                    if (mission) setForm(p => ({ ...p, points: String(mission.points), description: mission.title }));
                    else setForm(p => ({ ...p, points: "", description: "" }));
                  }}
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="">— Pontuação manual —</option>
                  {missions.map(m => (
                    <option key={m.id} value={m.id}>{m.title} ({m.points > 0 ? "+" : ""}{m.points} pts)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Pontos</label>
                <input
                  type="number"
                  value={form.points}
                  onChange={e => setForm(p => ({ ...p, points: e.target.value }))}
                  placeholder="Ex: 50"
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Motivo</label>
                <input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: Superou meta do mês"
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <button
                onClick={handleAddPoints}
                disabled={saving}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Adicionar Pontos"}
              </button>
              {success && (
                <p className="text-green-400 text-sm text-center">✓ Pontos adicionados com sucesso!</p>
              )}
            </div>
          </div>

          {/* Employee list with points */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4">Colaboradores e Pontos</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {employees.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Nenhum colaborador cadastrado no seu setor.</p>
              ) : (
                employees.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl">
                    <div>
                      <p className="text-white text-sm font-medium">{emp.full_name}</p>
                      <p className="text-gray-500 text-xs">{emp.sector}</p>
                    </div>
                    <span className="text-green-400 font-bold text-sm">
                      {getEmployeeTotalPoints(emp.user_id || emp.id).toLocaleString()} pts
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* History All tab - Admin only */}
      {tab === "historyAll" && isAdmin && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-white font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-green-400" />
              Histórico Geral de Pontuações
            </h3>
            <select
              value={historyFilter}
              onChange={e => setHistoryFilter(e.target.value)}
              className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-500"
            >
              <option value="Todos">Todos os setores</option>
              {["Social Media", "Audiovisual", "Tráfego", "Líder de Projeto", "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Affiliates", "Administrativo", "Gerência", "Saúde e Bem Estar", "Serviços Gerais", "TV Green", "Feira FC"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {allTransactions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhuma pontuação registrada ainda.</p>
          ) : (() => {
            const filtered = historyFilter === "Todos" ? allTransactions : allTransactions.filter(t => t.sector === historyFilter);
            return filtered.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Nenhuma pontuação neste setor.</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filtered.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-medium truncate">{tx.employee_name}</p>
                        <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded-full shrink-0">{tx.sector}</span>
                      </div>
                      <p className="text-gray-500 text-xs truncate">{tx.description || tx.mission_title || "—"}</p>
                      <p className="text-gray-600 text-xs">por {tx.awarded_by_name} · {new Date(tx.created_date).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <span className={`font-bold text-sm ${tx.points >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {tx.points >= 0 ? "+" : ""}{tx.points}
                      </span>
                      <button
                        onClick={() => handleDeleteTx(tx.id)}
                        className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* History tab */}
      {tab === "history" && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-green-400" />
            Histórico de Pontuações
          </h3>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhuma pontuação registrada ainda.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{tx.employee_name}</p>
                    <p className="text-gray-500 text-xs truncate">{tx.description || tx.mission_title || "—"}</p>
                    <p className="text-gray-600 text-xs">por {tx.awarded_by_name}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <div className="text-right">
                      <span className="text-green-400 font-bold text-sm">+{tx.points}</span>
                      <p className="text-gray-600 text-xs capitalize">{tx.type}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteTx(tx.id)}
                      className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}