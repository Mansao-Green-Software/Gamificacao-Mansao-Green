import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Trophy, Users, Target, LayoutDashboard, LogOut, Menu, X, Crown, Star, ShoppingBag, Zap, Camera, Sun, Moon } from "lucide-react";

const SECTORS = [
  "Social Media", "Audiovisual", "Tráfego", "Líder de Projeto",
  "Tipster", "Suporte", "Contingência", "Comercial", "Financeiro", "Affiliates", "Administrativo", "Gerência", "Saúde e Bem Estar", "Serviços Gerais", "TV Green", "Feira FC", "IA/Automação"
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem("app_logo_url") || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("app_theme") || "dark");
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  const handleLogoUpload = async (file) => {
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLogoUrl(file_url);
    localStorage.setItem("app_logo_url", file_url);
    setUploadingLogo(false);
  };

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const all = await base44.entities.EmployeeProfile.list();
      const found = all.find(p => p.user_id === u.id || p.email === u.email);
      if (found) setProfile(found);
    }).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin";
  const isSupervisor = user?.role === "supervisor";
  const isManager = user?.role === "manager" || isAdmin || isSupervisor;

  const navItems = [
    { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
    { label: "Ranking Geral", page: "RankingGeral", icon: Trophy },
    { label: "Missões", page: "Missions", icon: Target },
    { label: "Green Shop", page: "GreenShop", icon: ShoppingBag },
    { label: "Pontuação", page: "SistemaPontuacao", icon: Zap },
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
            <div className="relative group w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <Crown className="w-5 h-5 text-white" />
              )}
              {isAdmin && (
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                  {uploadingLogo ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-white" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoUpload(e.target.files[0])} />
                </label>
              )}
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">Gamificação</h1>
              <p className="text-green-400 text-xs font-semibold">Mansão Green</p>
            </div>
          </div>
        </div>

        {user && (
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-sm font-bold">{user.full_name?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{profile?.full_name || user.full_name}</p>
                {(profile?.sector || user.sector) && <p className="text-green-400 text-xs truncate">{profile?.sector || user.sector}</p>}
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
                  {(() => {
                    const role = profile?.role || user.role;
                    if (role === "admin") return "Admin";
                    if (role === "manager") return "Gerente";
                    if (role === "supervisor") return "Supervisor";
                    return "Colaborador";
                  })()}
                </span>
              </div>
            </div>
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
                    ? "bg-green-500 text-black shadow-lg shadow-green-500/20"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2 text-gray-400">
              {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span className="text-sm font-medium">{theme === "dark" ? "Escuro" : "Claro"}</span>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
                theme === "light" ? "bg-green-500" : "bg-gray-600"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                theme === "light" ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>
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
        <div className="lg:hidden fixed inset-0 z-40 bg-gray-900 pt-16 overflow-y-auto">
          {/* User info */}
          {user && (
            <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-sm font-bold">{user.full_name?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{profile?.full_name || user.full_name}</p>
                {(profile?.sector || user.sector) && <p className="text-green-400 text-xs truncate">{profile?.sector || user.sector}</p>}
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-300">
                  {(() => {
                    const role = profile?.role || user.role;
                    if (role === "admin") return "Admin";
                    if (role === "manager") return "Gerente";
                    if (role === "supervisor") return "Supervisor";
                    return "Colaborador";
                  })()}
                </span>
              </div>
            </div>
          )}
          <nav className="p-4 space-y-1">
            {navItems.map(({ label, page, icon: Icon }) => (
              <Link
                key={page}
                to={createPageUrl(page)}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  currentPageName === page
                    ? "bg-green-500 text-black"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {/* Theme toggle */}
            <div className="flex items-center justify-between px-3 py-3 mt-2">
              <div className="flex items-center gap-2 text-gray-400">
                {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span className="text-sm font-medium">{theme === "dark" ? "Escuro" : "Claro"}</span>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
                  theme === "light" ? "bg-green-500" : "bg-gray-600"
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                  theme === "light" ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
            <button
              onClick={() => base44.auth.logout()}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all w-full mt-2"
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