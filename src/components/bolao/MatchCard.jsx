import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, CheckCircle, Loader2 } from "lucide-react";

const statusLabel = { agendado: "Agendado", em_andamento: "Ao Vivo", finalizado: "Finalizado" };
const statusColor = { agendado: "text-gray-400", em_andamento: "text-green-400 animate-pulse", finalizado: "text-blue-400" };

function TeamFlag({ name, flag }) {
  return (
    <div className="flex flex-col items-center gap-1 w-20">
      {flag ? (
        <img src={flag} alt={name} className="w-10 h-7 object-cover rounded" />
      ) : (
        <div className="w-10 h-7 bg-gray-700 rounded flex items-center justify-center text-lg">⚽</div>
      )}
      <span className="text-white text-xs font-bold text-center leading-tight">{name}</span>
    </div>
  );
}

export default function MatchCard({ match, myGuess, userId, userName, onGuessSubmit }) {
  const [homeG, setHomeG] = useState(myGuess?.home_guess ?? "");
  const [awayG, setAwayG] = useState(myGuess?.away_guess ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!myGuess);

  const canGuess = match.status === "agendado";
  const matchDate = new Date(match.match_date);
  const isPast = matchDate < new Date();

  const getPointsBadge = () => {
    if (!myGuess || !myGuess.result_computed) return null;
    const pts = myGuess.points_earned;
    const color = pts === 5 ? "bg-amber-500" : pts >= 1 ? "bg-green-600" : "bg-gray-600";
    return <span className={`${color} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>{pts} pts</span>;
  };

  const handleSave = async () => {
    if (homeG === "" || awayG === "") return;
    setSaving(true);
    const data = {
      match_id: match.id,
      user_id: userId,
      user_name: userName,
      home_guess: parseInt(homeG),
      away_guess: parseInt(awayG),
      points_earned: 0,
      result_computed: false,
    };
    if (myGuess?.id) {
      await base44.entities.BolaoGuess.update(myGuess.id, data);
    } else {
      await base44.entities.BolaoGuess.create(data);
    }
    setSaved(true);
    setSaving(false);
    if (onGuessSubmit) onGuessSubmit();
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs">{match.stage}</span>
        <div className="flex items-center gap-2">
          {getPointsBadge()}
          <span className={`text-xs font-semibold ${statusColor[match.status]}`}>
            {match.status === "em_andamento" && "🔴 "}{statusLabel[match.status]}
          </span>
        </div>
      </div>

      {/* Teams + Score */}
      <div className="flex items-center justify-center gap-3">
        <TeamFlag name={match.home_team} flag={match.home_flag} />
        <div className="flex flex-col items-center gap-1">
          {match.status === "finalizado" ? (
            <div className="text-2xl font-black text-white">
              {match.home_score} <span className="text-gray-500">×</span> {match.away_score}
            </div>
          ) : (
            <div className="text-gray-500 text-sm font-bold">VS</div>
          )}
          <div className="flex items-center gap-1 text-gray-500 text-[10px]">
            <Clock className="w-3 h-3" />
            {matchDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} {matchDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <TeamFlag name={match.away_team} flag={match.away_flag} />
      </div>

      {/* Guess input */}
      {canGuess && !isPast ? (
        <div className="space-y-2">
          <p className="text-gray-400 text-xs text-center">Seu palpite:</p>
          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              min="0"
              max="20"
              value={homeG}
              onChange={e => { setHomeG(e.target.value); setSaved(false); }}
              className="w-12 h-10 bg-gray-900 border border-gray-600 rounded-lg text-white text-center font-bold text-lg focus:border-green-500 focus:outline-none"
            />
            <span className="text-gray-500 font-bold">×</span>
            <input
              type="number"
              min="0"
              max="20"
              value={awayG}
              onChange={e => { setAwayG(e.target.value); setSaved(false); }}
              className="w-12 h-10 bg-gray-900 border border-gray-600 rounded-lg text-white text-center font-bold text-lg focus:border-green-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || homeG === "" || awayG === ""}
            className={`w-full py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              saved ? "bg-green-900/40 border border-green-700 text-green-400" : "bg-green-500 hover:bg-green-400 text-black"
            } disabled:opacity-50`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><CheckCircle className="w-4 h-4" /> Salvo</> : "Salvar Palpite"}
          </button>
        </div>
      ) : myGuess ? (
        <div className="text-center text-sm">
          <span className="text-gray-400">Seu palpite: </span>
          <span className="text-white font-bold">{myGuess.home_guess} × {myGuess.away_guess}</span>
        </div>
      ) : (
        <p className="text-gray-600 text-xs text-center italic">
          {isPast ? "Prazo encerrado para palpites" : "Jogo não disponível para palpites"}
        </p>
      )}
    </div>
  );
}