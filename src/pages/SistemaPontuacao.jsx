import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Star, Search } from "lucide-react";

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
  "Todos": "from-gray-500 to-gray-600",
};

const POINT_TIERS = [
  { min: 100, label: "Lendário", color: "text-amber-400 bg-amber-900/30" },
  { min: 50, label: "Épico", color: "text-purple-400 bg-purple-900/30" },
  { min: 20, label: "Raro", color: "text-blue-400 bg-blue-900/30" },
  { min: 0, label: "Comum", color: "text-gray-400 bg-gray-700/50" },
];

function getTier(points) {
  return POINT_TIERS.find(t => points >= t.min);
}

export default function SistemaPontuacao() {
  const [user, setUser] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const ms = await base44.entities.Mission.filter({ is_active: true });
      setMissions(ms);
      // Default: setor do usuário, ou primeiro setor se admin
      const isAdminOrManager = u.role === "admin" || u.role === "manager";
      setSelectedSector(isAdminOrManager ? "Todos" : u.sector);
      setLoading(false);
    };
    load();
  }, []);

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const availableSectors = isAdminOrManager ? ["Todos", ...SECTORS] : [user?.sector].filter(Boolean);

  const filteredMissions = missions.filter(m => {
    const sectorMatch = selectedSector === "Todos"
      ? true
      : (m.sector === selectedSector || m.sector === "Todos");
    const searchMatch = !search || m.title.toLowerCase().includes(search.toLowerCase());
    return sectorMatch && searchMatch;
  });

  const sorted = [...filteredMissions].sort((a, b) => b.points - a.points);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          Sistema de Pontuação
        </h1>
        <p className="text-gray-400 text-sm mt-1">Todas as tarefas e quantos pontos cada uma vale</p>
      </div>

      <div className="flex gap-4 items-start">
        {/* Sidebar */}
        <aside className="w-48 shrink-0 bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
          {availableSectors.map((sector, idx) => (
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

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tarefa..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{sorted.length}</p>
              <p className="text-gray-400 text-xs mt-1">Tarefas</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{sorted.reduce((s, m) => s + m.points, 0).toLocaleString()}</p>
              <p className="text-gray-400 text-xs mt-1">Total de pontos</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{sorted.length > 0 ? Math.max(...sorted.map(m => m.points)) : 0}</p>
              <p className="text-gray-400 text-xs mt-1">Maior recompensa</p>
            </div>
          </div>

          {/* Missions list */}
          {sorted.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center text-gray-500">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma tarefa encontrada para este setor.</p>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-gray-700">
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Tarefa</span>
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wide text-center">Nível</span>
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wide text-right">Pontos</span>
              </div>
              <div className="divide-y divide-gray-700/50">
                {sorted.map((mission, idx) => {
                  const tier = getTier(mission.points);
                  return (
                    <div key={mission.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 hover:bg-gray-700/20 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white text-sm font-medium">{mission.title}</p>
                          {mission.sector === "Todos" && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">Todos</span>
                          )}
                        </div>
                        {mission.description && (
                          <p className="text-gray-500 text-xs mt-0.5 truncate">{mission.description}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tier.color}`}>
                        {tier.label}
                      </span>
                      <div className="flex items-center gap-1 justify-end">
                        <Star className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400 font-bold text-sm">{mission.points}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}