import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Receipt,
  Handshake,
  BookOpen,
  Vault,
  BarChart2,
  Users,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { clearToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard",      url: "/",               icon: LayoutDashboard },
  { title: "Wallet",         url: "/wallet",         icon: Wallet },
  { title: "Transactions",   url: "/transactions",   icon: ArrowLeftRight },
  { title: "Bill Splits",    url: "/bill-splits",    icon: Receipt },
  { title: "Loans",          url: "/loans",          icon: Handshake },
  { title: "Khata Groups",   url: "/khata-groups",   icon: BookOpen },
  { title: "Saving Vaults",  url: "/saving-vaults",  icon: Vault },
  { title: "Fixed Expenses", url: "/fixed-expenses", icon: BarChart2 },
  { title: "Friends",        url: "/friends",        icon: Users },
  { title: "Settings",       url: "/settings",       icon: Settings },
];

interface AppSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ mobileOpen = false, onClose }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();

  const initials = (me?.username || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    clearToken();
    navigate("/login");
  };

  const handleNavClick = () => {
    onClose?.();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-display font-black text-sm shrink-0">
            FT
          </div>
          <div>
            <h1 className="font-display text-base font-black tracking-tight text-foreground leading-none">
              FinTrack
            </h1>
            <p className="label-caps text-muted-foreground mt-0.5">Wealth Management</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-surface-container-low transition-colors"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.url === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.url);

          return (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-surface-container text-foreground font-semibold border-r-2 border-primary dark:bg-sidebar-accent dark:text-sidebar-foreground dark:border-sidebar-ring"
                  : "text-muted-foreground hover:bg-surface-container-low hover:text-foreground dark:text-sidebar-foreground/70 dark:hover:bg-sidebar-accent/70 dark:hover:text-sidebar-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-primary dark:text-sidebar-primary" : "text-muted-foreground dark:text-sidebar-foreground/70"
                )}
              />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: User + Logout */}
      <div className="border-t border-border p-4 mt-auto shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold font-display shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate font-display">
              {me?.username || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{me?.email || ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-coral-soft hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-64 border-r border-border bg-card fixed left-0 top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile: slide-in drawer */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
