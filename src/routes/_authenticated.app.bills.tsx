import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateBillPdf, type BillItem } from "@/lib/pdf";
import { Download, Receipt } from "lucide-react";

type BillRow = {
  id: string;
  bill_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  store_name: string | null;
  store_address: string | null;
  items: BillItem[];
  grand_total: number;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/app/bills")({
  head: () => ({ meta: [{ title: "Bill history — BillPad" }] }),
  component: History,
});

function History() {
  const [rows, setRows] = useState<BillRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("bills")
      .select("id,bill_number,customer_name,customer_phone,store_name,store_address,items,grand_total,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as unknown as BillRow[]));
  }, []);

  const reprint = (b: BillRow) => {
    generateBillPdf({
      billNumber: b.bill_number,
      date: new Date(b.created_at).toLocaleString(),
      storeName: b.store_name ?? "",
      storeAddress: b.store_address ?? undefined,
      customerName: b.customer_name ?? undefined,
      customerPhone: b.customer_phone ?? undefined,
      items: b.items ?? [],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bill history</h1>
        <p className="text-sm text-muted-foreground">All bills you've saved. Download any as PDF again.</p>
      </div>

      {rows === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No bills saved yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Bill No.</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{b.bill_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{b.customer_name || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{b.grand_total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => reprint(b)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
