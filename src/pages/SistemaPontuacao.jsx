import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Star, Search, Pencil, Trash2, Check, X, Plus, ChevronDown, ChevronRight, Tag, Target, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FaRocket, FaClipboardList, FaHeart, FaStar, FaExclamationCircle, FaBullseye } from 'react-icons/fa';

const SECTORS = ["Administrativo", "Affiliates", "Audiovisual", "Comercial", "Contingência", "Feira FC", "Financeiro", "Gerência", "IA/Automação", "Líder de Projeto", "Saúde e Bem Estar", "Serviços Gerais", "Social Media", "Suporte", "Supervisor", "TI", "Tipster", "Tráfego"];

const CATEGORIES = [
  { key: "Performance & Resultados", Icon: FaRocket, bg: "bg-gradient-to-br from-purple-900/80 via-purple-800/40 to-purple-900/80", border: "border-purple-500/30", text: "text-purple-300" },
  { key: "Disciplina & Organização", Icon: FaClipboardList, bg: "bg-gradient-to-br from-blue-900/80 via-blue-800/40 to-blue-900/80", border: "border-blue-500/30", text: "text-blue-300" },
  { key: "Cultura & Atitude Green", Icon: FaHeart, iconColor: "text-green-400", bg: "bg-gradient-to-br from-green-600/80 via-green-500/30 to-green-600/80", border: "border-green-500/30", text: "text-green-300" },
  { key: "Bônus de Pontuação", Icon: FaStar, bg: "bg-gradient-to-br from-yellow-900/80 via-yellow-700/40 to-yellow-900/80", border: "border-yellow-500/30", text: "text-yellow-300" },
  { key: "Punições (Perda de Pontos)", Icon: FaExclamationCircle, iconColor: "text-red-500", bg: "bg-gradient-to-br from-red-900/80 via-red-800/40 to-red-900/80", border: "border-red-500/30", text: "text-red-300" },
  { key: "Participação em Ações", Icon: FaBullseye, iconColor: "text-white/80", bg: "bg-gradient-to-br from-cyan-900/80 via-cyan-800/40 to-cyan-900/80", border: "border-cyan-500/30", text: "text-cyan-300" },
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

  "Feira FC": "from-lime-500 to-green-600",
  "TI": "from-sky-400 to-blue-500",
  "Todos": "from-gray-500 to-gray-600",
};

export default function SistemaPontuacao() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [missions, setMissions] = useState([]);
  const [subSectors, setSubSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedSubSector, setSelectedSubSector] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", points: "", sector: "", category: "Performance & Resultados", frequency: "", sub_sector: "" });
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [showSubSectorMgmt, setShowSubSectorMgmt] = useState(false);
  const [newSubSectorName, setNewSubSectorName] = useState("");
  const [savingSubSector, setSavingSubSector] = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const [ms, profs, subs] = await Promise.all([
        base44.entities.Mission.filter({ is_active: true }),
        base44.entities.EmployeeProfile.list(),
        base44.entities.SubSector.list(),
      ]);
      setMissions(ms);
      setSubSectors(subs);
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

  // Sub-sectors for the currently selected sector
  const currentSubSectors = subSectors.filter(s => s.sector === selectedSector);

  const filteredMissions = missions.filter(m => {
    const sectorMatch = m.sector === selectedSector || m.sector === "Todos";
    const searchMatch = !search || m.title.toLowerCase().includes(search.toLowerCase());
    const subSectorMatch = !selectedSubSector || m.sub_sector === selectedSubSector || !m.sub_sector;
    return sectorMatch && searchMatch && subSectorMatch;
  });

  const sorted = [...filteredMissions].sort((a, b) => b.points - a.points);

  const stats = {
    total: sorted.filter(m => m.category !== "Punições (Perda de Pontos)").length,
    points: sorted.reduce((s, m) => s + (m.points > 0 ? m.points : 0), 0),
    max: sorted.length > 0 ? Math.max(...sorted.map(m => m.points)) : 0
  };

  const toggleCategory = (cat) => setCollapsedCategories(p => ({ ...p, [cat]: !p[cat] }));

  const handleCreate = async () => {
    if (!form.title || !form.points || !form.sector) return;
    const response = await base44.functions.invoke('updateMission', {
      ...form,
      points: parseInt(form.points),
      frequency: form.frequency || "",
      sub_sector: form.sub_sector || "",
      is_active: true,
    });
    const created = response.data;
    setMissions(prev => [...prev, created]);
    setForm({ title: "", description: "", points: "", sector: "", category: "Performance & Resultados", frequency: "", sub_sector: "" });
    setShowForm(false);
  };

  const handleSaveEdit = async (id) => {
    await base44.functions.invoke('updateMission', {
      id,
      title: editing.title,
      points: parseInt(editing.points),
      description: editing.description,
      frequency: editing.frequency || "",
      sub_sector: editing.sub_sector || "",
    });
    setMissions(prev => prev.map(m => m.id === id ? { 
      ...m, 
      ...editing,
      points: parseInt(editing.points),
      frequency: editing.frequency || "",
      sub_sector: editing.sub_sector || ""
    } : m));
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await base44.functions.invoke('updateMission', { id, is_active: false });
    setMissions(prev => prev.filter(m => m.id !== id));
  };

  const handleAddSubSector = async () => {
    if (!newSubSectorName.trim() || !selectedSector) return;
    setSavingSubSector(true);
    const created = await base44.entities.SubSector.create({ name: newSubSectorName.trim(), sector: selectedSector });
    setSubSectors(prev => [...prev, created]);
    setNewSubSectorName("");
    setSavingSubSector(false);
  };

  const handleDeleteSubSector = async (id) => {
    const subToDelete = subSectors.find(s => s.id === id);
    if (!subToDelete) return;

    await base44.entities.SubSector.delete(id);
    setSubSectors(prev => prev.filter(s => s.id !== id));
    
    if (selectedSubSector === subToDelete.name) {
      setSelectedSubSector("");
    }

    const missionsToUpdate = missions.filter(m => m.sub_sector === subToDelete.name);
    for (const m of missionsToUpdate) {
      await base44.functions.invoke('updateMission', { id: m.id, sub_sector: "" });
    }
    setMissions(prev => prev.map(m => m.sub_sector === subToDelete.name ? { ...m, sub_sector: "" } : m));
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
          <h1 className="sm:text-md font-bold text-white flex items-center gap-2 uppercase">
            <Zap className="w-6 h-6 text-green-400" />
            Sistema de Pontuação
          </h1>
          <p className="text-gray-400 text-xs mt-1">Todas as tarefas e quantos pontos cada uma vale</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdminOrManager && (
            <button
              onClick={() => setShowSubSectorMgmt(p => !p)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${showSubSectorMgmt ? "bg-blue-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"}`}
            >
              <Tag className="w-4 h-4" />
              Sub-setores
            </button>
          )}
          {isAdminOrManager && (
            <button
              onClick={() => { setShowForm(!showForm); setForm({ title: "", description: "", points: "", sector: selectedSector === "Todos" ? "" : selectedSector, category: "Performance & Resultados", frequency: "", sub_sector: "" }); }}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </button>
          )}
        </div>
      </div>

      {/* Sub-sector management panel (admin) */}
      {showSubSectorMgmt && isAdminOrManager && (
        <div className="bg-gray-800 border border-blue-700/40 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-400" />
            Sub-setores de <span className="text-blue-400">{selectedSector}</span>
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {currentSubSectors.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum sub-setor cadastrado para este setor.</p>
            ) : (
              currentSubSectors.map(s => (
                <div key={s.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/30 border border-blue-700/40 rounded-xl">
                  <span className="text-blue-300 text-sm font-medium">{s.name}</span>
                  <button onClick={() => handleDeleteSubSector(s.id)} className="text-red-400 hover:text-red-300 transition-colors ml-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={newSubSectorName}
              onChange={e => setNewSubSectorName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddSubSector(); }}
              placeholder={`Novo sub-setor para ${selectedSector}...`}
              className="flex-1 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAddSubSector}
              disabled={savingSubSector || !newSubSectorName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {savingSubSector ? "..." : "Adicionar"}
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && isAdminOrManager && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4">Nova Tarefa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Título da tarefa *" className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição (opcional)" className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            <input type="number" value={form.points} onChange={e => setForm(p => ({ ...p, points: e.target.value }))} placeholder="Pontos *" className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            <select value={form.sector} onChange={e => setForm(p => ({ ...p, sector: e.target.value, sub_sector: "" }))} className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
              <option value="">Setor *</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="Todos">Todos</option>
            </select>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
            </select>
            <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
              <option value="">Frequência (opcional)</option>
              <option value="Diária">Diária</option>
              <option value="Semanal">Semanal</option>
              <option value="Mensal">Mensal</option>
            </select>
            {(() => {
              const sectorSubs = subSectors.filter(s => s.sector === form.sector);
              if (sectorSubs.length === 0) return null;
              return (
                <select value={form.sub_sector} onChange={e => setForm(p => ({ ...p, sub_sector: e.target.value }))} className="bg-gray-900 border border-blue-700/50 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Sub-setor (opcional)</option>
                  {sectorSubs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              );
            })()}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors">Criar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        {/* Sidebar */}
        <aside className="w-full lg:w-48 lg:shrink-0 bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible">
            {availableSectors.map((sector) => (
              <button
                key={sector}
                onClick={() => { setSelectedSector(sector); setSelectedSubSector(""); }}
                className={`shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-all border-b lg:border-b border-r lg:border-r-0 border-gray-700 last:border-0 whitespace-nowrap ${
                  selectedSector === sector
                    ? "bg-green-500 text-black"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 bg-gradient-to-br ${SECTOR_COLORS[sector]}`} />
                <span className="truncate text-left">{sector}</span>
                {subSectors.filter(s => s.sector === sector).length > 0 && (
                  <Tag className="w-3 h-3 shrink-0 opacity-60" />
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 w-full min-w-0 space-y-4">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900/40 border border-white/5 backdrop-blur-md rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-green-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Target className="w-16 h-16 text-white" />
              </div>
              <div className="relative z-10">
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Total de Tarefas</p>
                <h2 className="text-4xl font-black text-white">{stats.total}</h2>
              </div>
            </div>

            <div className="bg-gray-900/40 border border-white/5 backdrop-blur-md rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-yellow-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Star className="w-16 h-16 text-white" />
              </div>
              <div className="relative z-10">
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Pontos Possíveis</p>
                <h2 className="text-4xl font-black text-yellow-400">{stats.points.toLocaleString()}</h2>
              </div>
            </div>

            <div className="bg-gray-900/40 border border-white/5 backdrop-blur-md rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-green-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap className="w-16 h-16 text-white" />
              </div>
              <div className="relative z-10">
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Maior Recompensa</p>
                <h2 className="text-4xl font-black text-green-400">+{stats.max}</h2>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-green-500 transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar tarefas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900/40 border border-white/5 text-sm text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-green-500/50 transition-all shadow-lg backdrop-blur-sm"
            />
          </div>

          {/* Sub-sector filter dropdown */}
          {currentSubSectors.length > 0 && (
            <div className="flex items-center gap-3 bg-gray-900/40 border border-white/5 backdrop-blur-md p-3 rounded-xl shadow-sm">
              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest shrink-0 ml-1">Filtro Sub-setor:</span>
              <select
                value={selectedSubSector}
                onChange={e => setSelectedSubSector(e.target.value)}
                className="bg-black/40 border border-white/5 text-xs text-blue-300 px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer"
              >
                <option value="">Todos os sub-setores</option>
                {currentSubSectors.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Missions grouped by category */}
          {sorted.length === 0 ? (
            <div className="bg-gray-900/40 border border-white/5 backdrop-blur-md rounded-2xl p-12 text-center text-gray-500">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma tarefa encontrada para este setor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {CATEGORIES.map(cat => {
                const items = sorted.filter(m => (m.category || "Performance & Resultados") === cat.key);
                if (items.length === 0) return null;
                const collapsed = collapsedCategories[cat.key];
                return (
                  <div key={cat.key} className={`border rounded-xl overflow-hidden bg-gray-900/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/40 ${cat.border} ${cat.text}`}>
                    <button
                      onClick={() => toggleCategory(cat.key)}
                      className={`w-full flex items-center justify-between px-5 py-3.5 hover:brightness-110 active:scale-[0.99] transition-all ${cat.bg}`}
                    >
                      <div className="flex items-center gap-2">
                        <cat.Icon className={`w-4 h-4 ${cat.iconColor || "text-white/80"}`} />
                        <span className="font-bold text-sm text-white">{cat.key}</span>
                        <span className="text-xs px-2 py-0.5 bg-black/20 rounded-full text-white/70">{items.length} {items.length === 1 ? "item" : "itens"}</span>
                      </div>
                      {collapsed ? (
                        <motion.div animate={{ rotate: 0 }} transition={{ duration: 0.2 }}>
                          <ChevronRight className="w-4 h-4 text-white/60" />
                        </motion.div>
                      ) : (
                        <motion.div animate={{ rotate: 90 }} transition={{ duration: 0.2 }}>
                          <ChevronRight className="w-4 h-4 text-white/60" />
                        </motion.div>
                      )}
                    </button>

                    {!collapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="bg-gray-900/60 backdrop-blur-md border-t border-white/5"
                      >
                        <div className={`grid items-center gap-4 px-5 py-2.5 border-b border-gray-700/10 ${isAdminOrManager ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]"}`}>
                          <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">Tarefa</span>
                          <span className="text-gray-500 text-xs font-medium uppercase tracking-wide text-right">Pontos</span>
                          {isAdminOrManager && <span />}
                        </div>
                        <div className="divide-y divide-gray-700/10">
                          {items.map((mission) => {
                            const isEditingThis = editing?.id === mission.id;
                            const missionSectorSubs = subSectors.filter(s => s.sector === mission.sector);
                            return (
                              <div key={mission.id} className={`grid items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors ${isAdminOrManager ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]"}`}>
                                <div className="min-w-0">
                                  {isEditingThis ? (
                                    <div className="space-y-2">
                                      <input value={editing.title} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                                      <input value={editing.description} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} placeholder="Descrição" className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500" />
                                      <select value={editing.frequency} onChange={e => setEditing(p => ({ ...p, frequency: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500">
                                        <option value="">Frequência (opcional)</option>
                                        <option value="Diária">Diária</option>
                                        <option value="Semanal">Semanal</option>
                                        <option value="Mensal">Mensal</option>
                                      </select>
                                      {missionSectorSubs.length > 0 && (
                                        <select value={editing.sub_sector || ""} onChange={e => setEditing(p => ({ ...p, sub_sector: e.target.value }))} className="w-full bg-gray-900 border border-blue-700/50 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500">
                                          <option value="">Sub-setor (opcional)</option>
                                          {missionSectorSubs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        </select>
                                      )}
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                                        <p className="text-white text-sm font-medium break-words leading-tight">{mission.title}</p>
                                        {mission.sector === "Todos" && (
                                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded-md font-bold uppercase tracking-wider">Todos</span>
                                        )}
                                        {mission.sub_sector && (
                                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/40 text-blue-300 rounded-md font-bold uppercase tracking-wider border border-blue-800/30">{mission.sub_sector}</span>
                                        )}
                                        {mission.frequency && (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                                            mission.frequency === "Diária" ? "bg-blue-900/40 text-blue-300 border-blue-800/30" :
                                            mission.frequency === "Semanal" ? "bg-purple-900/40 text-purple-300 border-purple-800/30" :
                                            "bg-amber-900/40 text-amber-300 border-amber-800/30"
                                          }`}>{mission.frequency}</span>
                                        )}
                                      </div>
                                      {mission.description && (
                                        <p className="text-gray-400 text-xs mt-1 break-words opacity-80 italic">{mission.description}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {isEditingThis ? (
                                  <input type="number" value={editing.points} onChange={e => setEditing(p => ({ ...p, points: e.target.value }))} className="w-20 bg-gray-900 border border-gray-600 text-white rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-green-500" />
                                ) : (
                                  <div className="flex items-center gap-1 justify-end">
                                    <Star className="w-3.5 h-3.5 text-green-400/80" />
                                    <span className={`font-bold text-sm ${mission.points >= 0 ? "text-green-400" : "text-red-400"}`}>{mission.points}</span>
                                  </div>
                                )}
                                {isAdminOrManager && (
                                  <div className="flex items-center gap-1 justify-end">
                                    {isEditingThis ? (
                                      <>
                                        <button onClick={() => handleSaveEdit(mission.id)} className="p-1.5 text-green-400 hover:bg-green-900/20 rounded-lg transition-colors"><Check className="w-4 h-4" /></button>
                                        <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                                      </>
                                    ) : (
                                      <>
                                        <button onClick={() => setEditing({ id: mission.id, title: mission.title, points: mission.points, description: mission.description || "", frequency: mission.frequency || "", sub_sector: mission.sub_sector || "" })} className="p-1.5 text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(mission.id)} className="p-1.5 text-red-500 hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
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
