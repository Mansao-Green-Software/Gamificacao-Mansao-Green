import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Plus, Edit2, Check, X, Trash2 } from "lucide-react";

const SECTORS = [
  "Todos", "Social Media", "Audiovisual", "Tráfego", "Líder de Projeto",
  "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Affiliates",
  "Administrativo", "Gerência", "Saúde e Bem Estar", "Serviços Gerais",
  "TV Green", "Feira FC", "TI", "IA/Automação", "Supervisor"
];

export default function SurpriseMissionBanner({ isAdmin, userSector }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", points: "", sector: "Todos", expires_at: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    base44.entities.SurpriseMission.filter({ is_active: true }).then((list) => {
      setMissions(list);
      setLoading(false);
    });
  }, []);

  const visibleMissions = missions.filter(m => {
    if (!m.is_active) return false;
    if (m.expires_at && new Date(m.expires_at) < new Date()) return false;
    if (m.sector === "Todos") return true;
    return m.sector === userSector;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: "", description: "", points: "", sector: "Todos", expires_at: "" });
    setEditing(true);
  };

  const openEdit = (m) => {
    setEditingId(m.id);
    setForm({
      title: m.title || "",
      description: m.description || "",
      points: String(m.points || ""),
      sector: m.sector || "Todos",
      expires_at: m.expires_at ? m.expires_at.slice(0, 16) : "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.points) return;
    setSaving(true);
    const data = {
      title: form.title,
      description: form.description,
      points: parseInt(form.points),
      sector: form.sector || "Todos",
      is_active: true,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    if (editingId) {
      const updated = await base44.entities.SurpriseMission.update(editingId, data);
      setMissions(prev => prev.map(m => m.id === editingId ? { ...m, ...data } : m));
    } else {
      const created = await base44.entities.SurpriseMission.create(data);
      setMissions(prev => [...prev, created]);
    }
    setSaving(false);
    setEditing(false);
    setEditingId(null);
  };

  const handleDeactivate = async (id) => {
    await base44.entities.SurpriseMission.update(id, { is_active: false });
    setMissions(prev => prev.filter(m => m.id !== id));
  };

  if (loading) return null;
  if (!isAdmin && visibleMissions.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Visible missions */}
      {visibleMissions.map(m => (
        <div
          key={m.id}
          className="relative overflow-hidden rounded-2xl border border-yellow-600/40 bg-gradient-to-r from-yellow-950/60 via-amber-900/40 to-yellow-950/60"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="relative p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">⚡ Missão Surpresa</span>
                  {m.sector !== "Todos" && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-900/60 text-yellow-300 rounded-full">{m.sector}</span>
                  )}
                  {m.expires_at && (
                    <span className="text-xs text-amber-400/70">
                      até {new Date(m.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                <h3 className="text-white font-bold text-base leading-tight">{m.title}</h3>
                {m.description && <p className="text-amber-200/70 text-sm mt-0.5">{m.description}</p>}
                <p className="text-yellow-400 font-bold text-lg mt-1">{m.points > 0 ? "+" : ""}{m.points} pts</p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(m)} className="p-1.5 text-yellow-400 hover:bg-yellow-900/40 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeactivate(m.id)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Admin: add button (only when no form open) */}
      {isAdmin && !editing && (
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/40 text-yellow-400 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Missão Surpresa
        </button>
      )}

      {/* Form */}
      {editing && isAdmin && (
        <div className="bg-gray-800 border border-yellow-700/40 rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-bold text-sm">{editingId ? "Editar Missão Surpresa" : "Nova Missão Surpresa"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Título da missão *"
              className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500"
            />
            <input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Descrição (opcional)"
              className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500"
            />
            <input
              type="number"
              value={form.points}
              onChange={e => setForm(p => ({ ...p, points: e.target.value }))}
              placeholder="Pontos *"
              className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500"
            />
            <select
              value={form.sector}
              onChange={e => setForm(p => ({ ...p, sector: e.target.value }))}
              className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500"
            >
              {SECTORS.map(s => <option key={s} value={s}>{s === "Todos" ? "Todos os setores" : s}</option>)}
            </select>
            <div className="col-span-2">
              <label className="text-gray-400 text-xs mb-1.5 block">Expira em (opcional)</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => { setEditing(false); setEditingId(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}