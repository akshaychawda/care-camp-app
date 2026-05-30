import { Outlet, Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PlusCircle, Users, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import madLogo from "@/assets/mad-logo.png";
import { signOut } from "@/lib/auth";
import { getPendingCount } from "@/lib/api";
import { Route } from "@/routes/admin";

const NAV = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "New Camp", to: "/admin/new", icon: PlusCircle, exact: false },
  { label: "Users", to: "/admin/users", icon: Users, exact: false },
];

export function AdminLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { profile } = Route.useRouteContext();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (profile?.role === "super_admin" || profile?.role === "mad_employee") {
      getPendingCount().then(setPendingCount);
    }
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const canSeeUsers =
    profile?.role === "super_admin" || profile?.role === "mad_employee";

  const nav = NAV.filter((item) => item.to !== "/admin/users" || canSeeUsers);

  return (
    <div className="admin min-h-screen w-full flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-16 lg:w-56 flex-col bg-sidebar text-sidebar-foreground shrink-0 transition-all">
        <div className="px-3 lg:px-5 py-5 border-b border-sidebar-border flex items-center gap-3 lg:justify-start justify-center">
          <div className="h-10 w-10 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
            <img src={madLogo} alt="MAD" className="h-6 w-auto" />
          </div>
          <div className="hidden lg:block min-w-0">
            <div className="font-bold text-sm">{profile?.full_name || "MAD Admin"}</div>
            <div className="text-xs text-sidebar-foreground/60 capitalize">
              {profile?.role?.replace("_", " ") ?? "Care Camps"}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 lg:p-3 space-y-1">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            const badge = item.to === "/admin/users" && pendingCount > 0 ? pendingCount : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition lg:justify-start justify-center ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="hidden lg:inline flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className="hidden lg:flex h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold items-center justify-center">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 lg:p-3 border-t border-sidebar-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition w-full lg:justify-start justify-center"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">Sign out</span>
          </button>
          <div className="hidden lg:block px-3 pt-2 text-xs text-sidebar-foreground/40">
            v1.0 · Internal use
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden bg-sidebar text-sidebar-foreground px-5 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <img src={madLogo} alt="MAD" className="h-5 w-auto" />
          </div>
          <span className="font-bold text-sm">MAD Admin</span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground p-1"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar text-sidebar-foreground border-t border-sidebar-border z-50"
        style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
        <div className={`grid`} style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            const badge = item.to === "/admin/users" && pendingCount > 0 ? pendingCount : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium min-h-14 relative ${
                  active
                    ? "text-sidebar-primary-foreground bg-sidebar-accent"
                    : "text-sidebar-foreground/70"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                {badge > 0 && (
                  <span className="absolute top-2 right-1/4 h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
