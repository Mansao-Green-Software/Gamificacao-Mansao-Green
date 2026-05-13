import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Star, Gift, Plus, Edit2, Check, X, Camera } from "lucide-react";

export default function QuarterlyPrizeBanner({ isAdmin }) {
  const [prize, setPrize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", quarter: "", image_url: "" });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    // Delay to stagger away from Dashboard's initial API burst
    setTimeout(() => {
      base44.entities.QuarterlyPrize.filter({ is_active: true }).then((list) => {
        if (list.length > 0) setPrize(list[0]);
        setLoading(false);
      });
    }, 800);
  }, []);

  const openEdit = () => {
    setForm({
      title: prize?.title || "",
      description: prize?.description || "",
      quarter: prize?.quarter || "",
      image_url: prize?.image_url || ""
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
    setForm((p) => ({ ...p, image_url: file_url }));
    setUploading(false);
  };

  if (loading) return null;

  // No prize and not admin: don't show
  if (!prize && !isAdmin) return null;

  return (
    <div data-theme="dark" className="relative overflow-hidden rounded-2xl border-1  group flex flex-col justify-center">
      {/* Background image or gradient */}
      {prize?.image_url ? (
        <img src={prize.image_url} alt={prize.title} className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-gray-900 to-black" />
      )}
      
      {/* Left to right gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 sm:via-black/80 to-transparent" />
      
      {/* Bottom up gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 sm:via-black/40 to-transparent" />

      <div className="relative p-6 sm:p-10 lg:p-12 min-h-[260px] sm:min-h-[320px] flex flex-col justify-center w-full lg:w-4/5">
        <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
          <div className="p-2 sm:p-2.5  rounded-xl border border-amber-500/30 backdrop-blur-md shadow-inner">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
          </div>
          <span className="text-amber-400 text-xs sm:text-sm font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] drop-shadow-md">
            Prêmio do {prize?.quarter || "Trimestre"}
          </span>
        </div>
        
        <h2 className="text-white text-xl sm:text-3xl lg:text-5xl font-extrabold leading-tight mb-3 sm:mb-4 drop-shadow-lg">
          {prize?.title || "Configure o prêmio do trimestre"}
        </h2>
        
        {prize?.description && (
          <p className="text-gray-300 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed mb-5 sm:mb-6 font-medium line-clamp-3 sm:line-clamp-none">
            {prize.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-auto self-start bg-black/60 backdrop-blur-xl px-4 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl border border-amber-500/20 shadow-lg shadow-black/50">
          <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 fill-amber-400 shrink-0 drop-shadow-sm" />
          <span className="text-amber-50 text-[10px] sm:text-sm font-semibold tracking-wide">Exclusivo para o 1º lugar do TOP 5 MG do trimestre</span>
        </div>
      </div>

      {/* Admin button */}
      {isAdmin && !editing && (
        <button
          onClick={openEdit}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 sm:p-3 text-amber-400 hover:text-white bg-black/40 hover:bg-amber-500 backdrop-blur-md rounded-xl sm:rounded-2xl transition-all duration-300 border border-amber-500/30 z-10 shadow-xl group-hover:scale-105">
          {prize ? <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      )}

      {/* Edit form */}
      {editing && isAdmin &&
      <div className="relative border-t border-amber-700/30 p-5 bg-black/20 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Nome do prêmio *"
            className="col-span-2 bg-gray-900 border border-amber-700/40 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500" />
          
            <input
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Descrição (ex: iPhone 16 Pro Max 256GB)"
            className="bg-gray-900 border border-amber-700/40 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500" />
          
            <input
            value={form.quarter}
            onChange={(e) => setForm((p) => ({ ...p, quarter: e.target.value }))}
            placeholder="Trimestre (ex: 2º Trimestre 2025)"
            className="bg-gray-900 border border-amber-700/40 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500" />
          
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gray-800 border border-amber-700/40 overflow-hidden flex items-center justify-center shrink-0">
              {form.image_url ?
            <img src={form.image_url} alt="preview" className="w-full h-full object-cover" /> :

            <Camera className="w-5 h-5 text-gray-500" />
            }
            </div>
            <label className="cursor-pointer px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
              {uploading ? "Enviando..." : "Carregar imagem"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files[0])} />
            </label>
            {form.image_url &&
          <button onClick={() => setForm((p) => ({ ...p, image_url: "" }))} className="text-red-400 text-xs hover:underline">Remover</button>
          }
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
      }
    </div>);

}