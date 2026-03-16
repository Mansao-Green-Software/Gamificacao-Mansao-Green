import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Users, BarChart2 } from "lucide-react";

const SECTORS = ["Social Media", "Audiovisual", "Tráfego", "Líder de Projeto", "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Affiliates", "Administrativo", "Gerência", "Saúde e Bem Estar", "Serviços Gerais", "TV Green", "Feira FC"];

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
  "TV Green": "from-green-600 to-emerald-700",
  "Feira FC": "from-lime-500 to-green-600",
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
  "TV Green": "bg-green-600/20 text-green-400",
  "Feira FC": "bg-lime-500/20 text-lime-400",
};

const medals = ["🥇", "🥈", "🥉"];

const PERIODS = [
  { key: "mensal", label: "Mensal" },
  { key: "trimestral", label: "Trimestre (Abr-Jun)" },
  { key: "anual", label: "Anual" },
];

function filterByPeriod(txs, period) {
  const now = new Date();
  const year = now.getFullYear();
  return txs.filter(t => {
    const d = new Date(t.created_date);
    if (period === "mensal") return d.getMonth() === now.getMonth() && d.getFullYear() === year;
    if (period === "trimestral") return [3, 4, 5].includes(d.getMonth()) && d.getFullYear() === year;
    if (period === "anual") return d.getFullYear() === year;
    return true;
  });
}

export default function RankingGeral() {
  const [user, setUser] = useState(null);
  const [selectedSector, setSelectedSector] = useState("geral");
  const [selectedPeriod, setSelectedPeriod] = useState("mensal");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const [txs, profs] = await Promise.all([
        base44.entities.PointTransaction.list("-created_date", 1000),
        base44.entities.EmployeeProfile.list(),
      ]);
      setTransactions(txs);
      const profileMap = {};
      profs.forEach(p => { profileMap[p.id] = p; });
      setProfiles(profileMap);

      const myProfile = profs.find(p => p.user_id === u.id || p.email === u.email);
      const effectiveRole = myProfile?.role || u.role;
      const isAdminOrManagerLocal = effectiveRole === "admin" || effectiveRole === "manager";
      if (!isAdminOrManagerLocal) {
        setSelectedSector(myProfile?.sector || u.sector);
      }
      setLoading(false);
    };
    load();
  }, []);

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const periodTxs = filterByPeriod(transactions, selectedPeriod);

  const getSectorPoints = () => {
    const pts = {};
    periodTxs.forEach(t => {
      if (t.sector) pts[t.sector] = (pts[t.sector] || 0) + (t.points || 0);
    });
    return SECTORS.map(s => ({ sector: s, points: pts[s] || 0 })).sort((a, b) => b.points - a.points);
  };

  const getEmployeeRanking = (sector) => {
    const filtered = sector && sector !== "geral" ? periodTxs.filter(t => t.sector === sector) : periodTxs;
    const pts = {};
    const names = {};
    const sectors = {};
    filtered.forEach(t => {
      pts[t.employee_id] = (pts[t.employee_id] || 0) + (t.points || 0);
      names[t.employee_id] = t.employee_name;
      sectors[t.employee_id] = t.sector;
    });
    return Object.entries(pts)
      .map(([id, points]) => ({ id, name: names[id], points, sector: sectors[id], photo_url: profiles[id]?.photo_url }))
      .sort((a, b) => b.points - a.points);
  };

  const sectorRanking = getSectorPoints();
  const maxSectorPts = sectorRanking[0]?.points || 1;

  const employeeRanking = getEmployeeRanking(selectedSector);
  const maxEmpPts = employeeRanking[0]?.points || 1;

  const availableSectors = isAdminOrManager ? SECTORS : [user?.sector].filter(Boolean);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Ranking
          </h1>
          <p className="text-gray-400 text-sm mt-1">Performance por setor</p>
        </div>
        <div className="flex gap-2 bg-gray-800 border border-gray-700 rounded-xl p-1">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setSelectedPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedPeriod === p.key ? "bg-green-500 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Sidebar de setores */}
        <aside className="w-48 shrink-0 bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
          {isAdminOrManager && (
            <button
              onClick={() => setSelectedSector("geral")}
              className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-all border-b border-gray-700 ${
                selectedSector === "geral"
                  ? "bg-green-500 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              <BarChart2 className="w-4 h-4 shrink-0" />
              <span>Geral</span>
            </button>
          )}
          {availableSectors.map(sector => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-all border-b border-gray-700 last:border-0 ${
                selectedSector === sector
                  ? "bg-green-500 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 bg-gradient-to-br ${SECTOR_COLORS[sector]}`} />
              <span className="truncate text-left">{sector}</span>
            </button>
          ))}
        </aside>

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">
          {/* View Geral - ranking de setores */}
          {selectedSector === "geral" && isAdminOrManager && (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
              <h2 className="text-white font-bold mb-5 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Ranking de Setores
              </h2>
              <div className="space-y-4">
                {sectorRanking.map((item, idx) => (
                  <div key={item.sector}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg w-7">{medals[idx] || <span className="text-gray-500 text-sm font-bold">{idx + 1}</span>}</span>
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
                      className={`flex items-center gap-4 p-3 rounded-xl ${
                        idx === 0 ? "bg-amber-900/20 border border-amber-700/40" :
                        idx === 1 ? "bg-gray-700/30 border border-gray-600/30" :
                        "bg-gray-900/50"
                      }`}
                    >
                      <span className="text-xl w-8 text-center shrink-0">
                        {medals[idx] !== undefined ? medals[idx] : <span className="text-gray-500 font-bold text-sm">{idx + 1}</span>}
                      </span>
                      <div className="w-16 h-16 rounded-full bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
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
    </div>
  );
}