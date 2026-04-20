import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, X, CheckCheck, ShoppingBag, Star, Target, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatBRT } from "@/utils/dateUtils";

const TYPE_CONFIG = {
  resgate: { icon: ShoppingBag, color: "text-amber-400", bg: "bg-amber-900/30" },
  pontuacao: { icon: Star, color: "text-green-400", bg: "bg-green-900/30" },
  missao: { icon: Target, color: "text-blue-400", bg: "bg-blue-900/30" },
  geral: { icon: Info, color: "text-gray-400", bg: "bg-gray-700/40" },
};

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);

  const load = async () => {
    if (!userId) return;
    try {
      const all = await base44.entities.Notification.filter({ user_id: userId }, "-created_date", 200);
      setNotifications(all);
    } catch (e) {}
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const handleClick = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    const unreadOnes = notifications.filter(n => !n.is_read);
    await Promise.all(unreadOnes.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (n) => {
    if (n.is_read) return;
    await base44.entities.Notification.update(n.id, { is_read: true });
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    await base44.entities.Notification.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropdownHeight = 480;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < dropdownHeight + 16;
      setDropdownPos({
        top: openUpward ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
        left: Math.max(8, rect.right - 320),
      });
    }
    setOpen(o => !o);
    if (!open) load();
  };

  return (
    <div ref={ref}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-green-500 text-black text-[10px] font-extrabold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
          className="w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[480px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <p className="text-white font-bold text-sm">Notificações</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhuma notificação
              </div>
            ) : (
              notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.geral;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => markRead(n)}
                    className={`relative flex gap-3 px-4 py-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800/60 transition-colors ${!n.is_read ? "bg-gray-800/40" : ""}`}
                  >
                    {!n.is_read && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-green-400 rounded-full" />
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${n.is_read ? "text-gray-300" : "text-white"}`}>{n.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-gray-600 text-[10px] mt-1">{formatBRT(n.created_date)}</p>
                    </div>
                    <button
                      onClick={(e) => deleteNotification(n.id, e)}
                      className="shrink-0 p-1 text-gray-600 hover:text-red-400 transition-colors rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}