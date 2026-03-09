import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Trophy, Users, Target, LayoutDashboard, LogOut, Menu, X, Crown, Star } from "lucide-react";

const SECTORS = [
  "Social Media", "Audiovisual", "Tráfego", "Líder de Projeto",
  "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro"
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager" || isAdmin;

  const navItems = [
    { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
    { label: "Ranking Geral", page: "RankingGeral", icon: Trophy },
    { label: "Missões", page: "Missions", icon: Target },
    ...(isManager ? [{ label: "Gerenciar Pontos", page: "ManagePoints", icon: Star }] : []),
    ...(isAdmin ? [{ label: "Colaboradores", page: "Employees", icon: Users }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <style>{`
        :root {
          --green-primary: #22c55e;
          --green-dark: #15803d;
          --green-light: #4ade80;
          --gold: #f59e0b;
          --silver: #94a3b8;
          --bronze: #b45309;
        }
      `}</style>

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-gray-900 border-r border-gray-800 z-40">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">Gamificação</h1>
              <p className="text-green-400 text-xs font-semibold">Mansão Green</p>
            </div>
          </div>
        </div>

        {user && (
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-gray-400 text-xs">Logado como</p>
            <p className="text-white text-sm font-medium truncate">{user.full_name}</p>
            {user.sector && <p className="text-green-400 text-xs">{user.sector}</p>}
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
              {user.role === "admin" ? "Admin" : user.role === "manager" ? "Gerente" : "Colaborador"}
            </span>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ label, page, icon: Icon }) => {
            const isActive = currentPageName === page;
            return (
              <Link
                key={page}
                to={createPageUrl(page)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">Mansão Green</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-gray-400 hover:text-white">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-gray-900 pt-16">
          <nav className="p-4 space-y-1">
            {navItems.map(({ label, page, icon: Icon }) => (
              <Link
                key={page}
                to={createPageUrl(page)}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  currentPageName === page
                    ? "bg-green-500 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <button
              onClick={() => base44.auth.logout()}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all w-full mt-4"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}