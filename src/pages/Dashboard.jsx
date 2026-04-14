import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Star, Target, TrendingUp, Medal, History, TrendingDown, RotateCcw } from "lucide-react";
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
  if (idx === 0) return <FaMedal className="w-5 h-5 text-amber-400" />;
  if (idx === 1) return <FaMedal className="w-5 h-5 text-slate-300" />;
  if (idx === 2) return <FaMedal className="w-5 h-5 text-amber-700" />;
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

  const loadData = async (u) => {
    const [txs, emps] = await Promise.all([
      base44.entities.PointTransaction.list("-created_date", 5000),
      base44.entities.EmployeeProfile.list(null, 1000),
    ]);
    setTransactions(txs);
    setEmployees(emps);
    const myProfile = emps.find(p => p.user_id === u.id || p.email === u.email);
    setProfile(myProfile || null);
    const sector = myProfile?.sector;
    const myProfile2 = myProfile;
    const myTxs2 = txs.filter(t => t.employee_id === u.id || t.employee_name === u.full_name || (myProfile2 && t.employee_id === myProfile2.id));
    const total = myTxs2.reduce((s, t) => s + (t.points || 0), 0);
    setMyPoints(total);
    if (sector) {
      const sectorTxs = txs.filter(t => t.sector === sector);
      const empPoints = {};
      sectorTxs.forEach(t => { empPoints[t.employee_id] = (empPoints[t.employee_id] || 0) + t.points; });
      const sorted = Object.entries(empPoints).sort((a, b) => b[1] - a[1]);
      const rank = sorted.findIndex(([id]) => id === u.id || id === myProfile2?.id || id === u.full_name) + 1;
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
      const u = await base44.auth.me();
      setUser(u);
      await loadData(u);
      setLoading(false);
    };
    load();
  }, []);

  const myProfile3 = employees.find(p => p.user_id === user?.id || p.email === user?.email);
  const myTxs = transactions.filter(t => t.employee_id === user?.id || t.employee_name === user?.full_name || (myProfile3 && t.employee_id === myProfile3.id));
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager" || isAdmin;
  const mySector = profile?.sector;

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
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">Olá, {user?.full_name?.split(" ")[0]} <FaHandPaper className="text-yellow-300 w-5 h-5" /></h1>
          <p className="text-gray-400 text-sm mt-1">Bem-vindo ao Gamificação Mansão Green</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
          <div className="flex gap-2 bg-gray-800 border border-gray-700 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "overview" ? "bg-green-500 text-black" : "text-gray-400 hover:text-white"}`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab("mypoints")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "mypoints" ? "bg-green-500 text-black" : "text-gray-400 hover:text-white"}`}
            >
              Meus Pontos
            </button>
          </div>
        </div>
      </div>

      {/* TAB: Meus Pontos */}
      {activeTab === "mypoints" && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
              <p className="text-gray-400 text-xs mb-1">Total Ganho</p>
              <p className="text-2xl font-bold text-green-400">+{myTxs.filter(t => t.points > 0).reduce((s, t) => s + t.points, 0).toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
              <p className="text-gray-400 text-xs mb-1">Total Descontado</p>
              <p className="text-2xl font-bold text-red-400">{myTxs.filter(t => t.points < 0).reduce((s, t) => s + t.points, 0).toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 col-span-2 sm:col-span-1">
              <p className="text-gray-400 text-xs mb-1">Saldo Atual</p>
              <p className="text-2xl font-bold text-white">{myPoints.toLocaleString()} pts</p>
            </div>
          </div>

          {/* Histórico */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-green-400" />
              Histórico de Pontuações
            </h2>
            {myTxs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-10">Nenhuma pontuação registrada ainda.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {myTxs.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl gap-3">
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
                      <p className="text-gray-500 text-xs mt-0.5">
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

              <span className="text-gray-400 text-xs uppercase">Meus Pontos</span>
            </div>
            <p className="text-3xl font-bold text-white">{myPoints.toLocaleString()}</p>
          </div>

          <div className="bg-gray-800/40 border-l-4 border-amber-500 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">

              <span className="text-gray-400 text-xs uppercase">Meu Ranking</span>
            </div>
            <p className="text-3xl font-bold text-white">{myRank ? `#${myRank}` : "-"}</p>
            {mySector && <p className="text-xs text-gray-500 mt-1">no {mySector}</p>}
          </div>

          <div className="bg-gray-800/40 border-l-4 border-blue-500 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">

              <span className="text-gray-400 text-xs uppercase">Setor</span>
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
              {sectorRanking.slice(0, 5).map((item, idx) => {
                const isMe = item.sector === mySector;
                return (
                  <div key={item.sector} className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? "bg-green-900/30 border border-green-700" : "bg-gray-900/50"}`}>
                    <span className="w-8 flex items-center justify-center">{getMedal(idx)}</span>
                    <div className={`flex-1 h-2 rounded-full bg-gray-700 overflow-hidden`}>
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${SECTOR_COLORS[item.sector] || "from-green-500 to-teal-500"}`}
                        style={{ width: sectorRanking[0].points > 0 ? `${(item.points / sectorRanking[0].points) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="text-white text-sm font-medium w-24 truncate">{item.sector}</span>
                    <span className="text-green-400 font-bold text-sm">{item.points.toLocaleString()} pts</span>
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
                const normalizeId = (employeeId) => {
                  const p = employees.find(p => p.user_id === employeeId || p.id === employeeId);
                  return p?.user_id || employeeId;
                };
                
                const empPoints = {};
                const empNames = {};
                const empPhotos = {};
                const empSectors = {};
                transactions.forEach(t => {
                  const nid = normalizeId(t.employee_id);
                  empPoints[nid] = (empPoints[nid] || 0) + t.points;
                  empNames[nid] = t.employee_name;
                  empSectors[nid] = t.sector;
                  const emp = employees.find(e => e.user_id === nid || e.id === nid);
                  if (emp?.photo_url) empPhotos[nid] = emp.photo_url;
                });
                const topEmployees = Object.entries(empPoints)
                  .map(([id, points]) => ({ id, name: empNames[id], points, photo: empPhotos[id], sector: empSectors[id] }))
                  .sort((a, b) => b.points - a.points)
                  .slice(0, 5);
                const maxPoints = topEmployees[0]?.points || 1;

                return topEmployees.map((emp, idx) => {
                  const isMe = emp.id === user?.id;
                  return (
                    <div key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? "bg-green-900/30 border border-green-700" : "bg-gray-900/50"}`}>
                      <span className="w-8 flex items-center justify-center">{getMedal(idx)}</span>
                      <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                        {emp.photo ? (
                          <img src={emp.photo} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-400 text-xs font-bold">{emp.name?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{emp.name}</p>
                        {emp.sector && <p className="text-gray-500 text-xs truncate">{emp.sector}</p>}
                        <div className="h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-green-500 to-teal-500"
                            style={{ width: `${(emp.points / maxPoints) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-green-400 font-bold text-sm shrink-0">{emp.points.toLocaleString()} pts</span>
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