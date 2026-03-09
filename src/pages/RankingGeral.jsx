import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Users } from "lucide-react";

const SECTORS = ["Social Media", "Audiovisual", "Tráfego", "Líder de Projeto", "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro"];

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
};

export default function RankingGeral() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("setores");
  const [selectedSector, setSelectedSector] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      if (u.role !== "admin" && u.role !== "manager") {
        setSelectedSector(u.sector);
        setTab("colaboradores");
      }
      const txs = await base44.entities.PointTransaction.list("-created_date", 1000);
      setTransactions(txs);
      setLoading(false);
    };
    load();
  }, []);

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const getSectorPoints = () => {
    const pts = {};
    transactions.forEach(t => {
      if (t.sector) pts[t.sector] = (pts[t.sector] || 0) + (t.points || 0);
    });
    return SECTORS.map(s => ({ sector: s, points: pts[s] || 0 })).sort((a, b) => b.points - a.points);
  };

  const getEmployeeRanking = (sector) => {
    const filtered = sector ? transactions.filter(t => t.sector === sector) : transactions;
    const pts = {};
    const names = {};
    filtered.forEach(t => {
      pts[t.employee_id] = (pts[t.employee_id] || 0) + (t.points || 0);
      names[t.employee_id] = t.employee_name;
    });
    return Object.entries(pts)
      .map(([id, points]) => ({ id, name: names[id], points, sector: sector }))
      .sort((a, b) => b.points - a.points);
  };

  const sectorRanking = getSectorPoints();
  const maxSectorPts = sectorRanking[0]?.points || 1;

  const employeeRanking = getEmployeeRanking(selectedSector || (isAdminOrManager ? null : user?.sector));
  const maxEmpPts = employeeRanking[0]?.points || 1;

  const medalColors = ["text-amber-400", "text-gray-300", "text-amber-600"];
  const medals = ["🥇", "🥈", "🥉"];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          Ranking Geral
        </h1>
        <p className="text-gray-400 text-sm mt-1">Acompanhe a performance de todos os setores</p>
      </div>

      {/* Tabs */}
      {isAdminOrManager && (
        <div className="flex gap-2 bg-gray-800 border border-gray-700 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("setores")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "setores" ? "bg-green-500 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Setores
          </button>
          <button
            onClick={() => setTab("colaboradores")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "colaboradores" ? "bg-green-500 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Colaboradores
          </button>
        </div>
      )}

      {/* Sector ranking */}
      {tab === "setores" && isAdminOrManager && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-5">Ranking de Setores</h2>
          <div className="space-y-4">
            {sectorRanking.map((item, idx) => (
              <div key={item.sector}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{medals[idx] || <span className="text-gray-400 font-bold">{idx + 1}</span>}</span>
                    <button
                      onClick={() => { setSelectedSector(item.sector); setTab("colaboradores"); }}
                      className="text-white font-medium hover:text-green-400 transition-colors text-sm"
                    >
                      {item.sector}
                    </button>
                  </div>
                  <span className="text-green-400 font-bold text-sm">{item.points.toLocaleString()} pts</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${SECTOR_COLORS[item.sector] || "from-green-500 to-teal-500"} transition-all duration-700`}
                    style={{ width: `${(item.points / maxSectorPts) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee ranking */}
      {tab === "colaboradores" && (
        <div className="space-y-4">
          {/* Sector filter */}
          {isAdminOrManager && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSector(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!selectedSector ? "bg-green-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white border border-gray-700"}`}
              >
                Todos
              </button>
              {SECTORS.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSector(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedSector === s ? "bg-green-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white border border-gray-700"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-white font-bold mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-400" />
              {selectedSector ? selectedSector : "Todos os Colaboradores"}
            </h2>
            {employeeRanking.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Nenhum ponto registrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {employeeRanking.map((emp, idx) => (
                  <div key={emp.id} className={`flex items-center gap-4 p-3 rounded-xl ${idx === 0 ? "bg-amber-900/20 border border-amber-700/40" : "bg-gray-900/50"}`}>
                    <span className="text-xl w-8 text-center">
                      {medals[idx] || <span className="text-gray-400 font-bold text-sm">{idx + 1}</span>}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{emp.name}</p>
                      <div className="h-1.5 bg-gray-700 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-500 to-teal-400"
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
        </div>
      )}
    </div>
  );
}