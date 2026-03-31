import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Target, Plus, Trash2, CheckCircle, Clock, XCircle, Bell, Camera, X, Image, ChevronDown, ChevronRight } from "lucide-react";

const CATEGORIES = [
  { key: "Performance & Resultados", emoji: "🚀", color: "border-orange-700/50 bg-orange-900/20" },
  { key: "Disciplina & Organização", emoji: "📋", color: "border-blue-700/50 bg-blue-900/20" },
  { key: "Cultura & Atitude Green", emoji: "💚", color: "border-green-700/50 bg-green-900/20" },
  { key: "Bônus de Pontuação", emoji: "⭐", color: "border-yellow-700/50 bg-yellow-900/20" },
  { key: "Punições (Perda de Pontos)", emoji: "🔴", color: "border-red-700/50 bg-red-900/20" },
  { key: "Participação em Ações", emoji: "🎯", color: "border-cyan-700/50 bg-cyan-900/20" },
];

const SECTORS = ["Social Media", "Audiovisual", "Tráfego", "Líder de Projeto", "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Affiliates", "Administrativo", "Gerência", "Saúde e Bem Estar", "Serviços Gerais", "TV Green", "Feira FC", "Todos"];

export default function Missions() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [missions, setMissions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", points: "", sector: "" });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("missoes");
  const [submitting, setSubmitting] = useState(null);
  const [approving, setApproving] = useState(null);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const toggleCategory = (cat) => setCollapsedCategories(p => ({ ...p, [cat]: !p[cat] }));
  const [requestModal, setRequestModal] = useState(null);
  const [justification, setJustification] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const [ms, profs, reqs] = await Promise.all([
        base44.entities.Mission.filter({ is_active: true }),
        base44.entities.EmployeeProfile.list(),
        base44.entities.MissionRequest.list("-created_date", 500),
      ]);
      setMissions(ms);
      setRequests(reqs);
      const myProfile = profs.find(p => p.user_id === u.id || p.email === u.email);
      setProfile(myProfile || null);
      setLoading(false);
    };
    load();
  }, []);

  const effectiveRole = profile?.role || user?.role;
  const isAdmin = effectiveRole === "admin";
  const isManager = effectiveRole === "manager" || effectiveRole === "supervisor" || isAdmin;
  const mySector = profile?.sector || user?.sector;
  const myExtraSectors = profile?.extra_sectors || [];
  const allMySectors = mySector ? [mySector, ...myExtraSectors] : [];

  const visibleMissions = missions.filter(m => {
    if (!m.is_active) return false;
    if (isAdmin) return true;
    return allMySectors.includes(m.sector) || m.sector === "Todos";
  });

  // Requests for current employee
  const myRequests = requests.filter(r => r.employee_id === user?.id);
  const myRequestMap = {};
  myRequests.forEach(r => { myRequestMap[r.mission_id] = r; });

  // Pending requests visible to manager
  const pendingRequests = isManager
    ? requests.filter(r => {
        if (r.status !== "pendente") return false;
        if (isAdmin) return true;
        return allMySectors.includes(r.sector);
      })
    : [];

  const pendingCount = pendingRequests.length;

  const openRequestModal = (mission) => {
    const existing = myRequestMap[mission.id];
    if (existing) return;
    setRequestModal(mission);
    setJustification("");
    setAttachments([]);
  };

  const handleAttachmentUpload = async (file) => {
    if (!file) return;
    setUploadingAttachment(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAttachments(prev => [...prev, file_url]);
    setUploadingAttachment(false);
  };

  const handleSubmitRequest = async () => {
    if (!requestModal) return;
    setSubmitting(requestModal.id);
    const req = await base44.entities.MissionRequest.create({
      employee_id: profile?.user_id || user.id,
      employee_name: profile?.full_name || user.full_name,
      sector: mySector,
      mission_id: requestModal.id,
      mission_title: requestModal.title,
      mission_points: requestModal.points,
      status: "pendente",
      justification: justification || "",
      attachments: attachments,
    });
    setRequests(prev => [req, ...prev]);
    setSubmitting(null);
    setRequestModal(null);
  };

  const handleApprove = async (request) => {
    setApproving(request.id);
    // Busca o nome cadastrado no perfil do colaborador
    const allProfs = await base44.entities.EmployeeProfile.list();
    const empProfile = allProfs.find(p => p.user_id === request.employee_id || p.id === request.employee_id);
    const empName = empProfile?.full_name || request.employee_name;
    const empId = empProfile?.user_id || request.employee_id;
    await base44.entities.MissionRequest.update(request.id, { status: "aprovado", employee_name: empName });
    await base44.entities.PointTransaction.create({
      employee_id: empId,
      employee_name: empName,
      sector: request.sector,
      points: request.mission_points,
      type: "mission",
      mission_id: request.mission_id,
      mission_title: request.mission_title,
      description: `Missão aprovada: ${request.mission_title}`,
      awarded_by_name: profile?.full_name || user.full_name,
    });
    setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: "aprovado" } : r));
    setApproving(null);
  };

  const handleReject = async (request) => {
    await base44.entities.MissionRequest.update(request.id, { status: "rejeitado" });
    setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: "rejeitado" } : r));
  };

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
    await base44.entities.Mission.update(id, { is_active: false });
    setMissions(prev => prev.filter(m => m.id !== id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-green-400" />
            Missões
          </h1>
          <p className="text-gray-400 text-sm mt-1">Solicite pontuação ao concluir uma tarefa</p>
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

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-800 border border-gray-700 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("missoes")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "missoes" ? "bg-green-500 text-white" : "text-gray-400 hover:text-white"}`}
        >
          Missões
        </button>
        {!isManager && (
          <button
            onClick={() => setTab("minhas")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "minhas" ? "bg-green-500 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Minhas Solicitações
          </button>
        )}
        {isManager && (
          <button
            onClick={() => setTab("solicitacoes")}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "solicitacoes" ? "bg-green-500 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Solicitações
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && isManager && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">Nova Missão</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Título da missão" className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição (opcional)" rows={2} className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
            <input type="number" value={form.points} onChange={e => setForm(p => ({ ...p, points: e.target.value }))} placeholder="Pontos" className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            <select value={form.sector} onChange={e => setForm(p => ({ ...p, sector: e.target.value }))} className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
              <option value="">Selecione o setor</option>
              {SECTORS.filter(s => isAdmin ? true : allMySectors.includes(s) || s === "Todos").map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors">Criar Missão</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {/* TAB: Missões */}
      {tab === "missoes" && (
        visibleMissions.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma missão disponível para o seu setor ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {CATEGORIES.map(cat => {
              const catMissions = visibleMissions.filter(m => (m.category || "Performance & Resultados") === cat.key);
              if (catMissions.length === 0) return null;
              const collapsed = collapsedCategories[cat.key];
              return (
                <div key={cat.key} className={`border rounded-2xl overflow-hidden ${cat.color}`}>
                  <button
                    onClick={() => toggleCategory(cat.key)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-black/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="font-bold text-sm text-white">{cat.key}</span>
                      <span className="text-xs px-2 py-0.5 bg-black/20 rounded-full text-white/70">{catMissions.length}</span>
                    </div>
                    {collapsed ? <ChevronRight className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />}
                  </button>
                  {!collapsed && (
                    <div className="bg-gray-800 border-t border-gray-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {catMissions.map(mission => {
              const req = myRequestMap[mission.id];
              const approved = req?.status === "aprovado";
              const pending = req?.status === "pendente";
              const rejected = req?.status === "rejeitado";

              return (
                <div key={mission.id} className={`bg-gray-900/60 border rounded-2xl p-5 flex flex-col gap-3 ${approved ? "border-green-700/50" : "border-gray-700"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-white font-bold text-sm">{mission.title}</h3>
                      {mission.description && <p className="text-gray-400 text-xs mt-1">{mission.description}</p>}
                    </div>
                    {approved && <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />}
                    {pending && <Clock className="w-5 h-5 text-amber-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-lg ${mission.points >= 0 ? "text-green-400" : "text-red-400"}`}>{mission.points > 0 ? "+" : ""}{mission.points}</span>
                    <span className="text-gray-500 text-xs">pontos</span>
                    <span className="ml-auto text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full">{mission.sector}</span>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    {!isManager && (
                      <button
                        onClick={() => !pending && openRequestModal(mission)}
                        disabled={pending}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                          pending ? "bg-amber-900/40 text-amber-400 cursor-not-allowed" :
                          "bg-green-500 hover:bg-green-400 text-black font-semibold"
                        }`}
                      >
                        {pending ? "⏳ Aguardando aprovação" : approved ? "↩ Solicitar novamente" : rejected ? "↩ Solicitar novamente" : submitting === mission.id ? "..." : "Solicitar pontuação"}
                      </button>
                    )}
                    {isManager && (
                      <button onClick={() => handleDelete(mission.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded-xl transition-colors shrink-0 ml-auto">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
        )
      )}

      {/* Request Modal */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Solicitar Pontuação</h3>
            <p className="text-gray-400 text-sm mb-4">{requestModal.title} · <span className="text-green-400 font-bold">{requestModal.points > 0 ? "+" : ""}{requestModal.points} pts</span></p>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Justificativa (opcional)</label>
                <textarea
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Descreva o que foi feito..."
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">Anexos / Imagens (opcional)</label>
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
                  {uploadingAttachment ? "Enviando..." : "Adicionar imagem"}
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleAttachmentUpload(e.target.files[0])} />
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSubmitRequest}
                disabled={submitting === requestModal.id}
                className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {submitting === requestModal.id ? "Enviando..." : "Enviar Solicitação"}
              </button>
              <button onClick={() => setRequestModal(null)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Minhas Solicitações (employee) */}
      {tab === "minhas" && !isManager && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-green-400" />
            Minhas Solicitações
          </h3>
          {myRequests.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Você ainda não fez nenhuma solicitação.</p>
          ) : (
            <div className="space-y-3">
              {myRequests.map(r => (
                <div key={r.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl">
                  <div>
                    <p className="text-white font-medium text-sm">{r.mission_title}</p>
                    <p className="text-gray-500 text-xs">{new Date(r.created_date).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-sm ${r.mission_points >= 0 ? "text-green-400" : "text-red-400"}`}>{r.mission_points > 0 ? "+" : ""}{r.mission_points} pts</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      r.status === "aprovado" ? "bg-green-900/50 text-green-300" :
                      r.status === "rejeitado" ? "bg-red-900/50 text-red-300" :
                      "bg-amber-900/50 text-amber-300"
                    }`}>
                      {r.status === "aprovado" ? "✓ Aprovado" : r.status === "rejeitado" ? "✗ Rejeitado" : "⏳ Pendente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Solicitações (manager) */}
      {tab === "solicitacoes" && isManager && (
        <div className="space-y-4">
          {/* Pendentes */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Pendentes de Aprovação
              {pendingCount > 0 && <span className="px-2 py-0.5 bg-amber-900/50 text-amber-300 text-xs rounded-full">{pendingCount}</span>}
            </h3>
            {pendingRequests.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Nenhuma solicitação pendente.</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{r.mission_title}</p>
                      <p className="text-gray-400 text-xs">{r.employee_name} · {r.sector}</p>
                      <p className="text-gray-500 text-xs">{new Date(r.created_date).toLocaleDateString("pt-BR")}</p>
                      {r.justification && (
                        <p className="text-gray-300 text-xs mt-1.5 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">💬 {r.justification}</p>
                      )}
                      {r.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {r.attachments.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-lg overflow-hidden border border-gray-600 block hover:border-green-500 transition-colors">
                              <img src={url} alt="anexo" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-green-400 font-bold text-sm">{r.mission_points > 0 ? "+" : ""}{r.mission_points} pts</span>
                      <button
                        onClick={() => handleApprove(r)}
                        disabled={approving === r.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {approving === r.id ? "..." : "Aprovar"}
                      </button>
                      <button
                        onClick={() => handleReject(r)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 rounded-lg text-xs font-medium transition-colors border border-red-700/40"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico */}
          {(() => {
            const history = requests.filter(r => r.status !== "pendente" && (isAdmin || allMySectors.includes(r.sector)));
            if (history.length === 0) return null;
            return (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">Histórico</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-xl">
                      <div>
                        <p className="text-white text-sm">{r.mission_title}</p>
                        <p className="text-gray-500 text-xs">{r.employee_name} · {new Date(r.created_date).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.status === "aprovado" ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"}`}>
                        {r.status === "aprovado" ? "✓ Aprovado" : "✗ Rejeitado"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}