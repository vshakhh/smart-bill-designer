import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, setUserStatus } from "@/lib/admin.functions";
import { Check, Clock, UserX, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin")({
  head: () => ({ meta: [{ title: "Access — BillPad" }] }),
  component: Admin,
});

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
};

function Admin() {
  const list = useServerFn(listUsers);
  const setStatus = useServerFn(setUserStatus);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setRows((await list()) as Row[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  };
  useEffect(() => {
    refresh();
  }, []);

  const act = async (userId: string, status: "approved" | "pending" | "revoke") => {
    setBusy(userId);
    setErr(null);
    try {
      await setStatus({ data: { userId, status } });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const statusOf = (r: Row) =>
    r.roles.includes("owner") ? "owner" : r.roles.includes("approved") ? "approved" : r.roles.includes("pending") ? "pending" : "revoked";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Access control</h1>
        <p className="text-sm text-muted-foreground">Approve or revoke people who signed in with Google.</p>
      </div>
      {err && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</div>}
      {rows === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = statusOf(r);
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {r.avatar_url ? (
                            <img src={r.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                          ) : (
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-medium">
                              {(r.full_name || r.email || "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{r.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{r.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><StatusPill status={s} /></td>
                      <td className="px-4 py-3 text-right">
                        {s === "owner" ? (
                          <span className="text-xs text-muted-foreground">You</span>
                        ) : (
                          <div className="inline-flex gap-2">
                            {s !== "approved" && (
                              <button disabled={busy === r.id} onClick={() => act(r.id, "approved")} className="inline-flex items-center gap-1 rounded-md bg-success px-3 py-1.5 text-xs font-medium text-success-foreground hover:opacity-90 disabled:opacity-60">
                                <Check className="h-3.5 w-3.5" /> Approve
                              </button>
                            )}
                            {s !== "revoked" && (
                              <button disabled={busy === r.id} onClick={() => act(r.id, "revoke")} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60">
                                <UserX className="h-3.5 w-3.5" /> Revoke
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { icon: any; cls: string; label: string }> = {
    owner: { icon: ShieldCheck, cls: "bg-primary/10 text-primary", label: "Owner" },
    approved: { icon: Check, cls: "bg-success/15 text-success", label: "Approved" },
    pending: { icon: Clock, cls: "bg-warning/20 text-warning-foreground", label: "Pending" },
    revoked: { icon: UserX, cls: "bg-muted text-muted-foreground", label: "Revoked" },
  };
  const m = map[status] ?? map.revoked;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${m.cls}`}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}
