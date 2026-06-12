import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Trophy, Target, Calendar, Loader2 } from "lucide-react";
import MatchCard from "@/components/bolao/MatchCard";
import BolaoRanking from "@/components/bolao/BolaoRanking";
import AdminMatchSync from "@/components/bolao/AdminMatchSync";

const TABS = [
  { id: "jogos", label: "Jogos", icon: Calendar },
  { id: "ranking", label: "Ranking", icon: Trophy },
];

export default function Bolao() {
  const { user } = useAuth();
  const [tab, setTab] = useState("jogos");
  const [matches, setMatches] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("agendado");

  const isAdmin = user?.role === "admin";

  const loadData = async () => {
    const [m, g] = await Promise.all([
      base44.entities.BolaoMatch.list("match_date", 500),
      base44.entities.BolaoGuess.list(null, 5000),
    ]);
    setMatches(m);
    setGuesses(g);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Map guesses by match_id + user_id
  const myGuessMap = {};
  guesses.filter(g => g.user_id === user?.id).forEach(g => { myGuessMap[g.match_id] = g; });

  // Stages list
  const stages = ["Todos", ...new Set(matches.map(m => m.stage).filter(Boolean))];

  // Filter matches
  const filtered = matches.filter(m => {
    const stageOk = stageFilter === "Todos" || m.stage === stageFilter;
    const statusOk = statusFilter === "todos" || m.status === statusFilter;
    return stageOk && statusOk;
  });

  // Compute ranking
  const ranking = (() => {
    const map = {};
    guesses.forEach(g => {
      if (!map[g.user_id]) {
        map[g.user_id] = { user_id: g.user_id, user_name: g.user_name, total_points: 0, guesses: 0, exact: 0, winner: 0 };
      }
      map[g.user_id].guesses++;
      if (g.result_computed) {
        map[g.user_id].total_points += g.points_earned || 0;
        if (g.points_earned === 5) map[g.user_id].exact++;
        else if (g.points_earned >= 1) map[g.user_id].winner++;
      }
    });
    return Object.values(map).sort((a, b) => b.total_points - a.total_points);
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            ⚽ Bolão Copa do Mundo
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Faça seus palpites e dispute com os colegas!</p>
        </div>
      </div>

      {/* Pontuação legenda */}
      <div className="flex flex-wrap gap-2">
        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-3 py-1 rounded-full font-bold">🎯 Placar exato = 5 pts</span>
        <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-3 py-1 rounded-full font-bold">✅ Vencedor certo = 2 pts</span>
        <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-3 py-1 rounded-full font-bold">🤝 Empate certo = 1 pt</span>
      </div>

      {/* Admin panel */}
      {isAdmin && <AdminMatchSync onSynced={loadData} />}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900/40 border border-gray-700 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
              tab === t.id ? "bg-green-500 text-black" : "text-gray-400 hover:text-white"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "jogos" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1 bg-gray-900/40 border border-gray-700 rounded-xl p-1">
              {["agendado", "em_andamento", "finalizado", "todos"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    statusFilter === s ? "bg-green-500 text-black" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {s === "agendado" ? "⏰ Próximos" : s === "em_andamento" ? "🔴 Ao Vivo" : s === "finalizado" ? "✅ Finalizados" : "Todos"}
                </button>
              ))}
            </div>
            {stages.length > 2 && (
              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-green-500"
              >
                {stages.map(s => <option key={s}>{s}</option>)}
              </select>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-5xl">⚽</p>
              <p className="text-gray-400">Nenhum jogo encontrado.</p>
              {isAdmin && <p className="text-gray-500 text-sm">Use o painel de admin acima para adicionar jogos.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  myGuess={myGuessMap[match.id]}
                  userId={user?.id}
                  userName={user?.full_name}
                  onGuessSubmit={loadData}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "ranking" && (
        <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-4 sm:p-6">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Ranking do Bolão
          </h2>
          <BolaoRanking ranking={ranking} currentUserId={user?.id} />
        </div>
      )}
    </div>
  );
}