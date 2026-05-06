import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full app-bg">
      {/* ── Sidebar (desktop fixed + mobile drawer) ── */}
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden transition-all duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 relative z-0">
        {/* Top header */}
        <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 glass rounded-none border-x-0 border-t-0 sticky top-0 z-20">
          {/* Left: hamburger (mobile) + search (desktop) */}
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-surface-container-low hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search bar — desktop only */}
            <GlobalSearch />

            {/* Theme switcher */}
            <ThemeSwitcher />
          </div>
          <div className="flex items-center gap-1" />
        </header>

        {/* Page content — overflow-auto lives on this inner wrapper so that
            position:fixed dialog portals anchor to the viewport, not this container */}
        <main className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-auto p-4 md:p-6">
            <div className="max-w-[1280px] w-full mx-auto">
              <PageTransition>
                <Outlet />
              </PageTransition>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
