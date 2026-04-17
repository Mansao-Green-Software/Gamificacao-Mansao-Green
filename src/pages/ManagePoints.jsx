import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Star, Plus, History, Trash2, Search, X, ChevronDown } from "lucide-react";
import { formatBRT, nowBRT, dateToBRT } from "@/utils/dateUtils";

const SECTORS = ["Social Media", "Audiovisual", "Tráfego", "Líder de Projeto", "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Affiliates", "Administrativo", "Gerência", "Saúde e Bem Estar", "Serviços Gerais", "Feira FC", "TI", "IA/Automação"];

export default function ManagePoints() {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [missions, setMissions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState("add");
  const [allTransactions, setAllTransactions] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("Todos");
  const [historyEmployeeFilter, setHistoryEmployeeFilter] = useState("");
  const [historyAllSectorFilter, setHistoryAllSectorFilter] = useState("Todos");
  const [historyAllEmployeeFilter, setHistoryAllEmployeeFilter] = useState("");
  const [form, setForm] = useState({ employee_id: "", points: "", description: "", mission_id: "" });
  const [missionSearch, setMissionSearch] = useState("");
  const [missionDropdownOpen, setMissionDropdownOpen] = useState(false);
  const missionDropdownRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [subSectors, setSubSectors] = useState([]);
  const [selectedSubSector, setSelectedSubSector] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
      const u = await base44.auth.me();
      setUser(u);

      const isAdmin = u.role === "admin";
      const isDirector = u.role === "director";
      const [emps, txs, ms, allTxs, subs] = await Promise.all([
        base44.entities.EmployeeProfile.list(null, 1000),
        base44.entities.PointTransaction.list("-created_date", 500),
        base44.entities.Mission.filter({ is_active: true }),
        (isAdmin || isDirector) ? base44.entities.PointTransaction.list("-created_date", 1000) : Promise.resolve([]),
        base44.entities.SubSector.list(),
      ]);
      setSubSectors(subs);
      const myProfile = emps.find(p => (p.user_id && p.user_id === u.id) || p.email === u.email);
      const mySector = myProfile?.sector;

      const isGerencia = mySector === "Gerência";
      const myExtraSectors = myProfile?.extra_sectors || [];
      const allMySectors = mySector ? [mySector, ...myExtraSectors] : [];

      let filtered;
      if (isAdmin && !mySector) {
        filtered = emps;
      } else if (isDirector) {
        // Diretor vê apenas gerentes (exceto ele mesmo)
        filtered = emps.filter(e => e.role === "manager" && (e.user_id || e.id) !== u.id);
      } else {
        filtered = emps.filter(e => {
          // Nenhum usuário (exceto admin) pode dar ponto para si mesmo
          const empId = e.user_id || e.id;
          if (empId === u.id || e.email === u.email) return false;
          if (isGerencia) return e.role === "manager" || e.role === "supervisor";
          return allMySectors.includes(e.sector) && e.role !== "admin" && e.role !== "director";
        });
      }
      setEmployees(filtered);
      const filteredTxs = (isAdmin && !mySector) ? txs : isDirector ? txs.filter(t => t.sector === "Gerência") : txs.filter(t => allMySectors.includes(t.sector));
      setTransactions(filteredTxs);
      const filteredMissions = (isAdmin && !mySector) ? ms : isDirector ? ms.filter(m => m.sector === "Gerência" || m.sector === "Todos") : ms.filter(m => allMySectors.includes(m.sector) || m.sector === "Todos" || m.sector === "Supervisor");
      setMissions(filteredMissions);
      if (isAdmin || isDirector) setAllTransactions(allTxs);
      } catch (e) {
        console.error("ManagePoints load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isAdmin = user?.role === "admin";
  const isDirector = user?.role === "director";

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (missionDropdownRef.current && !missionDropdownRef.current.contains(e.target)) {
        setMissionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedEmployee = employees.find(e => e.user_id === form.employee_id || e.id === form.employee_id);

  // Check if a mission was already submitted for an employee in the current period
  const toBRT = (date) => dateToBRT(date);

  const isMissionSubmittedInPeriod = (missionId, missionTitle, employeeId, frequency) => {
    if (!frequency || !employeeId) return false;
    const now = toBRT(new Date());
    return transactions.some(t => {
      const missionMatch = t.mission_id === missionId || t.description === missionTitle || t.mission_title === missionTitle;
      if (!missionMatch) return false;
      if (t.employee_id !== employeeId) return false;
      const txBRT = toBRT(t.created_date);
      if (frequency === "Diária") {
        return txBRT.toDateString() === now.toDateString();
      }
      if (frequency === "Semanal") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return txBRT >= startOfWeek;
      }
      if (frequency === "Mensal") {
        return txBRT.getMonth() === now.getMonth() && txBRT.getFullYear() === now.getFullYear();
      }
      return false;
    });
  };

  const getEffectiveSector = (emp) => {
    if (!emp) return null;
    if (emp.role === "manager" || emp.role === "admin") return "Gerência";
    if (emp.role === "supervisor") {
      return emp.include_in_sector_ranking !== false ? emp.sector : "Supervisor";
    }
    return emp.sector;
  };

  const employeeEffectiveSector = getEffectiveSector(selectedEmployee);
  const employeeSubSectors = subSectors.filter(s => s.sector === employeeEffectiveSector);

  const filteredMissions = missions.filter(m => {
    const sectorMatch = !selectedEmployee || m.sector === employeeEffectiveSector || m.sector === "Todos";
    const searchMatch = !missionSearch || m.title.toLowerCase().includes(missionSearch.toLowerCase());
    const subSectorMatch = !selectedSubSector || m.sub_sector === selectedSubSector || !m.sub_sector;
    return sectorMatch && searchMatch && subSectorMatch;
  });

  const selectedMission = missions.find(m => m.id === form.mission_id);

  const handleEmployeeChange = (employeeId) => {
    setForm(p => ({ ...p, employee_id: employeeId, mission_id: "", points: "", description: "" }));
    setMissionSearch("");
    setSelectedSubSector("");
  };

  const MAX_POINTS = 300;

  const handleAddPoints = async () => {
    if (!form.employee_id || !form.points) return;
    // Bloqueia dar ponto para si mesmo (exceto admin)
    if (!isAdmin && form.employee_id === user?.id) {
      alert("Você não pode adicionar pontos para si mesmo.");
      return;
    }
    const pts = parseInt(form.points);
    if (pts > MAX_POINTS) {
      alert(`O limite máximo de pontos por tarefa é ${MAX_POINTS} pts.`);
      return;
    }
    setSaving(true);

    const emp = employees.find(e => e.user_id === form.employee_id || e.id === form.employee_id);
    const isManagerRole = emp?.role === "manager" || emp?.role === "admin";
    const transactionSector = isManagerRole ? "Gerência" : (emp?.sector || user?.sector);
    const response = await base44.functions.invoke('addPointTransaction', {
      employee_id: emp?.user_id || form.employee_id,
      employee_name: emp?.full_name || "Desconhecido",
      sector: transactionSector,
      points: pts,
      type: "manual",
      description: form.description || "Pontuação manual",
      awarded_by_name: user?.full_name,
    });
    const tx = response.data;

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

  if (user?.role !== "admin" && user?.role !== "manager" && user?.role !== "supervisor" && user?.role !== "director") {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>Acesso restrito a gerentes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-md font-bold text-white flex items-center gap-2 uppercase">
          <Star className="w-6 h-6 text-green-400" />
          Gerenciar Pontos
        </h1>
        <p className="text-gray-400 text-xs mt-1">
          {isAdmin ? "Gerencie pontos de todos os setores" : `Setor: ${user?.sector}`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-900/40 border border-gray-700 rounded-xl p-1 w-full sm:w-fit">
        {[
          { id: "add", label: "Adicionar Pontos" },
          { id: "history", label: "Histórico" },
          ...((isAdmin || isDirector) ? [{ id: "historyAll", label: "Histórico Geral" }] : [])
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-colors outline-none flex items-center justify-center gap-1.5 ${
              tab === t.id ? "text-gray-900" : "text-gray-400 hover:text-white"
            }`}
          >
            {tab === t.id && (
              <motion.div
                layoutId="activeManagePointsTab"
                className="absolute inset-0 bg-green-500 rounded-lg shadow-sm"
                style={{ zIndex: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>{t.label}</span>
          </button>
        ))}
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
                  onChange={e => handleEmployeeChange(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecione o colaborador</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.user_id || e.id}>{e.full_name} — {e.sector}</option>
                  ))}
                </select>
              </div>
              {/* Sub-sector filter - shown only if employee's sector has sub-sectors */}
              {selectedEmployee && employeeSubSectors.length > 0 && (
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">Sub-setor</label>
                  <select
                    value={selectedSubSector}
                    onChange={e => { setSelectedSubSector(e.target.value); setForm(p => ({ ...p, mission_id: "", points: "", description: "" })); setMissionSearch(""); }}
                    className="w-full bg-gray-900 border border-blue-700/50 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todos os sub-setores</option>
                    {employeeSubSectors.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Selecionar Tarefa (opcional)</label>
                <div className="relative" ref={missionDropdownRef}>
                  <button
                    type="button"
                    onClick={() => { setMissionDropdownOpen(o => !o); setMissionSearch(""); }}
                    className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 flex items-center justify-between gap-2 text-left"
                  >
                    <span className={`flex items-center gap-2 min-w-0 truncate ${selectedMission ? "text-white" : "text-gray-500"}`}>
                      {selectedMission ? (
                        <>
                          <span className="truncate">{selectedMission.title} ({selectedMission.points > 0 ? "+" : ""}{selectedMission.points} pts)</span>
                          {selectedMission.frequency && (
                            <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              selectedMission.frequency === "Diária" ? "bg-blue-900/60 text-blue-300" :
                              selectedMission.frequency === "Semanal" ? "bg-purple-900/60 text-purple-300" :
                              "bg-amber-900/60 text-amber-300"
                            }`}>{selectedMission.frequency}</span>
                          )}
                        </>
                      ) : "— Pontuação manual —"}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {selectedMission && (
                        <span onClick={e => { e.stopPropagation(); setForm(p => ({ ...p, mission_id: "", points: "", description: "" })); }} className="p-0.5 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>

                  {missionDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-600 rounded-xl shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-gray-700">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                          <input
                            autoFocus
                            value={missionSearch}
                            onChange={e => setMissionSearch(e.target.value)}
                            placeholder="Buscar tarefa..."
                            className="w-full bg-gray-800 text-white text-sm rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-green-500 border border-gray-700"
                          />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setForm(p => ({ ...p, mission_id: "", points: "", description: "" })); setMissionDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
                        >
                          — Pontuação manual —
                        </button>
                        {filteredMissions.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-4">Nenhuma tarefa encontrada</p>
                        ) : (
                          filteredMissions.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => { setForm(p => ({ ...p, mission_id: m.id, points: String(Math.min(m.points, MAX_POINTS)), description: m.title })); setMissionDropdownOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 transition-colors flex items-center justify-between gap-2 ${ form.mission_id === m.id ? "bg-green-900/30 text-green-300" : "text-white" }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 truncate">
                                <span className="truncate">{m.title}</span>
                                {m.frequency && (
                                  <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                    m.frequency === "Diária" ? "bg-blue-900/60 text-blue-300" :
                                    m.frequency === "Semanal" ? "bg-purple-900/60 text-purple-300" :
                                    "bg-amber-900/60 text-amber-300"
                                  }`}>{m.frequency}</span>
                                )}
                                {m.frequency && isMissionSubmittedInPeriod(m.id, m.title, form.employee_id, m.frequency) && (
                                  <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium bg-orange-900/60 text-orange-300">✓ já subido</span>
                                )}
                              </div>
                              <span className={`shrink-0 text-xs font-bold ${m.points >= 0 ? "text-green-400" : "text-red-400"}`}>{m.points > 0 ? "+" : ""}{m.points} pts</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Pontos <span className="text-gray-500">(máx. 300 por tarefa)</span></label>
                <input
                 type="number"
                 value={form.points}
                 onChange={e => {
                   const val = e.target.value;
                   const num = parseInt(val);
                   if (val !== "" && num > MAX_POINTS) return;
                   setForm(p => ({ ...p, points: val }));
                 }}
                 placeholder="Ex: 50"
                 max={300}
                 className={`w-full bg-gray-900 border text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 ${parseInt(form.points) > MAX_POINTS ? "border-red-500" : "border-gray-600"}`}
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

      {/* History All tab - Admin/Director */}
      {tab === "historyAll" && (isAdmin || isDirector) && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-white font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-green-400" />
              Histórico Geral de Pontuações
            </h3>
            <div className="flex gap-2 flex-wrap">
              <select
                value={historyFilter}
                onChange={e => { setHistoryFilter(e.target.value); setHistoryAllEmployeeFilter(""); }}
                className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                <option value="Todos">Todos os setores</option>
                {["Social Media", "Audiovisual", "Tráfego", "Líder de Projeto", "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Affiliates", "Administrativo", "Gerência", "Saúde e Bem Estar", "Serviços Gerais", "Feira FC", "TI"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={historyAllEmployeeFilter}
                onChange={e => setHistoryAllEmployeeFilter(e.target.value)}
                className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                <option value="">Todos os colaboradores</option>
                {[...new Map(allTransactions
                  .filter(t => historyFilter === "Todos" || t.sector === historyFilter)
                  .map(t => [t.employee_id, t.employee_name])).entries()].map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          {allTransactions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhuma pontuação registrada ainda.</p>
          ) : (() => {
            const filtered = allTransactions.filter(t =>
              (historyFilter === "Todos" || t.sector === historyFilter) &&
              (!historyAllEmployeeFilter || t.employee_id === historyAllEmployeeFilter)
            );
            return filtered.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Nenhuma pontuação encontrada.</p>
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
                      <p className="text-gray-600 text-xs">por {tx.awarded_by_name} · {formatBRT(tx.created_date)}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <span className={`font-bold text-sm ${tx.points >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {tx.points >= 0 ? "+" : ""}{tx.points}
                      </span>
                      <button onClick={() => handleDeleteTx(tx.id)} className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-white font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-green-400" />
              Histórico de Pontuações
            </h3>
            <select
              value={historyEmployeeFilter}
              onChange={e => setHistoryEmployeeFilter(e.target.value)}
              className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-500"
            >
              <option value="">Todos os colaboradores</option>
              {[...new Map(transactions.map(t => [t.employee_id, t.employee_name])).entries()].map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhuma pontuação registrada ainda.</p>
          ) : (() => {
            const filtered = transactions.filter(t =>
              (!historyEmployeeFilter || t.employee_id === historyEmployeeFilter)
            );
            return filtered.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Nenhuma pontuação encontrada.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filtered.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{tx.employee_name}</p>
                      <p className="text-gray-500 text-xs truncate">{tx.description || tx.mission_title || "—"}</p>
                      <p className="text-gray-600 text-xs">por {tx.awarded_by_name} · {formatBRT(tx.created_date)}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <div className="text-right">
                        <span className="text-green-400 font-bold text-sm">{tx.points >= 0 ? "+" : ""}{tx.points}</span>
                        <p className="text-gray-600 text-xs capitalize">{tx.type}</p>
                      </div>
                      <button onClick={() => handleDeleteTx(tx.id)} className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
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
    </div>
  );
}