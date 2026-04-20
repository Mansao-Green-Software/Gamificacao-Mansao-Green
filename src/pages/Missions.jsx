import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Target, Plus, Trash2, CheckCircle, Clock, XCircle, Bell, Camera, X, Image, ChevronDown, ChevronRight, RotateCcw, Search } from "lucide-react";
import { formatBRT } from "@/utils/dateUtils";
import { FaRocket, FaClipboardList, FaHeart, FaStar, FaExclamationCircle, FaBullseye, FaComment } from 'react-icons/fa';


const CATEGORIES = [
  { key: "Performance & Resultados", Icon: FaRocket, bg: "bg-gradient-to-br from-purple-900/80 via-purple-800/40 to-purple-900/80", border: "border-purple-500/30", text: "text-purple-300" },
  { key: "Disciplina & Organização", Icon: FaClipboardList, bg: "bg-gradient-to-br from-blue-900/80 via-blue-800/40 to-blue-900/80", border: "border-blue-500/30", text: "text-blue-300" },
  { key: "Cultura & Atitude Green", Icon: FaHeart, iconColor: "text-green-400", bg: "bg-gradient-to-br from-green-600/80 via-green-500/30 to-green-600/80", border: "border-green-500/30", text: "text-green-300" },
  { key: "Bônus de Pontuação", Icon: FaStar, bg: "bg-gradient-to-br from-yellow-900/80 via-yellow-700/40 to-yellow-900/80", border: "border-yellow-500/30", text: "text-yellow-300" },
  { key: "Punições (Perda de Pontos)", Icon: FaExclamationCircle, iconColor: "text-red-500", bg: "bg-gradient-to-br from-red-900/80 via-red-800/40 to-red-900/80", border: "border-red-500/30", text: "text-red-300" },
  { key: "Participação em Ações", Icon: FaBullseye, iconColor: "text-white/80", bg: "bg-gradient-to-br from-cyan-900/80 via-cyan-800/40 to-cyan-900/80", border: "border-cyan-500/30", text: "text-cyan-300" },
];

const SECTORS = ["Social Media", "Audiovisual", "Tráfego", "Líder de Projeto", "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Affiliates", "Administrativo", "Gerência", "Saúde e Bem Estar", "Serviços Gerais", "Feira FC", "Todos"];

export default function Missions() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);
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
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [justification, setJustification] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [subSectors, setSubSectors] = useState([]);
  const [selectedSubSector, setSelectedSubSector] = useState("");
  const [selectedSectorFilter, setSelectedSectorFilter] = useState("");
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState("");

  const loadData = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    const u = user || await base44.auth.me();
    if (!user) setUser(u);
    const [ms, profs, reqs, subs] = await Promise.all([
      base44.entities.Mission.filter({ is_active: true }),
      base44.entities.EmployeeProfile.list(null, 1000),
      base44.entities.MissionRequest.list("-created_date", 1000),
      base44.entities.SubSector.list(),
    ]);
    setMissions(ms);
    setRequests(reqs);
    setAllProfiles(profs);
    setSubSectors(subs);
    const myProfile = profs.find(p => (p.user_id && p.user_id === u.id) || p.email === u.email);
    setProfile(myProfile || null);
    if (showSpinner) setRefreshing(false);
    return u;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        const [ms, profs, reqs, subs] = await Promise.all([
          base44.entities.Mission.filter({ is_active: true }),
          base44.entities.EmployeeProfile.list(null, 1000),
          base44.entities.MissionRequest.list("-created_date", 2000),
          base44.entities.SubSector.list(),
        ]);
        setMissions(ms);
        setRequests(reqs);
        setAllProfiles(profs);
        setSubSectors(subs);
        const myProfile = profs.find(p => (p.user_id && p.user_id === u.id) || p.email === u.email);
        setProfile(myProfile || null);
      } catch (e) {
        console.error("Missions load error:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const effectiveRole = profile?.role || user?.role;
  const isGerenteViewer = user?.email === "igaming@gruporoyalty.com";
  const isAdmin = effectiveRole === "admin";
  const isDirector = effectiveRole === "director";
  const isManager = effectiveRole === "manager" || effectiveRole === "supervisor" || isAdmin || isDirector;
  const mySector = profile?.sector || user?.sector;
  const myExtraSectors = profile?.extra_sectors || [];
  const allMySectors = mySector ? [mySector, ...myExtraSectors] : [];

  const mySectorSubSectors = subSectors.filter(s => allMySectors.includes(s.sector) || (isAdmin && s.sector));
  const visibleSectorSubSectors = subSectors.filter(s => {
    if (isAdmin) return true;
    return allMySectors.includes(s.sector);
  });

  // Bloqueia qualquer user (exceto admin) de dar ponto para si mesmo via ManagePoints
  const isSelf = (employeeId) => {
    return employeeId === user?.id || 
      (profile?.user_id && employeeId === profile.user_id) ||
      (profile?.id && employeeId === profile.id);
  };

  const visibleMissions = missions.filter(m => {
    if (!m.is_active) return false;
    if (isAdmin) return true;
    if (isDirector) return false;
    if (effectiveRole === "manager") return m.sector === "Gerência";
    if (effectiveRole === "supervisor") return m.sector === "Supervisor";
    return allMySectors.includes(m.sector) || m.sector === "Todos";
  });

  // Sectors present in visible missions (for filter)
  const availableSectorFilters = isAdmin || isManager
    ? [...new Set(visibleMissions.map(m => m.sector))].sort()
    : [];

  // Requests for current employee
  const myEmployeeId = profile?.user_id || profile?.id || user?.id;
  const myRequests = requests.filter(r =>
    r.employee_id === user?.id ||
    (profile?.user_id && r.employee_id === profile.user_id) ||
    (profile?.id && r.employee_id === profile.id)
  );
  // Build map keeping only the NEWEST request per mission (list is sorted newest-first)
  const myRequestMap = {};
  myRequests.forEach(r => { if (!myRequestMap[r.mission_id]) myRequestMap[r.mission_id] = r; });

  const myId = profile?.user_id || profile?.id || user?.id;

  // Missões com limite customizado de solicitações simultâneas (título exato → limite)
  const MULTI_REQUEST_LIMITS = {
    "Criativo que gera +1000 leads": 5,
  };

  // Verifica se já existe solicitação (pendente ou aprovada) para a missão no período
  const isRequestBlockedByFrequency = (mission) => {
    if (!mission.frequency) return false;
    const now = new Date();
    const relevantRequests = myRequests.filter(r =>
      r.mission_id === mission.id && (r.status === "pendente" || r.status === "aprovado")
    );

    // Se a missão tem limite customizado, verifica por contagem e não por período
    const customLimit = MULTI_REQUEST_LIMITS[mission.title];
    if (customLimit !== undefined) {
      return relevantRequests.length >= customLimit;
    }

    return relevantRequests.some(r => {
      const d = new Date(r.created_date);
      if (mission.frequency === "Diária") {
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (mission.frequency === "Semanal") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return d >= startOfWeek;
      }
      if (mission.frequency === "Mensal") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return false;
    });
  };

  // Pending requests visible to manager/supervisor/director - respecting hierarchy
  const pendingRequests = isManager
    ? requests.filter(r => {
        if (r.status !== "pendente") return false;
        if (r.employee_id === myId) return false; // nunca mostra própria solicitação
        if (isAdmin) return true;
        // Diretor: vê solicitações de todos do seu setor (incluindo gerentes)
        if (isDirector) {
          const empProfile = allProfiles.find(p => 
            (p.user_id && p.user_id === r.employee_id) || 
            p.id === r.employee_id ||
            (r.created_by && p.email === r.created_by)
          );
          const effectiveSector = (r.sector !== "Supervisor" ? r.sector : null) || empProfile?.sector;
          // Para gerentes, o sector da solicitação é "Gerência", mas o perfil tem o setor real
          if (empProfile?.role === "manager" || empProfile?.role === "director") {
            return allMySectors.includes(empProfile.sector);
          }
          return allMySectors.includes(effectiveSector);
        }
        // Resolve sector from request or fallback to employee profile
        // Note: some profiles have empty user_id, so also match by created_by email
        const empProfile = allProfiles.find(p => 
          (p.user_id && p.user_id === r.employee_id) || 
          p.id === r.employee_id ||
          (r.created_by && p.email === r.created_by)
        );
        const effectiveSector = (r.sector !== "Supervisor" ? r.sector : null) || empProfile?.sector;
        if (effectiveRole === "supervisor") {
          // Supervisor só vê colaboradores do seu setor (não outros supervisores)
          if (empProfile?.role === "supervisor" || empProfile?.role === "manager" || empProfile?.role === "admin") return false;
          return allMySectors.includes(effectiveSector);
        }
        // Gerente: aprova colaboradores E supervisores do seu setor
        return allMySectors.includes(effectiveSector);
      })
    : [];

  const pendingCount = pendingRequests.length;

  const openRequestModal = (mission) => {
    setRequestModal(mission);
    setRequestQuantity(1);
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

  const MONTHLY_LIMIT_EMAIL = "financeiro@gruporoyalty.com";

  const handleSubmitRequest = async () => {
    if (!requestModal) return;

    // Usuário com limite de 1 solicitação por mês (por missão)
    if (user?.email === MONTHLY_LIMIT_EMAIL) {
      const now = new Date();
      const thisMonthRequestsForMission = myRequests.filter(r => {
        const d = new Date(r.created_date);
        return r.mission_id === requestModal.id && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && r.status !== "rejeitado";
      });
      if (thisMonthRequestsForMission.length >= 1) {
        alert("Você já solicitou esta missão este mês. Aguarde o próximo mês para solicitar novamente.");
        setRequestModal(null);
        return;
      }
    }

    setSubmitting(requestModal.id);
    const requestSector = (effectiveRole === "manager" || effectiveRole === "admin" || effectiveRole === "director") ? "Gerência" : mySector;
    const hasCustomLimit = MULTI_REQUEST_LIMITS[requestModal.title] !== undefined;
    const qty = hasCustomLimit ? Math.max(1, Math.min(requestQuantity, MULTI_REQUEST_LIMITS[requestModal.title])) : 1;
    const baseData = {
      employee_id: profile?.user_id || user.id,
      employee_name: profile?.full_name || user.full_name,
      sector: requestSector,
      mission_id: requestModal.id,
      mission_title: requestModal.title,
      mission_points: requestModal.points,
      status: "pendente",
      justification: justification || "",
      attachments: attachments,
    };
    const created = await Promise.all(
      Array.from({ length: qty }, () => base44.entities.MissionRequest.create(baseData))
    );
    setRequests(prev => [...created, ...prev]);
    setSubmitting(null);
    setRequestModal(null);
  };

  const handleApprove = async (request) => {
    // Bloqueia aprovação própria (exceto admin)
    if (!isAdmin && isSelf(request.employee_id)) return;
    setApproving(request.id);
    const empProfile = allProfiles.find(p => 
      (p.user_id && p.user_id === request.employee_id) || 
      p.id === request.employee_id ||
      (request.created_by && p.email === request.created_by)
    );
    const empName = empProfile?.full_name || request.employee_name;
    const empId = empProfile?.user_id || request.employee_id;
    await base44.entities.MissionRequest.update(request.id, { status: "aprovado", employee_name: empName, approved_by_name: profile?.full_name || user.full_name });
    await base44.functions.invoke('addPointTransaction', {
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
    setApproving(null);
    const freshReqs = await base44.entities.MissionRequest.list("-created_date", 2000);
    setRequests(freshReqs);
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    await base44.entities.MissionRequest.update(rejectModal.id, { status: "rejeitado", notes: rejectNote });
    setRequests(prev => prev.map(r => r.id === rejectModal.id ? { ...r, status: "rejeitado", notes: rejectNote } : r));
    setRejectModal(null);
    setRejectNote("");
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
          <h1 className="text-md font-bold text-white flex items-center gap-2 uppercase">
            <Target className="w-6 h-6 text-green-400" />
            Missões
          </h1>
          <p className="text-gray-400 text-xs mt-1">Solicite pontuação ao concluir uma tarefa</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-green-700 hover:bg-gray-800 text-green-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
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
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-900/40 border border-gray-700 rounded-xl p-1 w-full sm:w-fit">
        {[
          { id: "missoes", label: "Missões", onClick: () => { setTab("missoes"); setSelectedEmployeeFilter(""); } },
          { id: "minhas", label: "Minhas Sol.", onClick: () => { setTab("minhas"); setSelectedEmployeeFilter(""); } },
          ...(isGerenteViewer ? [{ id: "gerencia", label: "Gerência", badge: requests.filter(r => r.status === "pendente" && r.sector === "Gerência").length, onClick: () => setTab("gerencia") }] : []),
          ...(isManager ? [{ id: "solicitacoes", label: "Solicitações", badge: pendingCount, onClick: () => setTab("solicitacoes") }] : [])
        ].map(t => (
          <button
            key={t.id}
            onClick={t.onClick}
            className={`relative flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-bold transition-colors outline-none flex items-center justify-center gap-1.5 ${
              tab === t.id ? "text-gray-900" : "text-gray-400 hover:text-white"
            }`}
          >
            {tab === t.id && (
              <motion.div
                layoutId="activeMissionsTab"
                className="absolute inset-0 bg-green-500 rounded-lg shadow-sm"
                style={{ zIndex: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span style={{ position: "relative", zIndex: 1 }}>{t.label}</span>
            {t.badge > 0 && (
              <span style={{ position: "relative", zIndex: 1 }} className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold transition-colors ${
                tab === t.id ? "bg-red-400 text-gray-900" : "bg-red-500 text-white"
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
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
        <div className="space-y-4">
          {/* Sector filter (admin/manager only) */}
          {availableSectorFilters.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs font-medium shrink-0">Setor:</span>
              <select
                value={selectedSectorFilter}
                onChange={e => { setSelectedSectorFilter(e.target.value); setSelectedSubSector(""); }}
                className="bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              >
                <option value="">Todos os setores</option>
                {availableSectorFilters.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {(() => {
            let filtered = visibleMissions;
            if (selectedSectorFilter) filtered = filtered.filter(m => m.sector === selectedSectorFilter);
            if (selectedSubSector) filtered = filtered.filter(m => m.sub_sector === selectedSubSector);
            return filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma missão disponível para o seu setor ainda.</p>
            </div>
          ) : (
          <div className="space-y-4">
            {CATEGORIES.map(cat => {
              const catMissions = filtered.filter(m => (m.category || "Performance & Resultados") === cat.key);
              if (catMissions.length === 0) return null;
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
                      <span className="text-xs px-2 py-0.5 bg-black/20 rounded-full text-white/70">{catMissions.length}</span>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {catMissions.map(mission => {
              const req = myRequestMap[mission.id];
              const approved = req?.status === "aprovado";
              const pending = req?.status === "pendente";
              const rejected = req?.status === "rejeitado";
              const hasSub = !!mission.sub_sector;
              const customLimit = MULTI_REQUEST_LIMITS[mission.title];
              const blockedByFrequency = isRequestBlockedByFrequency(mission);
              const pendingOrApprovedCount = myRequests.filter(r => r.mission_id === mission.id && (r.status === "pendente" || r.status === "aprovado")).length;
              const blockedByMonthlyLimit = user?.email === MONTHLY_LIMIT_EMAIL && (() => {
                const now = new Date();
                return myRequests.filter(r => {
                  const d = new Date(r.created_date);
                  return r.mission_id === mission.id && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && r.status !== "rejeitado";
                }).length >= 1;
              })();
              const isBlocked = pending || blockedByFrequency || blockedByMonthlyLimit;
              const freqLabel = mission.frequency === "Diária" ? "hoje" : mission.frequency === "Semanal" ? "esta semana" : "este mês";

              return (
                <div key={mission.id} className={`group relative bg-gray-900 backdrop-blur-sm border rounded-2xl p-6 flex flex-col gap-4 overflow-hidden transition-all duration-300  hover:-translate-y-1 ${pending ? "border-yellow-700" : ""} ${rejected ? "border-red-700/50" : ""} ${approved ? "border-green-700" : "border-gray-800"}`}>
                  
                  <div className="flex items-start justify-between gap-4 z-10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start flex-wrap gap-2 mb-1.5">
                        <h3 className="text-gray-100 font-bold text-base tracking-tight leading-tight transition-colors">{mission.title}</h3>
                        {approved && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle className="w-3 h-3" /> Aprovado
                          </span>
                        )}
                        {pending && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
                            <Clock className="w-3 h-3" /> Em Análise
                          </span>
                        )}
                        {rejected && !blockedByFrequency && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full shrink-0">
                            <XCircle className="w-3 h-3" /> Rejeitado
                          </span>
                        )}
                        {blockedByFrequency && !pending && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full shrink-0">
                            <Clock className="w-3 h-3" />
                            {customLimit !== undefined ? `Limite de ${customLimit}x atingido` : `Já solicitado ${freqLabel}`}
                          </span>
                        )}
                      </div>
                      {mission.description && <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 transition-colors">{mission.description}</p>}
                    </div>
                    <div className="flex flex-col items-end shrink-0 pl-3">
                      <div className="relative">
                        <span className={`font-bold text-md  ${mission.points >= 0 ? "bg-gradient-to-br from-green-400 to-green-600 text-transparent bg-clip-text drop-shadow-sm" : "text-red-400"}`}>
                          {mission.points > 0 ? "+" : ""}{mission.points}
                        </span>
                      </div>
                      <span className="text-gray-500 font-semibold text-[8px] uppercase tracking-[0.1em]  drop-shadow-sm">pontos</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap mt-auto z-10">
                    <span className="text-[10px] px-2.5 py-1 bg-gray-900 border border-gray-700/50 shadow-sm text-gray-300 rounded-md font-semibold tracking-wide uppercase">{mission.sector}</span>
                    {hasSub && <span className="text-[10px] px-2.5 py-1 bg-blue-900/30 border border-blue-800/50 shadow-sm text-blue-300 rounded-md font-semibold tracking-wide uppercase">{mission.sub_sector}</span>}
                    {mission.frequency && (
                      <span className={`text-[10px] px-2.5 py-1 border shadow-sm rounded-md font-semibold tracking-wide uppercase ${
                        mission.frequency === "Diária" ? "bg-blue-900/30 border-blue-800/50 text-blue-300" :
                        mission.frequency === "Semanal" ? "bg-purple-900/30 border-purple-800/50 text-purple-300" :
                        "bg-amber-900/30 border-amber-800/50 text-amber-300"
                      }`}>{mission.frequency}</span>
                    )}
                  </div>
                  <div className="flex gap-2 z-10">
                      <button
                        onClick={() => !isBlocked && openRequestModal(mission)}
                        disabled={isBlocked}
                        className={`flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                          pending ? "bg-amber-900/20 text-amber-500/80 border border-amber-900/30 cursor-not-allowed" :
                          blockedByFrequency || blockedByMonthlyLimit ? "bg-purple-900/20 text-purple-400/80 border border-purple-900/30 cursor-not-allowed" :
                          (approved || rejected) ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:border-gray-600 shadow-none" :
                          "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-black active:scale-[0.98]"
                        }`}
                      >
                        {pending ? <><Clock className="w-3.5 h-3.5" /> Aguardando</> : blockedByMonthlyLimit ? <><Clock className="w-3.5 h-3.5" /> Limite mensal atingido</> : blockedByFrequency ? <><Clock className="w-3.5 h-3.5" /> {customLimit !== undefined ? `Limite de ${customLimit}x atingido` : `Já solicitado ${freqLabel}`}</> : (approved || rejected) ? (customLimit !== undefined ? <><Plus className="w-3.5 h-3.5" /> Solicitar ({pendingOrApprovedCount}/{customLimit})</> : <><RotateCcw className="w-3.5 h-3.5" /> Solicitar de novo</>) : submitting === mission.id ? "... " : (customLimit !== undefined && pendingOrApprovedCount > 0 ? <><Plus className="w-3.5 h-3.5" /> Solicitar ({pendingOrApprovedCount}/{customLimit})</> : "Solicitar")}
                      </button>
                    {isManager && (
                      <button onClick={() => handleDelete(mission.id)} className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all shadow-sm">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
          );
          })()}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Rejeitar Solicitação</h3>
            <p className="text-gray-400 text-sm mb-4">{rejectModal.mission_title} · <span className="text-red-400 font-bold">{rejectModal.employee_name}</span></p>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">Motivo da rejeição (opcional)</label>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Explique o motivo da rejeição..."
                rows={3}
                className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleReject}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Confirmar Rejeição
              </button>
              <button onClick={() => { setRejectModal(null); setRejectNote(""); }} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Solicitar Pontuação</h3>
            <p className="text-gray-400 text-sm mb-4">{requestModal.title} · <span className="text-green-400 font-bold">{requestModal.points > 0 ? "+" : ""}{requestModal.points} pts</span></p>
            <div className="space-y-4">
              {MULTI_REQUEST_LIMITS[requestModal.title] !== undefined && (() => {
                const limit = MULTI_REQUEST_LIMITS[requestModal.title];
                const already = myRequests.filter(r => r.mission_id === requestModal.id && (r.status === "pendente" || r.status === "aprovado")).length;
                const maxQty = limit - already;
                return (
                  <div>
                    <label className="text-gray-400 text-xs mb-1.5 block">Quantidade <span className="text-gray-600">(máx. {maxQty} restante{maxQty !== 1 ? "s" : ""})</span></label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setRequestQuantity(q => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg flex items-center justify-center transition-colors"
                      >−</button>
                      <span className="text-white font-bold text-xl w-8 text-center">{requestQuantity}</span>
                      <button
                        type="button"
                        onClick={() => setRequestQuantity(q => Math.min(maxQty, q + 1))}
                        className="w-9 h-9 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg flex items-center justify-center transition-colors"
                      >+</button>
                      <span className="text-gray-500 text-xs ml-1">× {requestModal.points} = <span className="text-green-400 font-bold">{requestQuantity * requestModal.points} pts</span></span>
                    </div>
                  </div>
                );
              })()}
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
                {submitting === requestModal.id ? "Enviando..." : requestQuantity > 1 ? `Enviar ${requestQuantity} Solicitações` : "Enviar Solicitação"}
              </button>
              <button onClick={() => setRequestModal(null)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Minhas Solicitações */}
      {tab === "minhas" && (
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
            <div key={r.id} className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight">{r.mission_title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{formatBRT(r.created_date, "date")}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`font-bold text-sm ${r.mission_points >= 0 ? "text-green-400" : "text-red-400"}`}>{r.mission_points > 0 ? "+" : ""}{r.mission_points} pts</span>
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.status === "aprovado" ? "bg-green-900/50 text-green-300" :
                    r.status === "rejeitado" ? "bg-red-900/50 text-red-300" :
                    "bg-amber-900/50 text-amber-300"
                  }`}>
                    {r.status === "aprovado" ? <><CheckCircle className="w-3 h-3" /> Aprovado</> : r.status === "rejeitado" ? <><XCircle className="w-3 h-3" /> Rejeitado</> : <><Clock className="w-3 h-3" /> Pendente</>}
                  </span>
                  {r.status === "aprovado" && r.approved_by_name && (
                    <p className="text-[10px] text-gray-500 text-right">por {r.approved_by_name}</p>
                  )}
                </div>
              </div>
              {r.justification && (
                <p className="flex items-start gap-1.5 text-gray-300 text-xs bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                  <FaComment className="text-gray-500 shrink-0 mt-0.5" /> {r.justification}
                </p>
              )}
              {r.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {r.attachments.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-lg overflow-hidden border border-gray-600 block hover:border-green-500 transition-colors">
                      <img src={url} alt="anexo" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
              {r.status === "rejeitado" && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                  {r.notes ? `Motivo: ${r.notes}` : "Nenhum motivo informado."}
                </p>
              )}
            </div>
            ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Solicitações (manager) */}
      {tab === "gerencia" && isGerenteViewer && (
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Solicitações da Gerência — Pendentes
            </h3>
            {(() => {
              const feiraFCManagerIds = new Set(
                allProfiles.filter(p => p.sector === "Feira FC" && (p.role === "manager" || p.role === "director")).map(p => p.user_id || p.id)
              );
              const gerentePending = requests.filter(r => r.status === "pendente" && r.sector === "Gerência" && !feiraFCManagerIds.has(r.employee_id));
              
              const peopleInGerencia = allProfiles.filter(p => p.sector === "Gerência");

              return (
                <div className="space-y-4">
                  {peopleInGerencia.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <Search className="w-4 h-4 text-gray-500" />
                      <select
                        value={selectedEmployeeFilter}
                        onChange={e => setSelectedEmployeeFilter(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-green-500"
                      >
                        <option value="">Filtrar por pessoa (Todos)</option>
                        {peopleInGerencia.map(p => (
                          <option key={p.id} value={p.user_id || p.id}>{p.full_name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(() => {
                    const filtered = gerentePending.filter(r => !selectedEmployeeFilter || r.employee_id === selectedEmployeeFilter);
                    if (filtered.length === 0) return <p className="text-gray-500 text-sm py-4 italic">Nenhuma solicitação pendente para este filtro.</p>;
                    return (
                      <div className="space-y-3">
                        {filtered.map(r => (
                          <div key={r.id} className="p-4 bg-gray-900/50 rounded-xl space-y-3 border border-gray-700/50">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold text-sm leading-tight">{r.mission_title}</p>
                                <p className="text-gray-400 text-xs mt-0.5">{r.employee_name}</p>
                                <p className="text-gray-500 text-xs">{r.sector} · {formatBRT(r.created_date, "date")}</p>
                              </div>
                              <span className="text-green-400 font-bold text-sm shrink-0">{r.mission_points > 0 ? "+" : ""}{r.mission_points} pts</span>
                            </div>
                            {r.justification && (
                              <p className="flex items-start gap-1.5 text-gray-300 text-xs bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                                <FaComment className="text-gray-500 shrink-0 mt-0.5" /> {r.justification}
                              </p>
                            )}
                            {r.attachments?.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {r.attachments.map((url, idx) => (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-lg overflow-hidden border border-gray-600 block hover:border-green-500 transition-colors">
                                    <img src={url} alt="anexo" className="w-full h-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleApprove(r)}
                                disabled={approving === r.id}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                {approving === r.id ? "Aprovando..." : "Aprovar"}
                              </button>
                              <button
                                onClick={() => { setRejectModal(r); setRejectNote(""); }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 rounded-xl text-xs font-semibold transition-colors border border-red-700/40"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Rejeitar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
          {(() => {
            const feiraFCManagerIds2 = new Set(
              allProfiles.filter(p => p.sector === "Feira FC" && (p.role === "manager" || p.role === "director")).map(p => p.user_id || p.id)
            );
            const gerenteHistory = requests.filter(r => r.status !== "pendente" && r.sector === "Gerência" && !feiraFCManagerIds2.has(r.employee_id) && (!selectedEmployeeFilter || r.employee_id === selectedEmployeeFilter));
            if (gerenteHistory.length === 0) return null;
            return (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">Histórico da Gerência</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {gerenteHistory.map(r => (
                    <div key={r.id} className="p-3 bg-gray-900/50 rounded-xl space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{r.mission_title}</p>
                          <p className="text-gray-500 text-xs">{r.employee_name} · {formatBRT(r.created_date, "date")}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${r.status === "aprovado" ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"}`}>
                            {r.status === "aprovado" ? <><CheckCircle className="w-3 h-3" /> Aprovado</> : <><XCircle className="w-3 h-3" /> Rejeitado</>}
                          </span>
                          {r.status === "aprovado" && r.approved_by_name && (
                            <p className="text-xs text-gray-500">por {r.approved_by_name}</p>
                          )}
                          {r.status === "rejeitado" && r.notes && <p className="mt-1 text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-2 py-1 text-right">Motivo: {r.notes}</p>}
                        </div>
                      </div>
                      {r.justification && (
                        <p className="flex items-center gap-1.5 text-gray-300 text-xs bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                          <FaComment className="text-gray-500 shrink-0" /> {r.justification}
                        </p>
                      )}
                      {r.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {r.attachments.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-lg overflow-hidden border border-gray-600 block hover:border-green-500 transition-colors">
                              <img src={url} alt="anexo" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tab === "solicitacoes" && isManager && (
        <div className="space-y-4">
          {/* Pendentes */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Pendentes de Aprovação
              {pendingCount > 0 && <span className="px-2 py-0.5 bg-amber-900/50 text-amber-300 text-xs rounded-full">{pendingCount}</span>}
            </h3>
            
            {(() => {
              const peopleInAuthority = allProfiles.filter(p => {
                if (p.user_id === user?.id || p.id === profile?.id) return false;
                if (isAdmin) return true;
                if (effectiveRole === "supervisor") return allMySectors.includes(p.sector) && p.role !== "supervisor" && p.role !== "manager" && p.role !== "admin";
                if (effectiveRole === "manager") return allMySectors.includes(p.sector) && p.role !== "manager" && p.role !== "admin" && p.role !== "director";
                return allMySectors.includes(p.sector);
              });

              const filteredPending = pendingRequests.filter(r => !selectedEmployeeFilter || r.employee_id === selectedEmployeeFilter);

              return (
                <div className="space-y-4">
                  {peopleInAuthority.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <Search className="w-4 h-4 text-gray-500" />
                      <select
                        value={selectedEmployeeFilter}
                        onChange={e => setSelectedEmployeeFilter(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-green-500"
                      >
                       <option value="">Filtrar por pessoa (Todos)</option>
                        {peopleInAuthority.map(p => (
                          <option key={p.id} value={p.user_id || p.id}>{p.full_name} · {p.sector}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {filteredPending.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">Nenhuma solicitação pendente{selectedEmployeeFilter ? " para esta pessoa" : ""}.</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredPending.map(r => (
                        <div key={r.id} className="p-4 bg-gray-900/50 rounded-xl space-y-3 border border-gray-700/50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-sm leading-tight">{r.mission_title}</p>
                              <p className="text-gray-400 text-xs mt-0.5">{r.employee_name}</p>
                              <p className="text-gray-500 text-xs">{r.sector} · {formatBRT(r.created_date, "date")}</p>
                            </div>
                            <span className="text-green-400 font-bold text-sm shrink-0">{r.mission_points > 0 ? "+" : ""}{r.mission_points} pts</span>
                          </div>
                          {r.justification && (
                            <p className="flex items-start gap-1.5 text-gray-300 text-xs bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                              <FaComment className="text-gray-500 shrink-0 mt-0.5" /> {r.justification}
                            </p>
                          )}
                          {r.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {r.attachments.map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-lg overflow-hidden border border-gray-600 block hover:border-green-500 transition-colors">
                                  <img src={url} alt="anexo" className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleApprove(r)}
                              disabled={approving === r.id}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              {approving === r.id ? "Aprovando..." : "Aprovar"}
                            </button>
                            <button
                              onClick={() => { setRejectModal(r); setRejectNote(""); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 rounded-xl text-xs font-semibold transition-colors border border-red-700/40"
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
              );
            })()}
          </div>

          {/* Histórico */}
          {(() => {
            const history = requests.filter(r => {
              if (r.status === "pendente") return false;
              if (isAdmin) return true;
              const emp = allProfiles.find(p => 
                (p.user_id && p.user_id === r.employee_id) || 
                p.id === r.employee_id ||
                (r.created_by && p.email === r.created_by)
              );
              const effectiveSector = (r.sector !== "Supervisor" ? r.sector : null) || emp?.sector;
              if (isDirector) {
                // Para gerentes, o sector da solicitação é "Gerência", mas o perfil tem o setor real
                if (emp?.role === "manager" || emp?.role === "director") {
                  return allMySectors.includes(emp.sector);
                }
                return allMySectors.includes(effectiveSector);
              }
              if (effectiveRole === "supervisor") {
                if (emp?.role === "supervisor" || emp?.role === "manager" || emp?.role === "admin") return false;
                return allMySectors.includes(effectiveSector);
              }
              // Gerente: vê colaboradores e supervisores do seu setor
              return allMySectors.includes(effectiveSector);
            }).filter(r => !selectedEmployeeFilter || r.employee_id === selectedEmployeeFilter);
            if (history.length === 0) return null;
            return (
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">Histórico</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map(r => (
                    <div key={r.id} className="p-3 bg-gray-900/50 rounded-xl space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{r.mission_title}</p>
                          <p className="text-gray-500 text-xs">{r.employee_name} · {formatBRT(r.created_date, "date")}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${r.status === "aprovado" ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"}`}>
                            {r.status === "aprovado" ? <><CheckCircle className="w-3 h-3" /> Aprovado</> : <><XCircle className="w-3 h-3" /> Rejeitado</>}
                          </span>
                          {r.status === "aprovado" && r.approved_by_name && (
                            <p className="text-xs text-gray-500">por {r.approved_by_name}</p>
                          )}
                          {r.status === "rejeitado" && r.notes && <p className="mt-1 text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-2 py-1 text-right">Motivo: {r.notes}</p>}
                        </div>
                      </div>
                      {r.justification && (
                        <p className="flex items-center gap-1.5 text-gray-300 text-xs bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                          <FaComment className="text-gray-500 shrink-0" /> {r.justification}
                        </p>
                      )}
                      {r.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {r.attachments.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-lg overflow-hidden border border-gray-600 block hover:border-green-500 transition-colors">
                              <img src={url} alt="anexo" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
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