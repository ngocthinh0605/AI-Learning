import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { BookOpen, LayoutDashboard, LogOut, Mic, GraduationCap } from "lucide-react";
import { useAuthStore } from "../../stores/useAuthStore";
import toast from "react-hot-toast";

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    toast.success("Logged out");
    navigate("/login");
  }

  const navItems = [
    { to: "/dashboard", label: "Dashboard",  Icon: LayoutDashboard },
    { to: "/vocabulary", label: "Vocabulary", Icon: BookOpen },
    { to: "/ielts",      label: "IELTS",      Icon: GraduationCap },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
              <Mic size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white">Speaking AI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-accent-500/20 text-accent-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-gray-800">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-white truncate">{user?.display_name || user?.email}</p>
            <p className="text-xs text-gray-500">Level {user?.english_level} · {user?.xp_points} XP</p>
          </div>
          <button onClick={handleLogout} className="btn-ghost w-full justify-start flex items-center gap-2 text-sm">
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
