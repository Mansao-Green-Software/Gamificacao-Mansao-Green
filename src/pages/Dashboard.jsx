import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Star, Target, TrendingUp, Medal } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

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

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [myPoints, setMyPoints] = useState(0);
  const [myRank, setMyRank] = useState(null);
  const [sectorRanking, setSectorRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const [txs, emps] = await Promise.all([
        base44.entities.PointTransaction.list("-created_date", 500),
        base44.entities.EmployeeProfile.list(),
      ]);
      setTransactions(txs);
      setEmployees(emps);

      // Find profile by user_id or email
      const myProfile = emps.find(p => p.user_id === u.id || p.email === u.email);
      setProfile(myProfile || null);
      const sector = myProfile?.sector;

      // My points
      const myTxs = txs.filter(t => t.employee_id === u.id);
      const total = myTxs.reduce((s, t) => s + (t.points || 0), 0);
      setMyPoints(total);

      // My rank in sector
      if (sector) {
        const sectorTxs = txs.filter(t => t.sector === sector);
        const empPoints = {};
        sectorTxs.forEach(t => {
          empPoints[t.employee_id] = (empPoints[t.employee_id] || 0) + t.points;
        });
        const sorted = Object.entries(empPoints).sort((a, b) => b[1] - a[1]);
        const rank = sorted.findIndex(([id]) => id === u.id) + 1;
        setMyRank(rank || null);
      }

      // Sector ranking
      const sectorPoints = {};
      txs.forEach(t => {
        if (t.sector) sectorPoints[t.sector] = (sectorPoints[t.sector] || 0) + t.points;
      });
      const ranked = SECTORS.map(s => ({ sector: s, points: sectorPoints[s] || 0 })).sort((a, b) => b.points - a.points);
      setSectorRanking(ranked);
      setLoading(false);
    };
    load();
  }, []);

  const myTxs = transactions.filter(t => t.employee_id === user?.id);
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Olá, {user?.full_name?.split(" ")[0]} 👋</h1>
        <p className="text-gray-400 text-sm mt-1">Bem-vindo ao Gamificação Mansão Green</p>
      </div>

      {/* My stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-gray-400 text-sm">Meus Pontos</span>
          </div>
          <p className="text-3xl font-bold text-white">{myPoints.toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-gray-400 text-sm">Meu Ranking</span>
          </div>
          <p className="text-3xl font-bold text-white">{myRank ? `#${myRank}` : "-"}</p>
          {mySector && <p className="text-xs text-gray-500 mt-1">no {mySector}</p>}
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-gray-400 text-sm">Setor</span>
          </div>
          <p className="text-lg font-bold text-white truncate">{mySector || "Não definido"}</p>
        </div>
      </div>

      {/* Rankings grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Setores */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-400" />
              Top 5 Setores
            </h2>
            <Link to={createPageUrl("RankingGeral")} className="text-green-400 text-sm hover:underline">Ver tudo</Link>
          </div>
          <div className="space-y-3">
            {sectorRanking.slice(0, 5).map((item, idx) => {
              const medals = ["🥇", "🥈", "🥉"];
              const isMe = item.sector === mySector;
              return (
                <div key={item.sector} className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? "bg-green-900/30 border border-green-700" : "bg-gray-900/50"}`}>
                  <span className="text-xl w-8 text-center">{medals[idx] || `${idx + 1}`}</span>
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
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Top 5 MG
            </h2>
            <Link to={createPageUrl("RankingGeral")} className="text-green-400 text-sm hover:underline">Ver tudo</Link>
          </div>
          <div className="space-y-3">
            {(() => {
              const empPoints = {};
              const empNames = {};
              const empPhotos = {};
              transactions.forEach(t => {
                empPoints[t.employee_id] = (empPoints[t.employee_id] || 0) + t.points;
                empNames[t.employee_id] = t.employee_name;
                const emp = employees.find(e => e.user_id === t.employee_id || e.id === t.employee_id);
                if (emp?.photo_url) empPhotos[t.employee_id] = emp.photo_url;
              });
              const topEmployees = Object.entries(empPoints)
                .map(([id, points]) => ({ id, name: empNames[id], points, photo: empPhotos[id] }))
                .sort((a, b) => b.points - a.points)
                .slice(0, 5);
              const medals = ["🥇", "🥈", "🥉"];
              const maxPoints = topEmployees[0]?.points || 1;
              
              return topEmployees.map((emp, idx) => {
                const isMe = emp.id === user?.id;
                return (
                  <div key={emp.id} className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? "bg-green-900/30 border border-green-700" : "bg-gray-900/50"}`}>
                    <span className="text-xl w-8 text-center">{medals[idx] || `${idx + 1}`}</span>
                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                      {emp.photo ? (
                        <img src={emp.photo} alt={emp.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-400 text-xs font-bold">{emp.name?.[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{emp.name}</p>
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
      {recentTxs.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Últimas Pontuações Recebidas
          </h2>
          <div className="space-y-2">
            {recentTxs.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl">
                <div>
                  <p className="text-white text-sm font-medium">{tx.mission_title || tx.description || "Pontuação manual"}</p>
                  <p className="text-gray-500 text-xs">por {tx.awarded_by_name || "Admin"}</p>
                </div>
                <span className="text-green-400 font-bold">+{tx.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}