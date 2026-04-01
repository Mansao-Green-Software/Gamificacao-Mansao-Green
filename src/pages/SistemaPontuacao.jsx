import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Star, Search, Pencil, Trash2, Check, X, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { FaRocket, FaClipboardList, FaHeart, FaStar, FaExclamationCircle, FaBullseye } from 'react-icons/fa';

const SECTORS = ["Administrativo", "Affiliates", "Audiovisual", "Comercial", "Contingência", "Feira FC", "Financeiro", "Gerência", "IA/Automação", "Líder de Projeto", "Saúde e Bem Estar", "Serviços Gerais", "Social Media", "Suporte", "Supervisor", "TI", "Tipster", "Tráfego", "TV Green"];

const CATEGORIES = [
  { key: "Performance & Resultados", Icon: FaRocket, color: "text-orange-400 border-orange-700/50 bg-orange-900/20" },
  { key: "Disciplina & Organização", Icon: FaClipboardList, color: "text-blue-400 border-blue-700/50 bg-blue-900/20" },
  { key: "Cultura & Atitude Green", Icon: FaHeart, iconColor: "text-green-400", color: "text-green-400 border-green-700/50 bg-green-900/20" },
  { key: "Bônus de Pontuação", Icon: FaStar, color: "text-yellow-400 border-yellow-700/50 bg-yellow-900/20" },
  { key: "Punições (Perda de Pontos)", Icon: FaExclamationCircle, iconColor: "text-red-500", color: "text-red-400 border-red-700/50 bg-red-900/20" },
  { key: "Participação em Ações", Icon: FaBullseye, iconColor: "text-white/80", color: "text-cyan-400 border-cyan-700/50 bg-cyan-900/20" },
];

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
  "TI": "from-sky-400 to-blue-500",
  "Todos": "from-gray-500 to-gray-600",
};



export default function SistemaPontuacao() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", points: "", sector: "", category: "Performance & Resultados" });
  const [collapsedCategories, setCollapsedCategories] = useState({});

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const [ms, profs] = await Promise.all([
        base44.entities.Mission.filter({ is_active: true }),
        base44.entities.EmployeeProfile.list(),
      ]);
      setMissions(ms);
      const myProfile = profs.find(p => p.user_id === u.id || p.email === u.email);
      setProfile(myProfile || null);
      const effectiveRole = myProfile?.role || u.role;
      const isAdminOrManagerLocal = effectiveRole === "admin" || effectiveRole === "manager" || effectiveRole === "supervisor";
      setSelectedSector(isAdminOrManagerLocal ? SECTORS[0] : (myProfile?.sector || u.sector));
      setLoading(false);
    };
    load();
  }, []);

  const effectiveRole = profile?.role || user?.role;
  const isAdminOrManager = effectiveRole === "admin" || effectiveRole === "manager" || effectiveRole === "supervisor";

  const availableSectors = isAdminOrManager ? SECTORS : [selectedSector].filter(Boolean);

  const filteredMissions = missions.filter(m => {
    const sectorMatch = m.sector === selectedSector || m.sector === "Todos";
    const searchMatch = !search || m.title.toLowerCase().includes(search.toLowerCase());
    return sectorMatch && searchMatch;
  });

  const sorted = [...filteredMissions].sort((a, b) => b.points - a.points);

  const toggleCategory = (cat) => setCollapsedCategories(p => ({ ...p, [cat]: !p[cat] }));

  const handleCreate = async () => {
    if (!form.title || !form.points || !form.sector) return;
    const created = await base44.entities.Mission.create({
      ...form,
      points: parseInt(form.points),
      is_active: true,
    });
    setMissions(prev => [...prev, created]);
    setForm({ title: "", description: "", points: "", sector: "" });
    setShowForm(false);
  };

  const handleSaveEdit = async (id) => {
    await base44.entities.Mission.update(id, {
      title: editing.title,
      points: parseInt(editing.points),
      description: editing.description,
    });
    setMissions(prev => prev.map(m => m.id === id ? { ...m, ...editing, points: parseInt(editing.points) } : m));
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.Mission.update(id, { is_active: false });
    setMissions(prev => prev.filter(m => m.id !== id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Sistema de Pontuação
          </h1>
          <p className="text-gray-400 text-sm mt-1">Todas as tarefas e quantos pontos cada uma vale</p>
        </div>
        {isAdminOrManager && (
          <button
            onClick={() => { setShowForm(!showForm); setForm({ title: "", description: "", points: "", sector: selectedSector === "Todos" ? "" : selectedSector }); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && isAdminOrManager && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4">Nova Tarefa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Título da tarefa *" className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição (opcional)" className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            <input type="number" value={form.points} onChange={e => setForm(p => ({ ...p, points: e.target.value }))} placeholder="Pontos *" className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            <select value={form.sector} onChange={e => setForm(p => ({ ...p, sector: e.target.value }))} className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
              <option value="">Setor *</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="Todos">Todos</option>
            </select>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors">Criar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* Sidebar */}
        <aside className="w-full lg:w-48 lg:shrink-0 bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible">
          {availableSectors.map((sector, idx) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-all border-b lg:border-b border-r lg:border-r-0 border-gray-700 last:border-0 whitespace-nowrap ${
                selectedSector === sector
                  ? "bg-green-500 text-black"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 bg-gradient-to-br ${SECTOR_COLORS[sector]}`} />
              <span className="truncate text-left">{sector}</span>
            </button>
          ))}
          </div>
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

          {/* Missions grouped by category */}
          {sorted.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center text-gray-500">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma tarefa encontrada para este setor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {CATEGORIES.map(cat => {
                const items = sorted.filter(m => (m.category || "Performance & Resultados") === cat.key);
                if (items.length === 0) return null;
                const collapsed = collapsedCategories[cat.key];
                return (
                  <div key={cat.key} className={`border rounded-2xl overflow-hidden ${cat.color}`}>
                    {/* Category header */}
                    <button
                      onClick={() => toggleCategory(cat.key)}
                      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-black/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <cat.Icon className={`w-4 h-4 ${cat.iconColor || "text-white/80"}`} />
                        <span className="font-bold text-sm text-white">{cat.key}</span>
                        <span className="text-xs px-2 py-0.5 bg-black/20 rounded-full text-white/70">{items.length} {items.length === 1 ? "item" : "itens"}</span>
                      </div>
                      {collapsed ? <ChevronRight className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />}
                    </button>

                    {/* Items */}
                    {!collapsed && (
                      <div className="bg-gray-800 border-t border-gray-700">
                        <div className={`grid items-center gap-4 px-5 py-2.5 border-b border-gray-700/50 ${isAdminOrManager ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]"}`}>
                          <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">Tarefa</span>
                          <span className="text-gray-500 text-xs font-medium uppercase tracking-wide text-right">Pontos</span>
                          {isAdminOrManager && <span />}
                        </div>
                        <div className="divide-y divide-gray-700/40">
                          {items.map((mission) => {
                            const isEditingThis = editing?.id === mission.id;
                            return (
                              <div key={mission.id} className={`grid items-center gap-4 px-5 py-3.5 hover:bg-gray-700/20 transition-colors ${isAdminOrManager ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]"}`}>
                                <div className="min-w-0">
                                  {isEditingThis ? (
                                    <div className="space-y-2">
                                      <input value={editing.title} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                                      <input value={editing.description} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} placeholder="Descrição" className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                                    </div>
                                  ) : (
                                    <div>
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
                                  )}
                                </div>
                                {isEditingThis ? (
                                  <input type="number" value={editing.points} onChange={e => setEditing(p => ({ ...p, points: e.target.value }))} className="w-20 bg-gray-900 border border-gray-600 text-white rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-green-500" />
                                ) : (
                                  <div className="flex items-center gap-1 justify-end">
                                    <Star className="w-3.5 h-3.5 text-green-400" />
                                    <span className="text-green-400 font-bold text-sm">{mission.points}</span>
                                  </div>
                                )}
                                {isAdminOrManager && (
                                  <div className="flex items-center gap-1 justify-end">
                                    {isEditingThis ? (
                                      <>
                                        <button onClick={() => handleSaveEdit(mission.id)} className="p-1.5 text-green-400 hover:bg-green-900/20 rounded-lg"><Check className="w-4 h-4" /></button>
                                        <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:bg-gray-700 rounded-lg"><X className="w-4 h-4" /></button>
                                      </>
                                    ) : (
                                      <>
                                        <button onClick={() => setEditing({ id: mission.id, title: mission.title, points: mission.points, description: mission.description || "" })} className="p-1.5 text-blue-400 hover:bg-blue-900/20 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(mission.id)} className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}