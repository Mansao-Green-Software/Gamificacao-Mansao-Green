import { useState } from "react";
import { Crown } from "lucide-react";
import BolaoGuessHistory from "./BolaoGuessHistory";

const medalColors = ["text-amber-400", "text-slate-300", "text-amber-600"];

export default function BolaoRanking({ ranking, currentUserId, profiles = [], guesses = [], matches = [] }) {
  const [selected, setSelected] = useState(null);

  const profileByUserId = {};
  const profileByName = {};
  profiles.forEach(p => {
    if (p.user_id) profileByUserId[p.user_id] = p;
    if (p.full_name) profileByName[p.full_name.trim().toLowerCase()] = p;
  });

  const getProfile = (entry) =>
    profileByUserId[entry.user_id] ||
    (entry.user_name ? profileByName[entry.user_name.trim().toLowerCase()] : null) ||
    null;
  const getDisplayName = (entry) => getProfile(entry)?.full_name || entry.user_name;

  if (!ranking.length) {
    return <p className="text-gray-500 text-sm text-center py-8">Nenhum palpite registrado ainda.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {ranking.map((entry, idx) => {
          const isMe = entry.user_id === currentUserId;
          const displayName = getDisplayName(entry);
          const profile = getProfile(entry);
          return (
            <div
              key={entry.user_id}
              onClick={() => setSelected({ entry, profile })}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer hover:opacity-80 ${
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
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center shrink-0">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-sm font-bold">{displayName?.[0]?.toUpperCase()}</span>
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

      {selected && (
        <BolaoGuessHistory
          entry={selected.entry}
          profile={selected.profile}
          matches={matches}
          guesses={guesses}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}