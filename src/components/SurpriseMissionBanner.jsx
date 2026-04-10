import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, Plus, Edit2, Check, X, Trash2, ListChecks, Clock, RotateCcw, Camera, Trophy, Star, Gift, Flame, Target } from "lucide-react";

const SECTORS = [
  "Todos", "Social Media", "Audiovisual", "Tráfego", "Líder de Projeto",
  "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Affiliates",
  "Administrativo", "Gerência", "Saúde e Bem Estar", "Serviços Gerais",
  "TV Green", "Feira FC", "TI", "IA/Automação", "Supervisor"
];

const ICON_OPTIONS = [
  { value: "zap", label: "Raio", Icon: Zap },
  { value: "trophy", label: "Troféu", Icon: Trophy },
  { value: "star", label: "Estrela", Icon: Star },
  { value: "gift", label: "Presente", Icon: Gift },
  { value: "flame", label: "Fogo", Icon: Flame },
  { value: "target", label: "Alvo", Icon: Target },
];

const DEFAULT_BG_COLOR = "#422006";
const DEFAULT_TEXT_COLOR = "#facc15";

const sanitizeHexColor = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim();
  return /^#[0-9A-Fa-f]{3,6}$/.test(cleaned) ? cleaned : fallback;
};

const hexToRgb = (hex) => {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) {
    h = h.split("").map(c => c + c).join("");
  }
  if (h.length !== 6) return null;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(n => Number.isNaN(n))) return null;
  return { r, g, b };
};

const mixHex = (hex, mixFn) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { r, g, b } = rgb;
  const out = mixFn(r, g, b);
  return `#${[out.r, out.g, out.b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("")}`;
};

/** Gradiente horizontal: extremidades escuras e centro na cor base */
const cardBackgroundGradient = (baseHex) => {
  const base = sanitizeHexColor(baseHex, DEFAULT_BG_COLOR);
  const dark = mixHex(base, (r, g, b) => ({
    r: r * 0.55,
    g: g * 0.55,
    b: b * 0.55,
  }));
  return `linear-gradient(to right, ${dark} -50%, ${base} 55%, ${dark} 100%)`;
};

const STYLE_TAG_REGEX = /\[STYLE:(.*?)\]/;

const encodeStyleInDescription = (description, style) => {
  const baseDesc = (description || "").replace(STYLE_TAG_REGEX, "").trim();
  return `${baseDesc} [STYLE:${JSON.stringify(style)}]`.trim();
};

const decodeStyleFromMission = (mission) => {
  const styleInDesc = mission.description?.match(STYLE_TAG_REGEX);
  let decoded = {};
  if (styleInDesc?.[1]) {
    try {
      decoded = JSON.parse(styleInDesc[1]);
    } catch (e) {
      console.warn("Falha ao decodificar estilo da missão", mission.id);
    }
  }
  return {
    background_color: mission.background_color || decoded.bg || DEFAULT_BG_COLOR,
    text_color: mission.text_color || decoded.text || DEFAULT_TEXT_COLOR,
    icon: mission.icon || decoded.icon || "zap",
    description: (mission.description || "").replace(STYLE_TAG_REGEX, "").trim()
  };
};

export default function SurpriseMissionBanner({ isAdmin, userSector }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    points: "",
    sector: "Todos",
    expires_at: "",
    rules: [],
    background_color: DEFAULT_BG_COLOR,
    text_color: DEFAULT_TEXT_COLOR,
    icon: "zap",
  });
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
  const [saveError, setSaveError] = useState(null);

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
      const enrichedMissions = list.map(m => {
        const decoded = decodeStyleFromMission(m);
        return { ...m, ...decoded };
      });
      setMissions(enrichedMissions);
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
    const missionRequests = myRequests.filter(r => r.mission_id === missionId);
    if (missionRequests.some(r => r.status === "pendente")) return "pendente";
    if (missionRequests.some(r => r.status === "aprovado")) return "aprovado";
    return missionRequests[0]?.status || null;
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
    if (!isAdmin && getReqStatus(m.id) === "aprovado") return false;
    // Admin vê todas as missões (exceto regras acima). Colaborador só vê do próprio setor ou "Todos".
    if (isAdmin) return true;
    const missionSector = m.sector || "Todos";
    if (missionSector === "Todos") return true;
    return missionSector === userSector;
  });

  const openCreate = () => {
    setSaveError(null);
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      points: "",
      sector: "Todos",
      expires_at: "",
      rules: [],
      background_color: DEFAULT_BG_COLOR,
      text_color: DEFAULT_TEXT_COLOR,
      icon: "zap",
    });
    setNewRule("");
    setEditing(true);
  };

  const openEdit = (m) => {
    setSaveError(null);
    setEditingId(m.id);
    setForm({
      title: m.title || "",
      description: m.description || "",
      points: String(m.points || ""),
      sector: m.sector || "Todos",
      expires_at: m.expires_at ? m.expires_at.slice(0, 16) : "",
      rules: m.rules || [],
      background_color: sanitizeHexColor(m.background_color, DEFAULT_BG_COLOR),
      text_color: sanitizeHexColor(m.text_color, DEFAULT_TEXT_COLOR),
      icon: ICON_OPTIONS.some(opt => opt.value === m.icon) ? m.icon : "zap",
    });
    setNewRule("");
    setEditing(true);
  };

  const buildStyleFields = () => ({
    background_color: sanitizeHexColor(form.background_color, DEFAULT_BG_COLOR),
    text_color: sanitizeHexColor(form.text_color, DEFAULT_TEXT_COLOR),
    icon: ICON_OPTIONS.some(opt => opt.value === form.icon) ? form.icon : "zap",
  });

  const buildCorePayload = () => {
    const pts = Number.parseInt(String(form.points).trim(), 10);
    const payload = {
      title: form.title.trim(),
      description: (form.description || "").trim(),
      points: pts,
      sector: form.sector || "Todos",
      rules: form.rules || [],
      is_active: true,
    };
    if (form.expires_at) {
      const exp = new Date(form.expires_at);
      if (!Number.isNaN(exp.getTime())) payload.expires_at = exp.toISOString();
    }
    return payload;
  };

  const handleSave = async () => {
    if (!form.title?.trim() || form.points === "" || form.points == null) return;
    const core = buildCorePayload();
    if (!Number.isFinite(core.points)) {
      setSaveError("Informe um número válido de pontos.");
      return;
    }
    setSaveError(null);
    setSaving(true);
    const style = buildStyleFields();
    const styleMeta = { bg: style.background_color, text: style.text_color, icon: style.icon };
    const coreWithStyle = {
      ...core,
      description: encodeStyleInDescription(core.description, styleMeta)
    };
    const fullPayload = { ...coreWithStyle, ...style };

    const applyLocalMission = (m) => {
      // Garantir que o estado local mostre a descrição "limpa" para o usuário
      const cleanM = { ...m, description: core.description };
      if (editingId) {
        setMissions(prev => prev.map(x => x.id === editingId ? { ...x, ...cleanM } : x));
      } else {
        setMissions(prev => [...prev, cleanM]);
      }
    };

    try {
      if (editingId) {
        // Tenta salvar com todos os campos. Se o banco aceitar background_color, ótimo.
        // O estilo codificado na descrição garante que se o banco ignorar os campos extras,
        // ainda teremos a informação no reload.
        await base44.entities.SurpriseMission.update(editingId, fullPayload);
        applyLocalMission({ id: editingId, ...fullPayload });
      } else {
        const created = await base44.entities.SurpriseMission.create(fullPayload);
        applyLocalMission({ ...created, ...style });
      }
      setEditing(false);
      setEditingId(null);
    } catch (err) {
      console.warn("SurpriseMission salvar (completo/style) falhou, tentando apenas com descrição codificada:", err);
      try {
        if (editingId) {
          await base44.entities.SurpriseMission.update(editingId, coreWithStyle);
          applyLocalMission({ id: editingId, ...coreWithStyle, ...style });
        } else {
          const created = await base44.entities.SurpriseMission.create(coreWithStyle);
          applyLocalMission({ ...created, ...style });
        }
        setEditing(false);
        setEditingId(null);
      } catch (err2) {
        console.error(err2);
        setSaveError(err2?.message || "Não foi possível salvar a missão no banco de dados.");
      }
    } finally {
      setSaving(false);
    }
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
        (() => {
          const cardBgGradient = cardBackgroundGradient(m.background_color);
          const textColor = sanitizeHexColor(m.text_color, DEFAULT_TEXT_COLOR);
          const selectedIcon = ICON_OPTIONS.find(opt => opt.value === m.icon)?.Icon || Zap;
          const MissionIcon = selectedIcon;
          return (
        <div
          key={m.id}
          className="relative overflow-hidden rounded-2xl border border-white/10"
          style={{ background: cardBgGradient }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent pointer-events-none" />
          <div className="relative p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0 mt-0.5">
                <MissionIcon className="w-5 h-5" style={{ color: textColor }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: textColor }}>⚡ Missão Surpresa</span>
                  {m.sector !== "Todos" && (
                    <span className="text-xs px-2 py-0.5 bg-black/30 rounded-full" style={{ color: textColor }}>{m.sector}</span>
                  )}
                </div>
                {m.expires_at && (() => {
                  const now = new Date();
                  const exp = new Date(m.expires_at);
                  const diffMs = exp.getTime() - now.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffHours = Math.floor(diffMs / 3600000);
                  const diffDays = Math.floor(diffMs / 86400000);
                  const countdown = diffMs <= 0 ? "Expirada" : diffMins < 60 ? `Expira em ${diffMins}min` : diffHours < 24 ? `Expira em ${diffHours}h` : `Expira em ${diffDays} dia${diffDays !== 1 ? "s" : ""}`;
                  const isUrgent = diffMs > 0 && diffHours < 24;
                  return (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className={`w-3.5 h-3.5 ${isUrgent ? "text-red-400" : "text-amber-400"}`} />
                      <span className={`text-xs font-semibold ${isUrgent ? "text-red-300" : "text-amber-300"}`}>
                        {countdown} · até {exp.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })()}
                <h3 className="font-bold text-base leading-tight" style={{ color: textColor }}>{m.title}</h3>
                {m.description && <p className="text-sm mt-0.5" style={{ color: textColor }}>{m.description}</p>}
                <p className="font-bold text-lg mt-1" style={{ color: textColor }}>{m.points > 0 ? "+" : ""}{m.points} pts</p>
                {user && (() => {
                  const status = getReqStatus(m.id);
                  return (
                    <button
                      onClick={() => { if (!status) { setRequestModal(m); setJustification(""); } }}
                      disabled={!!status}
                      className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        status === "pendente" ? "bg-amber-900/40 text-amber-400 cursor-not-allowed" :
                        status === "aprovado" ? "bg-green-900/40 text-green-400 cursor-not-allowed" :
                        status === "rejeitado" ? "bg-red-900/40 text-red-400 cursor-not-allowed" :
                        "bg-yellow-500 hover:bg-yellow-400 text-black"
                      }`}
                    >
                      {status === "pendente" ? <><Clock className="w-3.5 h-3.5" /> Aguardando aprovação</> :
                       status === "aprovado" ? <><Check className="w-3.5 h-3.5" /> Já solicitado</> :
                       status === "rejeitado" ? <><X className="w-3.5 h-3.5" /> Solicitação rejeitada</> :
                       <><Zap className="w-3.5 h-3.5" /> Solicitar pontuação</>}
                    </button>
                  );
                })()}
                {m.rules?.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => toggleRules(m.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors"
                      style={{ color: textColor }}
                    >
                      <ListChecks className="w-3.5 h-3.5" />
                      Regras ({m.rules.length})
                      <span className="ml-0.5">{expandedRules[m.id] ? "▲" : "▼"}</span>
                    </button>
                    {expandedRules[m.id] && (
                      <ul className="mt-2 space-y-1">
                        {m.rules.map((rule, i) => (
                          <li key={i} className="text-sm flex items-start gap-2" style={{ color: textColor }}>
                            <span className="font-bold shrink-0" style={{ color: textColor }}>{i + 1}.</span>
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
          );
        })()
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
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Cor de fundo</label>
              <input
                type="color"
                value={form.background_color}
                onChange={e => setForm(p => ({ ...p, background_color: e.target.value }))}
                className="w-full h-11 bg-gray-900 border border-gray-600 rounded-xl px-2 py-1 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Cor da fonte</label>
              <input
                type="color"
                value={form.text_color}
                onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))}
                className="w-full h-11 bg-gray-900 border border-gray-600 rounded-xl px-2 py-1 cursor-pointer"
              />
            </div>
            <div className="col-span-2">
              <label className="text-gray-400 text-xs mb-1.5 block">Ícone do card</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ICON_OPTIONS.map(option => {
                  const Icon = option.Icon;
                  const isSelected = form.icon === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, icon: option.value }))}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        isSelected 
                          ? "bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.1)]" 
                          : "bg-gray-900 border-gray-600 text-gray-500 hover:border-gray-500 hover:bg-gray-800"
                      }`}
                      title={option.label}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] mt-1 font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
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
          {saveError && (
            <p className="text-red-400 text-sm" role="alert">{saveError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setEditingId(null); setSaveError(null); }}
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