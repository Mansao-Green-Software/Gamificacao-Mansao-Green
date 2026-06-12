import { Crown } from "lucide-react";

const medalColors = ["text-amber-400", "text-slate-300", "text-amber-600"];

export default function BolaoRanking({ ranking, currentUserId, profiles = [] }) {
  const profileMap = {};
  profiles.forEach(p => { profileMap[p.user_id] = p.full_name; });

  if (!ranking.length) {
    return <p className="text-gray-500 text-sm text-center py-8">Nenhum palpite registrado ainda.</p>;
  }

  return (
    <div className="space-y-2">
      {ranking.map((entry, idx) => {
        const isMe = entry.user_id === currentUserId;
        const displayName = profileMap[entry.user_id] || entry.user_name;
        return (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              isMe ? "bg-green-900/30 border border-green-700" : "bg-gray-800/40 border border-gray-800"
            }`}
          >
            <div className="w-7 flex items-center justify-center shrink-0">
              {idx < 3 ? (
                <Crown className={`w-5 h-5 ${medalColors[idx]}`} />
              ) : (
                <span className="text-gray-500 font-bold text-sm">{idx + 1}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold truncate ${isMe ? "text-green-300" : "text-white"}`}>
                {displayName} {isMe && <span className="text-xs font-normal text-green-500">(você)</span>}
              </p>
              <p className="text-gray-500 text-xs">{entry.guesses} palpites · {entry.exact} exatos · {entry.winner} certos</p>
            </div>
            <span className="text-green-400 font-black text-lg shrink-0">{entry.total_points}</span>
          </div>
        );
      })}
    </div>
  );
}