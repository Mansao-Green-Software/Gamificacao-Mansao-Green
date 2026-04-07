import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Plus, Edit2, Check, X, Trash2, ListChecks, Clock, CheckCircle, RotateCcw, Camera } from "lucide-react";

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
  const [form, setForm] = useState({ title: "", description: "", points: "", sector: "Todos", expires_at: "", rules: [] });
  const [newRule, setNewRule] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedRules, setExpandedRules] = useState({});
  const toggleRules = (id) => setExpandedRules(p => ({ ...p, [id]: !p[id] }));
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [requestModal, setRequestModal] = useState(null);
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const handleAttachmentUpload = async (file) => {
    if (!file) return;
    setUploadingAttachment(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAttachments(prev => [...prev, file_url]);
    setUploadingAttachment(false);
  };

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me().catch(() => null);
      setUser(u);
      const [list, profs, reqs] = await Promise.all([
        base44.entities.SurpriseMission.filter({ is_active: true }),
        base44.entities.EmployeeProfile.list(),
        u ? base44.entities.MissionRequest.list("-created_date", 200) : Promise.resolve([]),
      ]);
      setMissions(list);
      if (u) {
        const p = profs.find(p => p.user_id === u.id || p.email === u.email);
        setProfile(p || null);
        setMyRequests(reqs.filter(r => r.employee_id === u.id || (p && r.employee_id === p.user_id)));
      }
      setLoading(false);
    };
    init();
  }, []);

  const getReqStatus = (missionId) => {
    const req = myRequests.find(r => r.mission_id === missionId);
    return req?.status || null;
  };

  const handleSubmitRequest = async () => {
    if (!requestModal || !user) return;
    setSubmitting(true);
    const effectiveRole = profile?.role || user.role;
    const sector = effectiveRole === "manager" || effectiveRole === "admin" ? "Gerência" : effectiveRole === "supervisor" ? "Supervisor" : (profile?.sector || userSector || "Todos");
    const req = await base44.entities.MissionRequest.create({
      employee_id: profile?.user_id || profile?.id || user.id,
      employee_name: profile?.full_name || user.full_name,
      sector,
      mission_id: requestModal.id,
      mission_title: requestModal.title,
      mission_points: requestModal.points,
      status: "pendente",
      justification: justification || "",
      attachments,
    });
    setMyRequests(prev => [req, ...prev]);
    setSubmitting(false);
    setRequestModal(null);
    setJustification("");
    setAttachments([]);
  };

  const visibleMissions = missions.filter(m => {
    if (!m.is_active) return false;
    if (m.expires_at && new Date(m.expires_at) < new Date()) return false;
    if (m.sector === "Todos") return true;
    return m.sector === userSector;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: "", description: "", points: "", sector: "Todos", expires_at: "", rules: [] });
    setNewRule("");
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
      rules: m.rules || [],
    });
    setNewRule("");
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
      rules: form.rules || [],
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
                {user && (() => {
                  const status = getReqStatus(m.id);
                  return (
                    <button
                      onClick={() => { if (status !== "pendente") { setRequestModal(m); setJustification(""); } }}
                      disabled={status === "pendente"}
                      className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        status === "pendente" ? "bg-amber-900/40 text-amber-400 cursor-not-allowed" :
                        status === "aprovado" ? "bg-gray-700 hover:bg-gray-600 text-white" :
                        "bg-yellow-500 hover:bg-yellow-400 text-black"
                      }`}
                    >
                      {status === "pendente" ? <><Clock className="w-3.5 h-3.5" /> Aguardando aprovação</> :
                       status === "aprovado" ? <><RotateCcw className="w-3.5 h-3.5" /> Solicitar novamente</> :
                       <><Zap className="w-3.5 h-3.5" /> Solicitar pontuação</>}
                    </button>
                  );
                })()}
                {m.rules?.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => toggleRules(m.id)}
                      className="flex items-center gap-1.5 text-amber-300/80 text-xs font-semibold uppercase tracking-wide hover:text-amber-300 transition-colors"
                    >
                      <ListChecks className="w-3.5 h-3.5" />
                      Regras ({m.rules.length})
                      <span className="ml-0.5">{expandedRules[m.id] ? "▲" : "▼"}</span>
                    </button>
                    {expandedRules[m.id] && (
                      <ul className="mt-2 space-y-1">
                        {m.rules.map((rule, i) => (
                          <li key={i} className="text-amber-100/80 text-sm flex items-start gap-2">
                            <span className="text-yellow-400 font-bold shrink-0">{i + 1}.</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
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
      {/* Request Modal */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Solicitar Pontuação</h3>
            <p className="text-gray-400 text-sm mb-4">{requestModal.title} · <span className="text-yellow-400 font-bold">{requestModal.points > 0 ? "+" : ""}{requestModal.points} pts</span></p>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Justificativa (opcional)</label>
                <textarea
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Descreva o que foi feito..."
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500 resize-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Fotos / Anexos (opcional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-600 group">
                      <img src={url} alt="anexo" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
                  <Camera className="w-4 h-4" />
                  {uploadingAttachment ? "Enviando..." : "Adicionar foto"}
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleAttachmentUpload(e.target.files[0])} disabled={uploadingAttachment} />
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSubmitRequest} disabled={submitting} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-xl text-sm transition-colors disabled:opacity-50">
                {submitting ? "Enviando..." : "Enviar Solicitação"}
              </button>
              <button onClick={() => setRequestModal(null)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="col-span-2">
              <label className="text-gray-400 text-xs mb-1.5 block">Regras (opcional)</label>
              <div className="space-y-2">
                {form.rules.map((rule, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-yellow-400 text-xs font-bold shrink-0">{i + 1}.</span>
                    <input
                      value={rule}
                      onChange={e => setForm(p => ({ ...p, rules: p.rules.map((r, idx) => idx === i ? e.target.value : r) }))}
                      className="flex-1 bg-gray-900 border border-gray-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                    />
                    <button onClick={() => setForm(p => ({ ...p, rules: p.rules.filter((_, idx) => idx !== i) }))} className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    value={newRule}
                    onChange={e => setNewRule(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && newRule.trim()) { setForm(p => ({ ...p, rules: [...p.rules, newRule.trim()] })); setNewRule(""); } }}
                    placeholder="Digite uma regra e pressione Enter..."
                    className="flex-1 bg-gray-900 border border-gray-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                  />
                  <button
                    onClick={() => { if (newRule.trim()) { setForm(p => ({ ...p, rules: [...p.rules, newRule.trim()] })); setNewRule(""); } }}
                    className="p-2 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-400 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
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