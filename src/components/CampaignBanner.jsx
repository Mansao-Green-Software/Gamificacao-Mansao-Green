import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ShoppingBag, Clock, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

function useCountdown(endDate) {
  const calc = () => {
    const diff = new Date(endDate + "T23:59:59") - new Date();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [endDate]);
  return time;
}

export default function CampaignBanner() {
  const [campaign, setCampaign] = useState(null);

  useEffect(() => {
    base44.entities.Campaign.filter({ is_active: true }).then(camps => {
      const today = new Date().toISOString().slice(0, 10);
      const active = camps.find(c => c.start_date <= today && c.end_date >= today);
      if (active) setCampaign(active);
    }).catch(() => {});
  }, []);

  const countdown = useCountdown(campaign?.end_date || "2099-01-01");

  if (!campaign) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-red-500/40"
      style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a0000 40%, #0f1a00 100%)" }}
    >
      {/* Fundo animado */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-green-500/10 rounded-full blur-3xl" />
      </div>

      {campaign.banner_image_url && (
        <div className="absolute inset-0">
          <img src={campaign.banner_image_url} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/80" />
        </div>
      )}

      <div className="relative z-10 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 shrink-0 mt-0.5">
              <Flame className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                  ● Campanha Ativa
                </span>
              </div>
              <h2 className="text-white font-black text-xl sm:text-2xl mt-1 leading-tight" style={{ textShadow: "0 0 30px rgba(220,38,38,0.3)" }}>
                {campaign.name}
              </h2>
              {campaign.description && (
                <p className="text-gray-400 text-sm mt-1">{campaign.description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-3">
            {countdown ? (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="flex items-center gap-1">
                  {[
                    { v: countdown.d, l: "d" },
                    { v: countdown.h, l: "h" },
                    { v: countdown.m, l: "m" },
                    { v: countdown.s, l: "s" },
                  ].map(({ v, l }) => (
                    <div key={l} className="flex items-center gap-0.5">
                      <span className="bg-gray-900 border border-gray-700 text-white font-black text-sm px-2 py-1 rounded-lg min-w-[32px] text-center tabular-nums">
                        {String(v).padStart(2, "0")}
                      </span>
                      <span className="text-gray-500 text-xs font-bold">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-gray-500 text-xs">Campanha encerrada</span>
            )}
            <Link
              to={createPageUrl("GreenShop")}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-red-900/40"
            >
              <ShoppingBag className="w-4 h-4" />
              Ver ofertas
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}