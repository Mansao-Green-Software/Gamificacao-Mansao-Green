import { X, Trophy, Target, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BolaoGuessHistory({ entry, profile, matches, guesses, onClose }) {
  const displayName = profile?.full_name || entry.user_name;

  const userGuesses = guesses
    .filter(g => g.user_id === entry.user_id)
    .map(g => {
      const match = matches.find(m => m.id === g.match_id);
      return { ...g, match };
    })
    .filter(g => g.match)
    .sort((a, b) => new Date(a.match.match_date) - new Date(b.match.match_date));

  const getPointsBadge = (g) => {
    if (!g.result_computed) return { label: "Pendente", cls: "bg-gray-700 text-gray-400" };
    if (g.points_earned === 5) return { label: "🎯 Exato +5", cls: "bg-amber-500/20 text-amber-400 border border-amber-500/30" };
    if (g.points_earned >= 2) return { label: "✅ Vencedor +2", cls: "bg-green-500/20 text-green-400 border border-green-500/30" };
    if (g.points_earned === 1) return { label: "🤝 Empate +1", cls: "bg-blue-500/20 text-blue-400 border border-blue-500/30" };
    return { label: "❌ Errou", cls: "bg-red-500/10 text-red-400 border border-red-500/20" };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-800">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center shrink-0">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400 font-bold">{displayName?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-white font-bold">{displayName}</p>
            <p className="text-gray-400 text-xs">{entry.total_points} pts · {entry.exact} exatos · {entry.winner} certos</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {userGuesses.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhum palpite registrado.</p>
          ) : (
            userGuesses.map(g => {
              const badge = getPointsBadge(g);
              return (
                <div key={g.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(g.match.match_date), "dd/MM · HH:mm", { locale: ptBR })}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white font-medium truncate flex-1">{g.match.home_team}</span>
                    <div className="flex items-center gap-2 mx-2 shrink-0">
                      <span className="text-green-400 font-black text-base">{g.home_guess}</span>
                      <span className="text-gray-600">×</span>
                      <span className="text-green-400 font-black text-base">{g.away_guess}</span>
                      {g.result_computed && (
                        <>
                          <span className="text-gray-600 text-xs mx-1">/</span>
                          <span className="text-gray-300 text-xs">{g.match.home_score}×{g.match.away_score}</span>
                        </>
                      )}
                    </div>
                    <span className="text-white font-medium truncate flex-1 text-right">{g.match.away_team}</span>
                  </div>
                  {g.match.stage && <p className="text-gray-600 text-xs mt-1">{g.match.stage}</p>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}