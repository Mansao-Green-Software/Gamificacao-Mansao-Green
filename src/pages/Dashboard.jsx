import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Trophy, Star, Target, TrendingUp, Medal, History, TrendingDown, RotateCcw, Crown } from "lucide-react";
import { formatBRT } from "@/utils/dateUtils";
import { FaMedal, FaHandPaper } from 'react-icons/fa';
import { GoGraph } from "react-icons/go";
import QuarterlyPrizeBanner from "../components/QuarterlyPrizeBanner";
import SurpriseMissionBanner from "../components/SurpriseMissionBanner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const SECTORS = ["Social Media", "Audiovisual", "Tráfego", "Líder de Projeto", "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Affiliates", "Administrativo", "Gerência", "Saúde e Bem Estar", "Serviços Gerais", "Feira FC", "IA/Automação"];

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
      className="relative"
    >
      <Crown className="w-6 h-6 text-amber-400 fill-amber-400/20 drop-shadow-md" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full blur-[2px] animate-pulse" />
    </motion.div>
  );
  if (idx === 1) return <Crown className="w-5 h-5 text-slate-300 drop-shadow-sm opacity-80" />;
  if (idx === 2) return <Crown className="w-5 h-5 text-amber-500 drop-shadow-sm opacity-80" />;
  return <span className="text-gray-500 font-bold text-sm">{idx + 1}</span>;
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [myPoints, setMyPoints] = useState(0);
  const [myRank, setMyRank] = useState(null);
  const [sectorRanking, setSectorRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [periodMode, setPeriodMode] = useState("mensal"); // "mensal" | "trimestral" | "anual"
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const loadData = async (u) => {
    const [txs, emps] = await Promise.all([
      base44.entities.PointTransaction.list("-created_date", 500),
      base44.entities.EmployeeProfile.list(null, 1000),
    ]);
    setTransactions(txs);
    setEmployees(emps);
    const myProfile = emps.find(p => (p.user_id && p.user_id === u.id) || p.email === u.email);
    setProfile(myProfile || null);
    const sector = myProfile?.sector;
    const myProfile2 = myProfile;
    const myTxs2 = txs.filter(t =>
      t.employee_id === u.id ||
      (myProfile2 && (t.employee_id === myProfile2.id || t.employee_id === myProfile2.user_id)) ||
      t.employee_name === (myProfile2?.full_name || u.full_name)
    );
    const total = myTxs2.reduce((s, t) => s + (t.points || 0), 0);
    setMyPoints(total);
    if (sector) {
      const sectorTxs = txs.filter(t => t.sector === sector);
      const empPoints = {};
      sectorTxs.forEach(t => { empPoints[t.employee_id] = (empPoints[t.employee_id] || 0) + t.points; });
      const sorted = Object.entries(empPoints).sort((a, b) => b[1] - a[1]);
      const rank = sorted.findIndex(([id]) =>
        id === u.id ||
        (myProfile2 && (id === myProfile2.id || id === myProfile2.user_id)) ||
        id === (myProfile2?.full_name || u.full_name)
      ) + 1;
      setMyRank(rank || null);
    }
    const excludedFromSector = new Set(
      emps.filter(p => p.role === "supervisor" && p.include_in_sector_ranking === false).map(p => p.user_id || p.id)
    );
    const pts = {};
    const employeesData = {};

    // Variáveis para a média global (C) do Score Bayesiano
    let globalTotalPoints = 0;
    const globalEmployees = new Set();

    txs.filter(t => !t.description?.startsWith("Resgate:")).forEach(t => {
      if (!t.sector) return;
      const sectorKey = excludedFromSector.has(t.employee_id) ? "Supervisor" : t.sector;
      pts[sectorKey] = (pts[sectorKey] || 0) + (t.points || 0);
      if (!employeesData[sectorKey]) employeesData[sectorKey] = new Set();
      employeesData[sectorKey].add(t.employee_id);
      globalTotalPoints += (t.points || 0);
      globalEmployees.add(t.employee_id);
    });

    // C: Média global de pontos por pessoa
    const C = globalTotalPoints / Math.max(1, globalEmployees.size);

    // m: Tamanho médio dos setores (peso da média global na fórmula)
    let totalSectors = 0;
    let totalEmps = 0;
    for (const s of Object.keys(employeesData)) {
      totalSectors++;
      totalEmps += employeesData[s].size;
    }
    const m = totalSectors > 0 ? (totalEmps / totalSectors) : 1;

    const ranked = [...SECTORS, "Supervisor"].map(s => {
      const v = employeesData[s]?.size || 0;
      if (v === 0) {
        return { sector: s, points: 0 };
      }

      const R = pts[s] / v; // Média real do setor

      // Regra de Score Bayesiano: pondera a média do setor com a média global
      const bayesianScore = (v * R + m * C) / (v + m);

      return { sector: s, points: Math.round(bayesianScore) };
    }).sort((a, b) => b.points - a.points);
    setSectorRanking(ranked);
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
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const myProfile3 = employees.find(p => (p.user_id && p.user_id === user?.id) || p.email === user?.email);

  const filterByPeriod = (txs) => {
    const now = new Date();
    const year = now.getFullYear();
    return txs.filter(t => {
      const d = new Date(t.transaction_date || t.created_date);
      if (periodMode === "mensal") {
        if (!monthFilter) return true;
        const [y, m] = monthFilter.split("-").map(Number);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      }
      if (periodMode === "trimestral") {
        // Abril, Maio, Junho
        return [4, 5, 6].includes(d.getMonth() + 1) && d.getFullYear() === year;
      }
      if (periodMode === "anual") {
        return d.getFullYear() === year;
      }
      return true;
    });
  };

  const filteredTransactions = filterByPeriod(transactions);

  const myTxs = filteredTransactions.filter(t =>
    (t.employee_id === user?.id ||
    (myProfile3 && (t.employee_id === myProfile3.id || t.employee_id === myProfile3.user_id)) ||
    t.employee_name === (myProfile3?.full_name || user?.full_name)) &&
    !t.description?.startsWith("Resgate:")
  );

  // Pontos e ranking calculados a partir das transações filtradas
  const myFilteredPoints = myTxs.reduce((s, t) => s + (t.points || 0), 0);

  const mySector = profile?.sector;
  const myFilteredRank = (() => {
    if (!mySector) return null;
    const sectorTxs = filteredTransactions.filter(t => t.sector === mySector);
    const empPoints = {};
    sectorTxs.forEach(t => { empPoints[t.employee_id] = (empPoints[t.employee_id] || 0) + t.points; });
    const sorted = Object.entries(empPoints).sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(([id]) =>
      id === user?.id ||
      (myProfile3 && (id === myProfile3.id || id === myProfile3.user_id))
    ) + 1;
    return rank || null;
  })();

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager" || isAdmin;

  // Recalculate sector ranking for selected month
  const computeSectorRanking = (txs) => {
    const excludedFromSector = new Set(
      employees.filter(p => p.role === "supervisor" && p.include_in_sector_ranking === false).map(p => p.user_id || p.id)
    );
    const pts = {};
    const employeesData = {};
    let globalTotalPoints = 0;
    const globalEmployees = new Set();
    txs.filter(t => !t.description?.startsWith("Resgate:")).forEach(t => {
      if (!t.sector) return;
      const sectorKey = excludedFromSector.has(t.employee_id) ? "Supervisor" : t.sector;
      pts[sectorKey] = (pts[sectorKey] || 0) + (t.points || 0);
      if (!employeesData[sectorKey]) employeesData[sectorKey] = new Set();
      employeesData[sectorKey].add(t.employee_id);
      globalTotalPoints += (t.points || 0);
      globalEmployees.add(t.employee_id);
    });
    const C = globalTotalPoints / Math.max(1, globalEmployees.size);
    let totalSectors = 0, totalEmps = 0;
    for (const s of Object.keys(employeesData)) { totalSectors++; totalEmps += employeesData[s].size; }
    const m = totalSectors > 0 ? (totalEmps / totalSectors) : 1;
    return [...SECTORS, "Supervisor"].map(s => {
      const v = employeesData[s]?.size || 0;
      if (v === 0) return { sector: s, points: 0 };
      const R = pts[s] / v;
      return { sector: s, points: Math.round((v * R + m * C) / (v + m)) };
    }).sort((a, b) => b.points - a.points);
  };

  const filteredSectorRanking = employees.length > 0 ? computeSectorRanking(filteredTransactions) : sectorRanking;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quarterly Prize Banner */}
      <QuarterlyPrizeBanner isAdmin={isAdmin} />

      {/* Surprise Mission Banner */}
      <SurpriseMissionBanner isAdmin={isAdmin} userSector={mySector} />

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2 shimmer-green">Olá, {user?.full_name?.split(" ")[0]} </h1>
            <p className="text-gray-200/70 text-sm mt-1">Bem-vindo ao Gamificação Mansão Green</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <div className="flex gap-1 bg-gray-900/40 border border-gray-700 rounded-xl p-1">
              {[
                { id: "mensal", label: "Mensal" },
                { id: "trimestral", label: "Abr-Jun" },
                { id: "anual", label: "Anual" },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriodMode(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${periodMode === p.id ? "bg-green-500 text-black" : "text-gray-400 hover:text-white"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {periodMode === "mensal" && (
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
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-600 text-green-400 border border-green-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{refreshing ? "Atualizando..." : "Atualizar"}</span>
            </button>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-900/40 border border-gray-700 rounded-xl p-1 w-full sm:w-fit">
          {[
            { id: "overview", label: "Visão Geral" },
            { id: "mypoints", label: "Meus Pontos" }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-colors outline-none flex items-center justify-center gap-1.5 ${activeTab === t.id ? "text-gray-900" : "text-gray-400 hover:text-white"}`}
            >
              {activeTab === t.id && (
                <motion.div
                  layoutId="activeDashboardTab"
                  className="absolute inset-0 bg-green-500 rounded-lg shadow-sm"
                  style={{ zIndex: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span style={{ position: "relative", zIndex: 1 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "mypoints" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-800/40 border-l-4 border-green-600 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-gray-500 text-[12px] font-bold uppercase tracking-widest mb-2">Total Ganho</span>
              </div>
              <p className="text-3xl font-bold text-green-400 mb-5">+{myTxs.filter(t => t.points > 0).reduce((s, t) => s + t.points, 0).toLocaleString()}</p>
            </div>
            <div className="bg-gray-800/40 border-l-4 border-red-600 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-gray-500 text-[12px] font-bold uppercase tracking-widest mb-2">Total Descontado</span>
              </div>
              <p className="text-3xl font-bold text-red-500 mb-5">{myTxs.filter(t => t.points < 0).reduce((s, t) => s + t.points, 0).toLocaleString()}</p>
            </div>
            <div className="bg-gray-800/40 border-l-4 border-blue-500 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-gray-500 text-[12px] font-bold uppercase tracking-widest mb-2">Saldo Atual</span>
              </div>
              <p className="text-3xl font-bold text-white mb-5">{myFilteredPoints.toLocaleString()} <span className="text-sm font-normal text-gray-500">pts</span></p>
            </div>
          </div>

          {/* Histórico */}
          <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-green-400" />
              Histórico de Pontuações
            </h2>
            {myTxs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-10">Nenhuma pontuação registrada ainda.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {myTxs.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.points >= 0 ? "bg-green-900/40" : "bg-red-900/40"}`}>
                      {tx.points >= 0
                        ? <TrendingUp className="w-4 h-4 text-green-400" />
                        : <TrendingDown className="w-4 h-4 text-red-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {tx.mission_title || tx.description || "Pontuação manual"}
                      </p>
                      <p className="text-gray-500 text-[10px] mt-0.5">
                        por {tx.awarded_by_name || "Sistema"} · {formatBRT(tx.created_date)}
                      </p>
                    </div>
                    <span className={`font-bold text-sm shrink-0 ${tx.points >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {tx.points >= 0 ? "+" : ""}{tx.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Visão Geral */}
      {activeTab === "overview" && <>

        {/* My stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-800/40 border-l-4 border-green-600 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">

              <span className="text-gray-500 text-[12px] font-bold uppercase tracking-widest mb-2">Meus Pontos</span>
            </div>
            <p className="text-3xl font-bold text-white">{myFilteredPoints.toLocaleString()}</p>
          </div>

          <div className="bg-gray-800/40 border-l-4 border-amber-500 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">

              <span className="text-gray-500 text-[12px] font-bold uppercase tracking-widest mb-2">Meu Ranking</span>
            </div>
            <p className="text-3xl font-bold text-white">{myFilteredRank ? `#${myFilteredRank}` : "-"}</p>
            {mySector && <p className="text-xs text-gray-500 mt-1">no {mySector}</p>}
          </div>

          <div className="bg-gray-800/40 border-l-4 border-blue-500 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">

              <span className="text-gray-500 text-[12px] font-bold uppercase tracking-widest mb-2">Setor</span>
            </div>
            <p className="text-lg font-bold text-white truncate">{mySector || "Não definido"}</p>
          </div>
        </div>

        {/* Rankings grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Setores */}
          <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold flex items-center gap-2 uppercase">
                <GoGraph className="w-4 h-4 text-green-400" />
                Top 5 Setores
              </h2>
              <Link to={createPageUrl("RankingGeral")} className="text-green-400 text-sm hover:underline">Ver tudo</Link>
            </div>
            <div className="space-y-3">
              {filteredSectorRanking.slice(0, 5).map((item, idx) => {
                const isMe = item.sector === mySector;
                return (
                  <div key={item.sector} className={`flex items-center gap-4 p-6 rounded-xl ${isMe ? "bg-green-900/30 border border-green-700" : "bg-gray-900/50"}`}>
                    <span className="w-8 flex items-center justify-center shrink-0">{getMedal(idx)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-white text-sm font-bold truncate">{item.sector}</span>
                        <span className="text-green-400 font-bold text-xs">{item.points.toLocaleString()} pts</span>
                      </div>
                      <div className="h-2.5 rounded-sm bg-gray-700 overflow-hidden">
                        <div
                          className={`h-full rounded-sm bg-gradient-to-tr ${SECTOR_COLORS[item.sector] || "from-green-500 to-teal-500"}`}
                          style={{ width: filteredSectorRanking[0].points > 0 ? `${(item.points / filteredSectorRanking[0].points) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 5 MG (Colaboradores) */}
          <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold flex items-center gap-2 uppercase">
                <Trophy className="w-4 h-4 text-green-400" />
                Top 5 MG
              </h2>
              <Link to={createPageUrl("RankingGeral")} className="text-green-400 text-sm hover:underline">Ver tudo</Link>
            </div>
            <div className="space-y-3">
              {(() => {
                const empPoints = {};
                const empNames = {};
                const empPhotos = {};
                const empSectors = {};

                // Build a map: any ID (user_id or profile id) -> canonical user_id
                const idToCanonical = {};
                employees.forEach(p => {
                  const canonical = p.user_id || p.id;
                  if (p.user_id) idToCanonical[p.user_id] = canonical;
                  if (p.id) idToCanonical[p.id] = canonical;
                });

                filteredTransactions
                  .filter(t => !t.description?.startsWith("Resgate:"))
                  .forEach(t => {
                    const canonical = idToCanonical[t.employee_id] || t.employee_id;
                    empPoints[canonical] = (empPoints[canonical] || 0) + (t.points || 0);
                    empNames[canonical] = t.employee_name;
                    empSectors[canonical] = t.sector;
                    const emp = employees.find(e => e.user_id === t.employee_id || e.id === t.employee_id);
                    if (emp?.photo_url) empPhotos[canonical] = emp.photo_url;
                    if (emp?.full_name) empNames[canonical] = emp.full_name;
                    if (emp?.sector) empSectors[canonical] = emp.sector;
                  });
                const topEmployees = Object.entries(empPoints)
                  .map(([id, points]) => ({ id, name: empNames[id], points, photo: empPhotos[id], sector: empSectors[id] }))
                  .sort((a, b) => b.points - a.points)
                  .slice(0, 5);
                const maxPoints = topEmployees[0]?.points || 1;

                return topEmployees.map((emp, idx) => {
                  const isMe = emp.id === user?.id || emp.id === myProfile3?.user_id;
                  return (
                    <div key={emp.id} className={`flex items-center gap-4 p-5 rounded-xl ${isMe ? "bg-green-900/30 border border-green-700" : "bg-gray-900/50"}`}>
                      <span className="w-8 flex items-center justify-center shrink-0">{getMedal(idx)}</span>
                      <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center shrink-0 border border-gray-700">
                        {emp.photo ? (
                          <img src={emp.photo} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-400 text-xs font-bold">{emp.name?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="min-w-0 flex flex-col">
                            <p className="text-white text-sm font-bold truncate">{emp.name}</p>
                            {emp.sector && <p className="text-gray-500 text-[10px] uppercase tracking-wider truncate -mt-0.5">{emp.sector}</p>}
                          </div>
                          <span className="text-green-400 font-bold text-xs shrink-0">{emp.points.toLocaleString()} pts</span>
                        </div>
                        <div className="h-2.5 rounded-sm bg-gray-700 overflow-hidden">
                          <div
                            className={`h-full rounded-sm bg-gradient-to-tr  ${SECTOR_COLORS[emp.sector] || "from-green-500 to-teal-500"}`}
                            style={{ width: `${(emp.points / maxPoints) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Recent transactions */}
        {myTxs.length > 0 && (
          <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              Últimas Pontuações Recebidas
            </h2>
            <div className="space-y-2">
              {myTxs.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-medium">{tx.mission_title || tx.description || "Pontuação manual"}</p>
                    <p className="text-gray-500 text-xs">por {tx.awarded_by_name || "Admin"} · {formatBRT(tx.created_date)}</p>
                  </div>
                  <span className={`font-bold ${tx.points >= 0 ? "text-green-400" : "text-red-400"}`}>{tx.points >= 0 ? "+" : ""}{tx.points}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </>}
    </div>
  );
}