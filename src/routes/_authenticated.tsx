import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, FilePlus2, ListOrdered, ShieldCheck, LogOut, Menu, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

type Role = "owner" | "approved" | "pending";

function AuthLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [email, setEmail] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      setEmail(userData.user?.email ?? "");
      const { data } = await supabase.from("user_roles").select("role");
      setRoles((data ?? []).map((r) => r.role as Role));
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (roles === null) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  const isOwner = roles.includes("owner");
  const isApproved = isOwner || roles.includes("approved");

  if (!isApproved) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-elevated">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-warning/20 text-warning-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Waiting for approval</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You're signed in as <span className="font-medium text-foreground">{email}</span>. The owner needs to approve your access before you can create bills.
          </p>
          <button onClick={signOut} className="mt-6 rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-secondary">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const nav = [
    { to: "/app", label: "New bill", icon: FilePlus2 },
    { to: "/app/bills", label: "History", icon: ListOrdered },
    ...(isOwner ? [{ to: "/app/admin", label: "Access", icon: ShieldCheck }] : []),
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/app" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Receipt className="h-4 w-4" />
            </div>
            <span className="font-semibold">BillPad</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => {
              const active = pathname === n.to;
              return (
                <Link key={n.to} to={n.to} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-muted-foreground">{email}</span>
            <button onClick={signOut} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-border bg-card px-4 py-3 md:hidden">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary">
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
            <button onClick={signOut} className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
