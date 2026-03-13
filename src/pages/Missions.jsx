import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Target, Plus, Trash2, CheckCircle } from "lucide-react";

const SECTORS = ["Social Media", "Audiovisual", "Tráfego", "Líder de Projeto", "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Gestão de IA", "Affiliates", "Administrativo", "Gerência", "Todos"];

export default function Missions() {
  const [user, setUser] = useState(null);
  const [missions, setMissions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", points: "", sector: "" });
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const [ms, txs] = await Promise.all([
        base44.entities.Mission.list(),
        base44.entities.PointTransaction.filter({ employee_id: u.id }),
      ]);
      setMissions(ms);
      setTransactions(txs);
      setLoading(false);
    };
    load();
  }, []);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager" || isAdmin;

  const visibleMissions = missions.filter(m => {
    if (!m.is_active) return false;
    if (isAdmin) return true;
    if (isManager) return m.sector === user?.sector || m.sector === "Todos";
    return m.sector === user?.sector || m.sector === "Todos";
  });

  const completedMissionIds = new Set(transactions.filter(t => t.type === "mission").map(t => t.mission_id));

  const handleCreate = async () => {
    if (!form.title || !form.points || !form.sector) return;
    const newMission = await base44.entities.Mission.create({
      title: form.title,
      description: form.description,
      points: parseInt(form.points),
      sector: form.sector,
      is_active: true,
    });
    setMissions(prev => [...prev, newMission]);
    setForm({ title: "", description: "", points: "", sector: "" });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Mission.delete(id);
    setMissions(prev => prev.filter(m => m.id !== id));
  };

  const handleComplete = async (mission) => {
    if (completedMissionIds.has(mission.id)) return;
    setCompleting(mission.id);
    const tx = await base44.entities.PointTransaction.create({
      employee_id: user.id,
      employee_name: user.full_name,
      sector: user.sector,
      points: mission.points,
      type: "mission",
      mission_id: mission.id,
      mission_title: mission.title,
      description: `Missão concluída: ${mission.title}`,
      awarded_by_name: user.full_name,
    });
    setTransactions(prev => [...prev, tx]);
    setCompleting(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-green-400" />
            Missões
          </h1>
          <p className="text-gray-400 text-sm mt-1">Complete missões e ganhe pontos</p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Missão
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && isManager && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">Nova Missão</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Título da missão"
              className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Descrição (opcional)"
              rows={2}
              className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none"
            />
            <input
              type="number"
              value={form.points}
              onChange={e => setForm(p => ({ ...p, points: e.target.value }))}
              placeholder="Pontos"
              className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
            <select
              value={form.sector}
              onChange={e => setForm(p => ({ ...p, sector: e.target.value }))}
              className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            >
              <option value="">Selecione o setor</option>
              {SECTORS.filter(s => isAdmin ? true : s === user?.sector || s === "Todos").map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Criar Missão
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Mission list */}
      {visibleMissions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma missão disponível para o seu setor ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleMissions.map(mission => {
            const done = completedMissionIds.has(mission.id);
            return (
              <div key={mission.id} className={`bg-gray-800 border rounded-2xl p-5 relative flex flex-col gap-3 ${done ? "border-green-700/50 opacity-75" : "border-gray-700"}`}>
                {done && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-white font-bold text-sm">{mission.title}</h3>
                  {mission.description && <p className="text-gray-400 text-xs mt-1">{mission.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-bold text-lg">+{mission.points}</span>
                  <span className="text-gray-500 text-xs">pontos</span>
                  <span className="ml-auto text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full">{mission.sector}</span>
                </div>
                <div className="flex gap-2 mt-auto">
                  {!isManager && (
                    <button
                      onClick={() => handleComplete(mission)}
                      disabled={done || completing === mission.id}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${done ? "bg-green-900/40 text-green-500 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 text-white"}`}
                    >
                      {done ? "Concluída ✓" : completing === mission.id ? "..." : "Concluir"}
                    </button>
                  )}
                  {isManager && (
                    <button
                      onClick={() => handleDelete(mission.id)}
                      className="p-2 text-red-400 hover:bg-red-900/20 rounded-xl transition-colors ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}