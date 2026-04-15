import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Plus, Trash2, Edit2, Check, X, Camera } from "lucide-react";

const SECTORS = ["Social Media", "Audiovisual", "Tráfego", "Líder de Projeto", "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Affiliates", "Administrativo", "Gerência", "Saúde e Bem Estar", "Serviços Gerais", "Feira FC", "TI", "IA/Automação"];
const ROLES = [
  { value: "user", label: "Colaborador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "manager", label: "Gerente" },
  { value: "director", label: "Diretor" },
  { value: "admin", label: "Admin" },
];

export default function Employees() {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", sector: "", role: "user", user_id: "", photo_url: "", extra_sectors: [], include_in_sector_ranking: true });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filterSector, setFilterSector] = useState("Todos");

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const u = await base44.auth.me();
      setUser(u);
      const emps = await base44.entities.EmployeeProfile.list(null, 1000);
      setEmployees(emps);
    } catch (e) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isAdmin = user?.role === "admin";

  const handleCreate = async () => {
    if (!form.full_name || !form.sector) return;
    const emp = await base44.entities.EmployeeProfile.create({
      ...form,
      is_active: true,
    });
    setEmployees(prev => [...prev, emp]);
    setForm({ full_name: "", email: "", sector: "", role: "user", user_id: "", photo_url: "" });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.EmployeeProfile.delete(id);
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const handlePhotoUpload = async (file, target, id) => {
    if (!file) return;
    setUploadingPhoto(id || "new");
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (target === "form") {
      setForm(p => ({ ...p, photo_url: file_url }));
    } else {
      setEditForm(p => ({ ...p, photo_url: file_url }));
    }
    setUploadingPhoto(false);
  };

  const startEdit = (emp) => {
    setEditing(emp.id);
    setEditForm({ full_name: emp.full_name, email: emp.email || "", user_id: emp.user_id || "", sector: emp.sector, role: emp.role, photo_url: emp.photo_url || "", extra_sectors: emp.extra_sectors || [], include_in_sector_ranking: emp.include_in_sector_ranking !== false });
  };

  const toggleExtraSector = (sector, target) => {
    if (target === "form") {
      setForm(p => ({
        ...p,
        extra_sectors: p.extra_sectors.includes(sector)
          ? p.extra_sectors.filter(s => s !== sector)
          : [...p.extra_sectors, sector]
      }));
    } else {
      setEditForm(p => ({
        ...p,
        extra_sectors: p.extra_sectors.includes(sector)
          ? p.extra_sectors.filter(s => s !== sector)
          : [...p.extra_sectors, sector]
      }));
    }
  };

  const saveEdit = async (id) => {
    await base44.entities.EmployeeProfile.update(id, editForm);
    // Tenta sincronizar o role do usuário real na plataforma
    const userId = editForm.user_id;
    const userEmail = editForm.email;
    if ((userId || userEmail) && editForm.role) {
      try {
        const allUsers = await base44.entities.User.list();
        const linkedUser = allUsers.find(u =>
          (userId && u.id === userId) ||
          (userEmail && u.email === userEmail)
        );
        if (linkedUser) {
          await base44.entities.User.update(linkedUser.id, { role: editForm.role });
        }
      } catch (e) {
        // Sem permissão para listar/atualizar usuários — ignora silenciosamente
      }
    }
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...editForm } : e));
    setEditing(null);
  };

  const filtered = employees
    .filter(e => filterSector === "Todos" || e.sector === filterSector)
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (loadError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-gray-400 text-sm">Erro ao carregar colaboradores. Verifique sua conexão.</p>
      <button onClick={load} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors">Tentar novamente</button>
    </div>
  );

  if (!isAdmin) return (
    <div className="text-center py-16 text-gray-500">
      <p>Acesso restrito a administradores.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-md font-bold text-white flex items-center gap-2 uppercase">
            <Users className="w-6 h-6 text-green-400" />
            Colaboradores
          </h1>
          <p className="text-gray-400 text-xs mt-1">Gerencie todos os colaboradores</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Colaborador
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">Cadastrar Colaborador</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Photo upload */}
            <div className="col-span-2 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-600 overflow-hidden flex items-center justify-center shrink-0">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="foto" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <label className="cursor-pointer px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
                {uploadingPhoto === "new" ? "Enviando..." : "Carregar foto"}
                <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e.target.files[0], "form", null)} />
              </label>
            </div>
            <input
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Nome completo *"
              className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
            <input
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
            <input
              value={form.user_id}
              onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))}
              placeholder="User ID (para vincular conta)"
              className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
            <select
              value={form.sector}
              onChange={e => setForm(p => ({ ...p, sector: e.target.value }))}
              className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            >
              <option value="">Setor *</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {form.role === "supervisor" && (
              <div className="col-span-2 flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl border border-gray-700">
                <input
                  type="checkbox"
                  id="include_sector_new"
                  checked={form.include_in_sector_ranking}
                  onChange={e => setForm(p => ({ ...p, include_in_sector_ranking: e.target.checked }))}
                  className="w-4 h-4 accent-green-500 cursor-pointer"
                />
                <label htmlFor="include_sector_new" className="text-gray-300 text-sm cursor-pointer">
                  Participar do ranking do setor cadastrado
                </label>
              </div>
            )}
            <div className="col-span-2">
              <label className="text-gray-400 text-xs mb-2 block">Setores extras que gerencia (opcional)</label>
              <div className="flex flex-wrap gap-2">
                {SECTORS.filter(s => s !== form.sector).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleExtraSector(s, "form")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                      (form.extra_sectors || []).includes(s)
                        ? "bg-green-500 border-green-500 text-white"
                        : "bg-gray-900 border-gray-600 text-gray-400 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors">
              Cadastrar
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {["Todos", ...SECTORS].map(s => (
          <button
            key={s}
            onClick={() => setFilterSector(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterSector === s ? "bg-green-500 text-black" : "bg-gray-800 text-gray-400 hover:text-white border border-gray-700"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 text-xs font-medium px-5 py-3 w-12"></th>
                <th className="text-left text-gray-400 text-xs font-medium px-5 py-3">Nome</th>
                <th className="text-left text-gray-400 text-xs font-medium px-5 py-3">Setor</th>
                <th className="text-left text-gray-400 text-xs font-medium px-5 py-3">Função</th>
                <th className="text-right text-gray-400 text-xs font-medium px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-10 text-sm">Nenhum colaborador encontrado.</td>
                </tr>
              ) : (
                filtered.map(emp => (
                  <tr key={emp.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-3">
                      {editing === emp.id ? (
                        <label className="cursor-pointer block w-10 h-10 rounded-full bg-gray-700 overflow-hidden relative group">
                          {editForm.photo_url ? (
                            <img src={editForm.photo_url} alt="foto" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-4 h-4 text-gray-500 absolute inset-0 m-auto" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Camera className="w-3 h-3 text-white" />
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e.target.files[0], "edit", emp.id)} />
                        </label>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                          {emp.photo_url ? (
                            <img src={emp.photo_url} alt={emp.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400 text-sm font-bold">{emp.full_name?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                     {editing === emp.id ? (
                       <div className="space-y-1.5">
                         <input
                           value={editForm.full_name}
                           onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                           placeholder="Nome completo"
                           className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-2 py-1 text-sm"
                         />
                         <input
                           value={editForm.email}
                           onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                           placeholder="Email"
                           className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-2 py-1 text-sm"
                         />
                         <input
                           value={editForm.user_id}
                           onChange={e => setEditForm(p => ({ ...p, user_id: e.target.value }))}
                           placeholder="User ID (vínculo de conta)"
                           className="w-full bg-gray-900 border border-gray-600 text-gray-400 rounded-lg px-2 py-1 text-xs"
                         />
                       </div>
                     ) : (
                       <div>
                         <span className="text-white text-sm font-medium">{emp.full_name}</span>
                         {emp.email && <p className="text-gray-500 text-xs mt-0.5">{emp.email}</p>}
                       </div>
                     )}
                    </td>
                    <td className="px-5 py-3">
                      {editing === emp.id ? (
                        <div className="space-y-2">
                          <select
                            value={editForm.sector}
                            onChange={e => setEditForm(p => ({ ...p, sector: e.target.value }))}
                            className="bg-gray-900 border border-gray-600 text-white rounded-lg px-2 py-1 text-sm w-full"
                          >
                            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Setores extras:</p>
                            <div className="flex flex-wrap gap-1">
                              {SECTORS.filter(s => s !== editForm.sector).map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => toggleExtraSector(s, "edit")}
                                  className={`px-2 py-0.5 rounded text-xs transition-all border ${
                                    (editForm.extra_sectors || []).includes(s)
                                      ? "bg-green-500 border-green-500 text-white"
                                      : "bg-gray-800 border-gray-600 text-gray-400 hover:text-white"
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-gray-300 text-sm">{emp.sector}</span>
                          {emp.extra_sectors?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {emp.extra_sectors.map(s => (
                                <span key={s} className="text-xs px-1.5 py-0.5 bg-blue-900/40 text-blue-300 rounded">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {editing === emp.id ? (
                        <div className="space-y-2">
                          <select
                            value={editForm.role}
                            onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                            className="bg-gray-900 border border-gray-600 text-white rounded-lg px-2 py-1 text-sm"
                          >
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          {editForm.role === "supervisor" && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editForm.include_in_sector_ranking !== false}
                                onChange={e => setEditForm(p => ({ ...p, include_in_sector_ranking: e.target.checked }))}
                                className="w-3.5 h-3.5 accent-green-500"
                              />
                              <span className="text-gray-400 text-xs">Participar do ranking do setor</span>
                            </label>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                            emp.role === "admin" ? "bg-red-900/50 text-red-300" :
                            emp.role === "director" ? "bg-yellow-900/50 text-yellow-300" :
                            emp.role === "manager" ? "bg-blue-900/50 text-blue-300" :
                            emp.role === "supervisor" ? "bg-purple-900/50 text-purple-300" :
                            "bg-gray-700 text-gray-300"
                          }`}>
                            {ROLES.find(r => r.value === emp.role)?.label || "Colaborador"}
                          </span>
                          {emp.role === "supervisor" && (
                            <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${emp.include_in_sector_ranking !== false ? "bg-green-900/40 text-green-400" : "bg-gray-700 text-gray-500"}`}>
                              {emp.include_in_sector_ranking !== false ? "✓ no ranking do setor" : "✗ fora do setor"}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {editing === emp.id ? (
                          <>
                            <button onClick={() => saveEdit(emp.id)} className="p-1.5 text-green-400 hover:bg-green-900/20 rounded-lg"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:bg-gray-700 rounded-lg"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(emp)} className="p-1.5 text-blue-400 hover:bg-blue-900/20 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                            {user?.email === "kevinathy25@gmail.com" && (
                              <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}