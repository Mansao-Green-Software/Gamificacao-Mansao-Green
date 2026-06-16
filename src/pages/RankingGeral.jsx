import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { dateToBRT } from "@/utils/dateUtils";
import { Trophy, Users, BarChart2, RotateCcw, Info, Crown } from "lucide-react";
import { FaMedal } from 'react-icons/fa';
import { motion } from "framer-motion";
import EmployeeHistoryModal from "@/components/EmployeeHistoryModal";

const SECTORS = ["Administrativo", "Affiliates", "Audiovisual", "Comercial", "Contingência", "Feira FC", "Financeiro", "Gerência", "IA/Automação", "Líder de Projeto", "Saúde e Bem Estar", "Serviços Gerais", "Social Media", "Suporte", "TI", "Tipster", "Tráfego"];
const VIRTUAL_SECTORS = ["Supervisor"]; // setores virtuais baseados em função

const SECTOR_COLORS = {
  "Social Media": "from-pink-500 to-rose-600",
  "Audiovisual": "from-purple-500 to-indigo-600",
  "Tráfego": "from-blue-500 to-cyan-600",
  "Líder de Projeto": "from-amber-500 to-orange-600",
  "Tipster": "from-green-500 to-teal-600",
  "Suporte": "from-sky-500 to-blue-600",
  "Contingência": "from-red-500 to-rose-600",
  "Comercial": "from-yellow-500 to-amber-600",
  "Financeiro": "from-emerald-500 to-green-600",
  "Affiliates": "from-violet-500 to-fuchsia-600",
  "Administrativo": "from-slate-500 to-gray-600",
  "Gerência": "from-indigo-500 to-blue-600",
  "Saúde e Bem Estar": "from-teal-500 to-cyan-600",
  "Serviços Gerais": "from-orange-500 to-amber-600",

  "Feira FC": "from-lime-500 to-green-600",
  "TI": "from-sky-400 to-blue-500",
  "Supervisor": "from-cyan-500 to-blue-600",
};

const SECTOR_ICON_COLORS = {
  "Social Media": "bg-pink-500/20 text-pink-400",
  "Audiovisual": "bg-purple-500/20 text-purple-400",
  "Tráfego": "bg-blue-500/20 text-blue-400",
  "Líder de Projeto": "bg-amber-500/20 text-amber-400",
  "Tipster": "bg-green-500/20 text-green-400",
  "Suporte": "bg-sky-500/20 text-sky-400",
  "Contingência": "bg-red-500/20 text-red-400",
  "Comercial": "bg-yellow-500/20 text-yellow-400",
  "Financeiro": "bg-emerald-500/20 text-emerald-400",
  "Affiliates": "bg-violet-500/20 text-violet-400",
  "Administrativo": "bg-slate-500/20 text-slate-400",
  "Gerência": "bg-indigo-500/20 text-indigo-400",
  "Saúde e Bem Estar": "bg-teal-500/20 text-teal-400",
  "Serviços Gerais": "bg-orange-500/20 text-orange-400",

  "Feira FC": "bg-lime-500/20 text-lime-400",
};

const getMedal = (idx) => {
  if (idx === 0) return (
    <motion.div
      animate={{ 
        y: [0, -4, 0],
        filter: ["drop-shadow(0 0 0px #fbbf24)", "drop-shadow(0 0 10px #fbbf24)", "drop-shadow(0 0 0px #fbbf24)"]
      }}
      transition={{ 
        duration: 3, 
        repeat: Infinity,
        ease: "easeInOut" 
      }}
      className="relative flex items-center justify-center w-full"
    >
      <Crown className="w-6 h-6 text-amber-400 fill-amber-400/20 drop-shadow-md" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full blur-[2px] animate-pulse" />
    </motion.div>
  );
  if (idx === 1) return <Crown className="w-5 h-5 text-slate-300 drop-shadow-sm opacity-80" />;
  if (idx === 2) return <Crown className="w-5 h-5 text-amber-500 drop-shadow-sm opacity-80" />;
  return <span className="text-gray-500 font-bold text-sm">{idx + 1}</span>;
};

const PERIODS = [
  { key: "mensal", label: "Mensal" },
  { key: "trimestral", label: "Trimestre (Abr-Jun)" },
  { key: "anual", label: "Anual" },
];

function filterByPeriod(txs, period, monthFilter) {
  const now = new Date();
  const year = now.getFullYear();
  return txs.filter(t => {
    const rawDate = t.transaction_date || t.created_date;
    if (!rawDate) return false;
    const d = dateToBRT(rawDate);
    if (!d || isNaN(d.getTime())) return false;
    if (period === "mensal") {
      if (monthFilter) {
        const [y, m] = monthFilter.split("-").map(Number);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      }
      const nowBRT = dateToBRT(now);
      return d.getMonth() === nowBRT.getMonth() && d.getFullYear() === nowBRT.getFullYear();
    }
    if (period === "trimestral") return [4, 5, 6].includes(d.getMonth() + 1) && d.getFullYear() === year;
    if (period === "anual") return d.getFullYear() === year;
    return true;
  });
}

export default function RankingGeral() {
  const [user, setUser] = useState(null);
  const [selectedSector, setSelectedSector] = useState("geral");
  const [selectedPeriod, setSelectedPeriod] = useState("mensal");
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState({});
  const [allProfiles, setAllProfiles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const loadData = async (u) => {
    const [txs, profs] = await Promise.all([
      base44.entities.PointTransaction.list("-created_date", 50000),
      base44.entities.EmployeeProfile.list(null, 5000),
    ]);
    setTransactions(txs);
    setAllProfiles(profs);
    const profileMap = {};
    profs.forEach(p => {
      profileMap[p.id] = p;
      if (p.user_id && p.user_id.trim()) profileMap[p.user_id] = p;
      if (p.email && p.email.trim()) profileMap[p.email] = p;
    });
    setProfiles(profileMap);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(user);
    setRefreshing(false);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        await loadData(u);
        setSelectedSector("geral");
      } catch (e) {
        console.error("RankingGeral load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const myProfile = Object.values(profiles).find(p => p.user_id === user?.id || p.email === user?.email);
  const effectiveRole = myProfile?.role || user?.role;
  const isAdminOrManager = effectiveRole === "admin" || effectiveRole === "manager" || effectiveRole === "supervisor";

  const periodTxs = filterByPeriod(transactions, selectedPeriod, monthFilter);

  // Excluir apenas resgates da Green Shop do ranking (punições continuam contando)
  const rankingTxs = periodTxs.filter(t => !t.description?.startsWith("Resgate:") && !t.description?.startsWith("Estorno:"));

  // Colaboradores excluídos dos rankings
  const excludedNames = new Set(["italo gomes", "kevinathy"]);
  
  // Filtrar transações para remover colaboradores excluídos
  const filteredRankingTxs = rankingTxs.filter(t => 
    !excludedNames.has((t.employee_name || "").toLowerCase())
  );

  const getSectorPoints = () => {
    // Supervisores que não participam do ranking do setor ficam no setor "Supervisor"
    const excludedFromSector = new Set(
      allProfiles.filter(p => p.role === "supervisor" && p.include_in_sector_ranking === false).map(p => p.user_id || p.id)
    );
    const pts = {};
    const employees = {};
    
    // Variáveis para a média global (C) do Score Bayesiano
    let globalTotalPoints = 0;
    const globalEmployees = new Set();

    filteredRankingTxs.forEach(t => {
      if (!t.sector) return;
      // Para Gerência, usar sempre o setor da transação; para outros, usar o perfil
      const empProfile = allProfiles.find(p => p.user_id === t.employee_id || p.id === t.employee_id);
      const canonicalId = empProfile?.user_id || empProfile?.id || t.employee_id;
      const effectiveSector = t.sector === "Gerência" ? "Gerência" : (empProfile?.sector || t.sector);
      const sectorKey = excludedFromSector.has(canonicalId) ? "Supervisor" : effectiveSector;
      pts[sectorKey] = (pts[sectorKey] || 0) + (t.points || 0);
      if (!employees[sectorKey]) employees[sectorKey] = new Set();
      employees[sectorKey].add(canonicalId);
      // Remover do setor original se foi movido para Gerência
      if (t.sector === "Gerência" && empProfile?.sector && empProfile.sector !== "Gerência") {
        const origKey = empProfile.sector;
        if (pts[origKey]) pts[origKey] -= (t.points || 0);
        if (employees[origKey]) employees[origKey].delete(t.employee_id);
      }
      globalTotalPoints += (t.points || 0);
      globalEmployees.add(t.employee_id);
    });

    // C: Média global de pontos por pessoa
    const C = globalTotalPoints / Math.max(1, globalEmployees.size);
    
    // m: Tamanho médio dos setores (peso da média global na fórmula)
    let totalSectors = 0;
    let totalEmps = 0;
    for (const s of Object.keys(employees)) {
      totalSectors++;
      totalEmps += employees[s].size;
    }
    const m = totalSectors > 0 ? (totalEmps / totalSectors) : 1;

    return [...SECTORS, "Supervisor"].map(s => {
      const v = employees[s]?.size || 0;
      if (v === 0) {
        return { sector: s, points: 0 };
      }
      
      const R = pts[s] / v; // Média real do setor
      
      // Regra de Score Bayesiano: pondera a média do setor com a média global
      const bayesianScore = (v * R + m * C) / (v + m);
      
      return { sector: s, points: Math.round(bayesianScore) };
    }).sort((a, b) => b.points - a.points);
  };



  const getEmployeeRanking = (sector) => {
    // Mapa de ID canônico: unifica user_id, id do perfil e employee_id da transação
    const idToCanonical = {};
    allProfiles.forEach(p => {
      const canonical = (p.user_id && p.user_id.trim()) ? p.user_id : p.id;
      if (p.user_id && p.user_id.trim()) idToCanonical[p.user_id] = canonical;
      if (p.id) idToCanonical[p.id] = canonical;
    });

    // Excluir supervisores que optaram por não participar do ranking do setor
    const excludedSupervisorIds = new Set(
      allProfiles.filter(p => p.role === "supervisor" && p.include_in_sector_ranking === false).map(p => p.user_id || p.id)
    );

    // Setor virtual "Supervisor": agrupa todos os colaboradores com role supervisor excluídos do setor
    if (sector === "Supervisor") {
      const filtered = filteredRankingTxs.filter(t => excludedSupervisorIds.has(t.employee_id) || t.sector === "Supervisor");
      const pts = {};
      const names = {};
      const empProfiles = {};

      filtered.forEach(t => {
        const canonical = idToCanonical[t.employee_id] || t.employee_id;
        pts[canonical] = (pts[canonical] || 0) + (t.points || 0);
        names[canonical] = t.employee_name;
        const prof = profiles[t.employee_id];
        if (prof) empProfiles[canonical] = prof;
      });

      return Object.entries(pts)
        .map(([id, points]) => ({ id, name: empProfiles[id]?.full_name || names[id], points, photo_url: empProfiles[id]?.photo_url }))
        .sort((a, b) => b.points - a.points);
    }

    // Para ranking por setor: usar ID canônico e setor do PERFIL
    const pts = {};
    const names = {};
    const empProfiles = {};

    filteredRankingTxs.forEach(t => {
      if (excludedSupervisorIds.has(t.employee_id) || t.sector === "Supervisor") return;

      const canonical = idToCanonical[t.employee_id] || t.employee_id;
      const empProfile = profiles[t.employee_id] || allProfiles.find(p => p.user_id === t.employee_id || p.id === t.employee_id);

      // Para transações com setor explícito, usar o setor da transação como fonte de verdade
      // mas para outros setores, usar o setor do perfil para evitar duplicatas
      const txSector = t.sector;
      const profileSector = empProfile?.sector || t.sector;
      const effectiveSector = txSector === "Gerência" ? txSector : profileSector;
      if (sector && sector !== "geral" && effectiveSector !== sector) return;

      pts[canonical] = (pts[canonical] || 0) + (t.points || 0);
      names[canonical] = t.employee_name;
      if (empProfile) empProfiles[canonical] = empProfile;
    });

    return Object.entries(pts)
      .map(([id, points]) => ({ id, name: empProfiles[id]?.full_name || names[id], points, sector: empProfiles[id]?.sector, photo_url: empProfiles[id]?.photo_url }))
      .sort((a, b) => b.points - a.points);
  };

  const sectorRanking = getSectorPoints();
  const maxSectorPts = sectorRanking[0]?.points || 1;

  const employeeRanking = getEmployeeRanking(selectedSector);
  const maxEmpPts = employeeRanking[0]?.points || 1;

  let availableSectors = [];
  if (effectiveRole === "admin" || effectiveRole === "manager") {
    availableSectors = [...SECTORS, ...VIRTUAL_SECTORS];
  } else if (effectiveRole === "supervisor") {
    const userSector = myProfile?.sector || user?.sector;
    availableSectors = [...new Set([userSector, "Supervisor"].filter(Boolean))];
  } else {
    availableSectors = [myProfile?.sector || user?.sector].filter(Boolean);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-md font-bold text-white flex items-center gap-2 uppercase">
            <Trophy className="w-6 h-6 text-green-400" />
            Ranking
          </h1>
          <p className="text-gray-400 text-xs mt-1">Performance por setor</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-green-500/30 hover:bg-gray-600 text-green-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
          <div className="flex gap-1 bg-gray-900/40 border border-gray-700 rounded-xl p-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setSelectedPeriod(p.key)}
                className={`relative px-2 sm:px-4 py-2 rounded-lg text-sm font-bold transition-colors outline-none flex items-center justify-center ${selectedPeriod === p.key ? "text-gray-900" : "text-gray-400 hover:text-white"}`}
              >
                {selectedPeriod === p.key && (
                  <motion.div
                    layoutId="activePeriodTab"
                    className="absolute inset-0 bg-green-500 rounded-lg shadow-sm"
                    style={{ zIndex: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span style={{ position: "relative", zIndex: 1 }}>{p.label}</span>
              </button>
            ))}
          </div>
          {selectedPeriod === "mensal" && (
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date();
                d.setDate(1);
                d.setMonth(d.getMonth() - i);
                const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                return <option key={value} value={value}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
              })}
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* Sidebar de setores - horizontal scroll no mobile */}
        <aside className="w-full lg:w-48 lg:shrink-0 bg-gray-800/40 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible">
          <button
            onClick={() => setSelectedSector("geral")}
            className={`shrink-0 lg:shrink flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-all border-b lg:border-b border-r lg:border-r-0 border-gray-700 whitespace-nowrap ${
              selectedSector === "geral"
                ? "bg-green-500 text-black"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            <BarChart2 className="w-4 h-4 shrink-0" />
            <span>Geral</span>
          </button>
          {availableSectors.map(sector => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`shrink-0 lg:shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-all border-b lg:border-b border-r lg:border-r-0 border-gray-700 last:border-0 whitespace-nowrap ${
                selectedSector === sector
                  ? "bg-green-500 text-black"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span className={`w-3 h-3 rounded-full shrink-0 bg-gradient-to-br ${SECTOR_COLORS[sector]}`} />
              <span className="truncate text-left">{sector}</span>
            </button>
          ))}
          </div>
        </aside>

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">
          {/* View Geral - ranking de setores */}
          {selectedSector === "geral" && (
            <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-6">
              <div className="mb-5 space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-green-400" />
                    Ranking de Setores
                  </h2>
                  <button 
                    onClick={() => setShowInfo(!showInfo)}
                    className="text-gray-400 hover:text-green-400 transition-colors p-1"
                    title="Entenda como funciona"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                {showInfo && (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-300">
                    <p className="font-bold text-white mb-2">Como funciona o cálculo?</p>
                    <p>O ranking utiliza o <strong>Score Bayesiano</strong>, que equilibra a pontuação do setor para ser o mais justo possível:</p>
                    <ul className="list-disc ml-5 mt-2 space-y-1 text-xs text-gray-400">
                      <li>A pontuação de cada setor é mesclada com a <strong>média global da empresa</strong>.</li>
                      <li>Isso evita que setores muito pequenos ganhem vantagem extrema caso um único funcionário pontue bastante.</li>
                      <li>Garante que áreas de diferentes tamanhos possam competir diretamente com as mesmas oportunidades e equilíbrio.</li>
                    </ul>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {sectorRanking.map((item, idx) => (
                  <div key={item.sector}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 flex items-center justify-center">{getMedal(idx)}</span>
                        <button
                          onClick={() => setSelectedSector(item.sector)}
                          className="text-white font-medium hover:text-green-400 transition-colors text-sm"
                        >
                          {item.sector}
                        </button>
                      </div>
                      <span className="text-green-400 font-bold text-sm">{item.points.toLocaleString()} pts</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden ml-9">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${SECTOR_COLORS[item.sector]} transition-all duration-700`}
                        style={{ width: `${(item.points / maxSectorPts) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View por Setor - ranking de colaboradores */}
          {selectedSector !== "geral" && (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
              <h2 className="text-white font-bold mb-5 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-400" />
                {selectedSector}
              </h2>
              {employeeRanking.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-10">Nenhum ponto registrado neste setor ainda.</p>
              ) : (
                <div className="space-y-3">
                  {employeeRanking.map((emp, idx) => (
                    <div
                      key={emp.id}
                      onClick={() => isAdminOrManager && setSelectedEmployee(emp)}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                        idx === 0 ? "bg-amber-900/20 border border-amber-700/40" :
                        idx === 1 ? "bg-gray-700/30 border border-gray-600/30" :
                        "bg-gray-900/50"
                      } ${isAdminOrManager ? "cursor-pointer hover:bg-gray-700/50" : ""}`}
                    >
                      <span className="w-8 flex items-center justify-center shrink-0">{getMedal(idx)}</span>
                      <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                        {emp.photo_url ? (
                          <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-400 text-sm font-bold">{emp.name?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{emp.name}</p>
                        <div className="h-1.5 bg-gray-700 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${SECTOR_COLORS[selectedSector] || "from-green-500 to-teal-400"}`}
                            style={{ width: `${(emp.points / maxEmpPts) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-green-400 font-bold text-sm shrink-0">{emp.points.toLocaleString()} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {selectedEmployee && (
        <EmployeeHistoryModal
          employee={selectedEmployee}
          transactions={filteredRankingTxs.filter(t => {
            const emp = allProfiles.find(p => (p.user_id && p.user_id === selectedEmployee.id) || p.id === selectedEmployee.id);
            return t.employee_id === selectedEmployee.id ||
              (emp && (t.employee_id === emp.id || t.employee_id === emp.user_id));
          })}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}