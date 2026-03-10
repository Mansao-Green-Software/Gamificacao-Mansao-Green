import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Plus, Trash2, Edit2, Check, X, Camera } from "lucide-react";

const SECTORS = ["Social Media", "Audiovisual", "Tráfego", "Líder de Projeto", "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro"];
const ROLES = [
  { value: "user", label: "Colaborador" },
  { value: "manager", label: "Gerente" },
  { value: "admin", label: "Admin" },
];

export default function Employees() {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", sector: "", role: "user", user_id: "", photo_url: "" });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterSector, setFilterSector] = useState("Todos");

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const emps = await base44.entities.EmployeeProfile.list();
      setEmployees(emps);
      setLoading(false);
    };
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
    setEditForm({ full_name: emp.full_name, sector: emp.sector, role: emp.role, photo_url: emp.photo_url || "" });
  };

  const saveEdit = async (id) => {
    const updated = await base44.entities.EmployeeProfile.update(id, editForm);
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...editForm } : e));
    setEditing(null);
  };

  const filtered = employees.filter(e => filterSector === "Todos" || e.sector === filterSector);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-green-400" />
            Colaboradores
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie todos os colaboradores</p>
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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterSector === s ? "bg-green-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white border border-gray-700"}`}
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
                <th className="text-left text-gray-400 text-xs font-medium px-5 py-3">Nome</th>
                <th className="text-left text-gray-400 text-xs font-medium px-5 py-3">Setor</th>
                <th className="text-left text-gray-400 text-xs font-medium px-5 py-3">Função</th>
                <th className="text-right text-gray-400 text-xs font-medium px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-10 text-sm">Nenhum colaborador encontrado.</td>
                </tr>
              ) : (
                filtered.map(emp => (
                  <tr key={emp.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                    <td className="px-5 py-3">
                      {editing === emp.id ? (
                        <input
                          value={editForm.full_name}
                          onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                          className="bg-gray-900 border border-gray-600 text-white rounded-lg px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="text-white text-sm font-medium">{emp.full_name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {editing === emp.id ? (
                        <select
                          value={editForm.sector}
                          onChange={e => setEditForm(p => ({ ...p, sector: e.target.value }))}
                          className="bg-gray-900 border border-gray-600 text-white rounded-lg px-2 py-1 text-sm"
                        >
                          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className="text-gray-300 text-sm">{emp.sector}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {editing === emp.id ? (
                        <select
                          value={editForm.role}
                          onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                          className="bg-gray-900 border border-gray-600 text-white rounded-lg px-2 py-1 text-sm"
                        >
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          emp.role === "admin" ? "bg-red-900/50 text-red-300" :
                          emp.role === "manager" ? "bg-blue-900/50 text-blue-300" :
                          "bg-gray-700 text-gray-300"
                        }`}>
                          {ROLES.find(r => r.value === emp.role)?.label || "Colaborador"}
                        </span>
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
                            <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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