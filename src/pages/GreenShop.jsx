import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShoppingBag, Plus, Trash2, Star, CheckCircle, Clock, Package, Tag, Camera, Edit2 } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = ["Experiência", "Produto", "Benefício", "Vale-presente", "Outros"];

const CATEGORY_COLORS = {
  "Experiência": "bg-purple-900/50 text-purple-300",
  "Produto": "bg-blue-900/50 text-blue-300",
  "Benefício": "bg-green-900/50 text-green-300",
  "Vale-presente": "bg-amber-900/50 text-amber-300",
  "Outros": "bg-gray-700 text-gray-300",
};

const STATUS_CONFIG = {
  pendente: { label: "Pendente", color: "bg-amber-900/50 text-amber-300", icon: Clock },
  aprovado: { label: "Aprovado", color: "bg-blue-900/50 text-blue-300", icon: CheckCircle },
  entregue: { label: "Entregue", color: "bg-green-900/50 text-green-300", icon: Package },
  cancelado: { label: "Cancelado", color: "bg-red-900/50 text-red-300", icon: Trash2 },
};

export default function GreenShop() {
  const [user, setUser] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState("loja");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", points_cost: "", stock: "", category: "Outros", image_url: "" });
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [redeeming, setRedeeming] = useState(null);
  const [confirmReward, setConfirmReward] = useState(null);
  const [filterCategory, setFilterCategory] = useState("Todos");
  const [editingReward, setEditingReward] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(false);

  const load = async () => {
    setError(false);
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      const [rws, reds, allTxs, profiles] = await Promise.all([
        base44.entities.Reward.list(),
        base44.entities.RewardRedemption.list("-created_date", 200),
        base44.entities.PointTransaction.list("-created_date", 5000),
        base44.entities.EmployeeProfile.list(),
      ]);
      const found = profiles.find(p => (p.user_id && p.user_id === u.id) || p.email === u.email);
      setProfile(found);
      const txs = allTxs.filter(t =>
        t.employee_id === u.id ||
        (found && (t.employee_id === found.id || t.employee_id === found.user_id)) ||
        t.employee_name === (found?.full_name || u.full_name)
      );
      setRewards(rws);
      setRedemptions(reds);
      setTransactions(txs);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const effectiveRole = profile?.role || user?.role;
  const isAdmin = effectiveRole === "admin";
  const isManager = effectiveRole === "manager" || effectiveRole === "supervisor" || isAdmin;
  const canEditRewards = isAdmin;

  const myPoints = transactions.reduce((s, t) => s + (t.points || 0), 0);
  const myRedemptions = redemptions.filter(r =>
    r.employee_id === user?.id ||
    (profile && (r.employee_id === profile.id || r.employee_id === profile.user_id))
  );
  // availablePoints já é calculado pelas transações (que incluem débitos negativos de resgates)
  const availablePoints = myPoints;
  const spentPoints = myRedemptions.filter(r => r.status !== "cancelado").reduce((s, r) => s + (r.points_spent || 0), 0);

  const activeRewards = rewards.filter(r => r.is_active);
  const filteredRewards = filterCategory === "Todos" ? activeRewards : activeRewards.filter(r => r.category === filterCategory);

  const handleCreate = async () => {
    if (!form.title || !form.points_cost) return;
    const reward = await base44.entities.Reward.create({
      ...form,
      points_cost: parseInt(form.points_cost),
      stock: form.stock ? parseInt(form.stock) : null,
      is_active: true,
    });
    setRewards(prev => [...prev, reward]);
    setForm({ title: "", description: "", points_cost: "", stock: "", category: "Outros", image_url: "" });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Reward.update(id, { is_active: false });
    setRewards(prev => prev.map(r => r.id === id ? { ...r, is_active: false } : r));
  };

  const handleRedeem = async (reward) => {
    if (availablePoints < reward.points_cost) return;
    setRedeeming(reward.id);
    const sector = profile?.sector || user.sector;
    const redemption = await base44.entities.RewardRedemption.create({
      employee_id: user.id,
      employee_name: user.full_name,
      sector,
      reward_id: reward.id,
      reward_title: reward.title,
      points_spent: reward.points_cost,
      status: "pendente",
    });
    // Debitar pontos
    await base44.entities.PointTransaction.create({
      employee_id: user.id,
      employee_name: user.full_name,
      sector,
      points: -reward.points_cost,
      type: "manual",
      description: `Resgate: ${reward.title}`,
      awarded_by_name: "Green Shop",
    });
    setRedemptions(prev => [redemption, ...prev]);
    setTransactions(prev => [...prev, { points: -reward.points_cost }]);
    setRedeeming(null);
    setConfirmReward(null);
  };

  const handleEditReward = (reward) => {
    setEditingReward(reward.id);
    setEditForm({ title: reward.title, description: reward.description || "", points_cost: String(reward.points_cost), stock: reward.stock != null ? String(reward.stock) : "", category: reward.category || "Outros", image_url: reward.image_url || "" });
  };

  const handleSaveEditReward = async () => {
    await base44.entities.Reward.update(editingReward, {
      ...editForm,
      points_cost: parseInt(editForm.points_cost),
      stock: editForm.stock ? parseInt(editForm.stock) : null,
    });
    setRewards(prev => prev.map(r => r.id === editingReward ? { ...r, ...editForm, points_cost: parseInt(editForm.points_cost), stock: editForm.stock ? parseInt(editForm.stock) : null } : r));
    setEditingReward(null);
  };

  const handleUpdateStatus = async (redemptionId, newStatus) => {
    await base44.entities.RewardRedemption.update(redemptionId, { status: newStatus });
    setRedemptions(prev => prev.map(r => r.id === redemptionId ? { ...r, status: newStatus } : r));
  };

  const handleDeleteRedemption = async (redemptionId) => {
    await base44.entities.RewardRedemption.delete(redemptionId);
    setRedemptions(prev => prev.filter(r => r.id !== redemptionId));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-gray-400 text-sm">Erro ao carregar a loja. Verifique sua conexão.</p>
      <button onClick={load} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors">Tentar novamente</button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-md font-bold text-white flex items-center gap-2 uppercase">
            <ShoppingBag className="w-6 h-6 text-green-400" />
            Green Shop
          </h1>
          <p className="text-gray-400 text-xs mt-1">Troque seus pontos por prêmios incríveis</p>
        </div>
        {canEditRewards && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-gray-900 rounded-xl font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Prêmio
          </button>
        )}
      </div>

      {/* Points banner */}
      <div className="bg-gradient-to-br from-teal-900/60 via-gray-800/60 to-teal-900/60 border-2 border-green-700/50 rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-medium">Seus pontos disponíveis</p>
          <p className="text-4xl font-bold text-white mt-1">{availablePoints.toLocaleString()} <span className="text-green-400 text-lg">pts</span></p>
          <p className="text-gray-400 text-xs mt-1">{myPoints.toLocaleString()} ganhos · {spentPoints.toLocaleString()} gastos</p>
        </div>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center">
          <Star className="w-8 h-8 text-green-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900/40 border border-gray-700 rounded-xl p-1 w-fit relative z-0">
        {[
          { id: "loja", label: "Loja" },
          { id: "resgates", label: "Meus Resgates", badge: myRedemptions.length },
          ...(isManager ? [{ id: "admin", label: "Gerenciar" }] : [])
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-2 rounded-lg text-sm font-bold transition-colors outline-none flex items-center gap-1.5 ${
              tab === t.id ? "text-gray-900" : "text-gray-400 hover:text-white"
            }`}
          >
            {tab === t.id && (
              <motion.div
                layoutId="activeShopTab"
                className="absolute inset-0 bg-green-500 rounded-lg -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 block">{t.label}</span>
            {t.badge > 0 && (
              <span className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold transition-colors ${
                tab === t.id ? "bg-gray-900 text-green-400" : "bg-gray-700 text-gray-300"
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && canEditRewards && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">Novo Prêmio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Nome do prêmio *" className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição" rows={2} className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
            <input type="number" value={form.points_cost} onChange={e => setForm(p => ({ ...p, points_cost: e.target.value }))} placeholder="Custo em pontos *" className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            <input type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} placeholder="Estoque (deixe vazio = ilimitado)" className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="col-span-2 flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-gray-700 border border-gray-600 overflow-hidden flex items-center justify-center shrink-0">
                {form.image_url ? (
                  <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <label className="cursor-pointer px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
                {uploadingPhoto ? "Enviando..." : "Carregar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setUploadingPhoto(true);
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    setForm(p => ({ ...p, image_url: file_url }));
                    setUploadingPhoto(false);
                  }}
                />
              </label>
              {form.image_url && (
                <button onClick={() => setForm(p => ({ ...p, image_url: "" }))} className="text-red-400 text-xs hover:underline">Remover</button>
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreate} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors">Criar Prêmio</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {/* LOJA */}
      {tab === "loja" && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {["Todos", ...CATEGORIES].map(c => (
              <button key={c} onClick={() => setFilterCategory(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterCategory === c ? "bg-green-500 text-gray-900" : "bg-gray-900/40 text-gray-400 hover:text-white border border-gray-700"}`}>{c}</button>
            ))}
          </div>

          {filteredRewards.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum prêmio disponível ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRewards.map(reward => {
                const canAfford = availablePoints >= reward.points_cost;
                const outOfStock = reward.stock !== null && reward.stock !== undefined && reward.stock <= 0;
               
                return (
                  <div key={reward.id} className={`group relative bg-gray-900/40 backdrop-blur-md border rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${outOfStock ? "opacity-60 border-gray-800 grayscale-[0.3]" : canAfford ? "border-gray-700/50 hover:border-green-500/50 hover:-translate-y-1 hover:shadow-2xl hover:shadow-green-900/20" : "border-gray-800 opacity-80"}`}>
                    
                    {/* Imagem do Produto */}
                    <div className="w-full aspect-[4/3] overflow-hidden relative border-b border-gray-800">
                      {reward.image_url ? (
                        <img src={reward.image_url} alt={reward.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center transition-transform duration-700 group-hover:scale-110">
                          <ShoppingBag className="w-16 h-16 text-gray-700" />
                        </div>
                      )}
                      
                      {/* Fade para mesclar a imagem com o card */}
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80"></div>
                      
                      {/* Categoria */}
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-2 text-right">
                        <span className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md border border-white/10 ${CATEGORY_COLORS[reward.category]}`}>
                          {reward.category}
                        </span>
                      </div>
                    </div>
                    
                    {/* Conteúdo do Card */}
                    <div className="p-5 flex flex-col flex-1 gap-4 relative z-10 bg-gradient-to-b from-gray-900/50 to-gray-900/10">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white leading-tight group-hover:text-green-400 transition-colors drop-shadow-sm">{reward.title}</h3>
                        {reward.description && <p className="text-gray-400 text-sm mt-2 line-clamp-2 leading-relaxed">{reward.description}</p>}
                      </div>
                      
                      <div className="flex items-center justify-between py-3 border-y border-gray-800">
                        <div className="flex items-center gap-2 ">
                          <div className="w-8 h-8 rounded-full  flex items-center justify-center border border-gray-800 ">
                            <Star className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="flex items-baseline">
                            <span className="text-green-400 font-bold text-xl leading-none">{reward.points_cost}</span>
                            <span className="text-green-500/60 text-xs uppercase font-bold tracking-wider ml-1">pts</span>
                          </div>
                        </div>
                        {reward.stock !== null && reward.stock !== undefined && (
                          <div className="text-right">
                            <span className="block text-[10px] uppercase font-bold tracking-wider text-gray-500">Estoque</span>
                            <span className="text-gray-300 font-medium text-sm">{reward.stock} un.</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setConfirmReward(reward)}
                        disabled={!canAfford || outOfStock || redeeming === reward.id}
                        className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                          outOfStock ? "bg-gray-800 text-gray-500 cursor-not-allowed border-2 border-gray-700" :
                          canAfford ? "bg-green-500 hover:bg-green-400 text-gray-900 shadow-xl shadow-green-500/20" :
                          "bg-gray-800 text-gray-500 cursor-not-allowed border-2 border-gray-700"
                        }`}
                      >
                        {outOfStock ? "Esgotado" : !canAfford ? "Pontos insuficientes" : "Resgatar Prêmio"}
                      </button>

                      {canEditRewards && (
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => handleEditReward(reward)} className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-500 hover:text-white transition-colors border border-blue-900/30 flex items-center justify-center gap-1.5">
                            <Edit2 className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button onClick={() => handleDelete(reward.id)} className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white transition-colors border border-red-900/30 flex items-center justify-center gap-1.5">
                            <Trash2 className="w-3.5 h-3.5" /> Remover
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MEUS RESGATES */}
      {tab === "resgates" && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">Meus Resgates</h3>
          {myRedemptions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Você ainda não resgatou nenhum prêmio.</p>
          ) : (
            <div className="space-y-3">
              {myRedemptions.map(r => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pendente;
                const Icon = cfg.icon;
                return (
                  <div key={r.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl">
                    <div>
                      <p className="text-white font-medium text-sm">{r.reward_title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{new Date(r.created_date).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-bold text-sm">-{r.points_spent.toLocaleString()} pts</span>
                      <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* GERENCIAR (admin/manager) */}
      {tab === "admin" && isManager && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-green-400" />
            Todos os Resgates
          </h3>
          {redemptions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhum resgate ainda.</p>
          ) : (
            <div className="space-y-3">
              {redemptions.map(r => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pendente;
                return (
                  <div key={r.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl flex-wrap gap-3">
                    <div>
                      <p className="text-white font-medium text-sm">{r.reward_title}</p>
                      <p className="text-gray-400 text-xs">{r.employee_name} · {r.sector}</p>
                      <p className="text-gray-500 text-xs">{new Date(r.created_date).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-green-400 font-bold text-sm">{r.points_spent.toLocaleString()} pts</span>
                      <select
                        value={r.status}
                        onChange={e => handleUpdateStatus(r.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-green-500 ${cfg.color}`}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="entregue">Entregue</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <button
                        onClick={() => handleDeleteRedemption(r.id)}
                        className="p-1.5 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit reward modal */}
      {editingReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-4">Editar Prêmio</h3>
            <div className="space-y-3">
              <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Nome do prêmio *" className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição" rows={2} className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={editForm.points_cost} onChange={e => setEditForm(p => ({ ...p, points_cost: e.target.value }))} placeholder="Custo em pontos *" className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
                <input type="number" value={editForm.stock} onChange={e => setEditForm(p => ({ ...p, stock: e.target.value }))} placeholder="Estoque (vazio = ilimitado)" className="bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-700 border border-gray-600 overflow-hidden flex items-center justify-center shrink-0">
                  {editForm.image_url ? <img src={editForm.image_url} alt="preview" className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-gray-500" />}
                </div>
                <label className="cursor-pointer px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
                  {uploadingPhoto ? "Enviando..." : "Alterar foto"}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setUploadingPhoto(true);
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    setEditForm(p => ({ ...p, image_url: file_url }));
                    setUploadingPhoto(false);
                  }} />
                </label>
                {editForm.image_url && <button onClick={() => setEditForm(p => ({ ...p, image_url: "" }))} className="text-red-400 text-xs hover:underline">Remover</button>}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSaveEditReward} className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm transition-colors">Salvar</button>
              <button onClick={() => setEditingReward(null)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium text-sm transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-2">Confirmar resgate</h3>
            <p className="text-gray-300 text-sm mb-1">Você está resgatando:</p>
            <p className="text-white font-bold mb-1">{confirmReward.title}</p>
            <p className="text-red-400 text-sm mb-4">Custo: <span className="font-bold">{confirmReward.points_cost.toLocaleString()} pontos</span></p>
            <p className="text-gray-400 text-xs mb-6">Após o resgate, seus pontos serão debitados e o pedido ficará pendente de aprovação.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRedeem(confirmReward)}
                disabled={redeeming === confirmReward.id}
                className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
              >
                {redeeming === confirmReward.id ? "Processando..." : "Confirmar"}
              </button>
              <button onClick={() => setConfirmReward(null)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}