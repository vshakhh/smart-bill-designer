import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, ShieldCheck, FileDown, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BillPad — Simple Supermarket Billing" },
      { name: "description", content: "Create clean, printable supermarket bills with GST, discounts and instant PDF download. Access is invite-only." },
      { property: "og:title", content: "BillPad — Simple Supermarket Billing" },
      { property: "og:description", content: "Friendly POS-style billing with PDF export. Invite-only access." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">BillPad</span>
          </div>
          {signedIn ? (
            <Link to="/app" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Open app
            </Link>
          ) : (
            <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Invite-only access
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Supermarket billing that just works.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Add items, calculate GST and discounts, and download a neat printable PDF bill in one click.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={signedIn ? "/app" : "/auth"} className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-soft hover:opacity-90">
              {signedIn ? "Open dashboard" : "Sign in with Google"}
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Receipt, title: "Clean bill layout", desc: "S.No, Item, HSN, Qty, Price, GST %, Discount, Total — printed in a tidy table." },
            { icon: FileDown, title: "One-click PDF", desc: "Download a print-ready invoice matching real supermarket bills." },
            { icon: Users, title: "You control access", desc: "Sign-ups wait for your approval. Only people you allow can generate bills." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-soft">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} BillPad
      </footer>
    </div>
  );
}
