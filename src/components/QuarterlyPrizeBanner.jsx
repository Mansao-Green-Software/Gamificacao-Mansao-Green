import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Star, Gift, Plus, Edit2, Check, X, Camera } from "lucide-react";

export default function QuarterlyPrizeBanner({ isAdmin }) {
  const [prize, setPrize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", quarter: "", image_url: "" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.QuarterlyPrize.filter({ is_active: true }).then(list => {
      if (list.length > 0) setPrize(list[0]);
      setLoading(false);
    });
  }, []);

  const openEdit = () => {
    setForm({
      title: prize?.title || "",
      description: prize?.description || "",
      quarter: prize?.quarter || "",
      image_url: prize?.image_url || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (prize) {
      const updated = await base44.entities.QuarterlyPrize.update(prize.id, form);
      setPrize({ ...prize, ...form });
    } else {
      const created = await base44.entities.QuarterlyPrize.create({ ...form, is_active: true });
      setPrize(created);
    }
    setSaving(false);
    setEditing(false);
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, image_url: file_url }));
    setUploading(false);
  };

  if (loading) return null;

  // No prize and not admin: don't show
  if (!prize && !isAdmin) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-600/40 bg-gradient-to-r from-amber-950/60 via-yellow-900/40 to-amber-950/60">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-yellow-400/10 to-amber-500/5" />

      <div className="relative p-5 flex flex-col sm:flex-row items-center gap-5">
        {/* Icon / Image */}
        <div className="shrink-0">
          {prize?.image_url ? (
            <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-amber-500/50">
              <img src={prize.image_url} alt={prize.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-xl bg-amber-900/50 border-2 border-amber-600/50 flex items-center justify-center">
              <Gift className="w-10 h-10 text-amber-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
              Prêmio do {prize?.quarter || "Trimestre"}
            </span>
          </div>
          <h2 className="text-white text-xl font-bold leading-tight">
            {prize?.title || "Configure o prêmio do trimestre"}
          </h2>
          {prize?.description && (
            <p className="text-amber-200/70 text-sm mt-1">{prize.description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2 justify-center sm:justify-start">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-amber-300 text-xs font-medium">Para o 1º lugar no ranking do trimestre</span>
          </div>
        </div>

        {/* Admin actions */}
        {isAdmin && !editing && (
          <button
            onClick={openEdit}
            className="shrink-0 p-2 text-amber-400 hover:bg-amber-900/40 rounded-xl transition-colors border border-amber-700/40"
          >
            {prize ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Edit form */}
      {editing && isAdmin && (
        <div className="relative border-t border-amber-700/30 p-5 bg-black/20 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Nome do prêmio *"
              className="col-span-2 bg-gray-900 border border-amber-700/40 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
            />
            <input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Descrição (ex: iPhone 16 Pro Max 256GB)"
              className="bg-gray-900 border border-amber-700/40 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
            />
            <input
              value={form.quarter}
              onChange={e => setForm(p => ({ ...p, quarter: e.target.value }))}
              placeholder="Trimestre (ex: 2º Trimestre 2025)"
              className="bg-gray-900 border border-amber-700/40 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gray-800 border border-amber-700/40 overflow-hidden flex items-center justify-center shrink-0">
              {form.image_url ? (
                <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <label className="cursor-pointer px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
              {uploading ? "Enviando..." : "Carregar imagem"}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files[0])} />
            </label>
            {form.image_url && (
              <button onClick={() => setForm(p => ({ ...p, image_url: "" }))} className="text-red-400 text-xs hover:underline">Remover</button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              <Check className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}