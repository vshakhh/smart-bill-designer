import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeTotals, generateBillPdf, type BillItem } from "@/lib/pdf";
import { Plus, Trash2, Download, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "New Bill — BillPad" }] }),
  component: NewBill,
});

const STORE_KEY = "billpad.store";

function NewBill() {
  const [storeName, setStoreName] = useState("My Supermarket");
  const [storeAddress, setStoreAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billNumber, setBillNumber] = useState(() => `INV-${Date.now().toString().slice(-6)}`);
  const [items, setItems] = useState<BillItem[]>([
    { name: "", hsn: "", qty: 1, price: 0, gst: 0, discount: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const s = localStorage.getItem(STORE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      setStoreName(parsed.storeName ?? "My Supermarket");
      setStoreAddress(parsed.storeAddress ?? "");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify({ storeName, storeAddress }));
  }, [storeName, storeAddress]);

  const totals = useMemo(() => computeTotals(items), [items]);

  const updateItem = (i: number, patch: Partial<BillItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const addItem = () =>
    setItems((prev) => [...prev, { name: "", hsn: "", qty: 1, price: 0, gst: 0, discount: 0 }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const validItems = items.filter((i) => i.name.trim() && i.qty > 0);

  const downloadPdf = () => {
    if (!validItems.length) {
      setMsg("Add at least one item with a name.");
      return;
    }
    generateBillPdf({
      billNumber,
      date: new Date().toLocaleString(),
      storeName,
      storeAddress,
      customerName,
      customerPhone,
      items: validItems,
    });
  };

  const saveBill = async () => {
    if (!validItems.length) {
      setMsg("Add at least one item with a name.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("bills").insert({
      user_id: u.user!.id,
      bill_number: billNumber,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      store_name: storeName,
      store_address: storeAddress || null,
      items: validItems,
      subtotal: totals.subtotal,
      tax_total: totals.taxTotal,
      discount_total: totals.discountTotal,
      grand_total: totals.grandTotal,
    });
    setSaving(false);
    if (error) setMsg(error.message);
    else {
      setMsg("Bill saved.");
      setBillNumber(`INV-${Date.now().toString().slice(-6)}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Bill</h1>
        <p className="text-sm text-muted-foreground">Fill in items and download a printable PDF invoice.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Store & customer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Store name" value={storeName} onChange={setStoreName} />
          <Field label="Bill number" value={billNumber} onChange={setBillNumber} />
          <Field label="Store address" value={storeAddress} onChange={setStoreAddress} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer name" value={customerName} onChange={setCustomerName} />
            <Field label="Phone" value={customerPhone} onChange={setCustomerPhone} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Items</h2>
          <button onClick={addItem} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Add row
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="w-24 px-3 py-2 text-left">HSN/SKU</th>
                <th className="w-20 px-3 py-2 text-right">Qty</th>
                <th className="w-28 px-3 py-2 text-right">Price</th>
                <th className="w-20 px-3 py-2 text-right">Disc %</th>
                <th className="w-20 px-3 py-2 text-right">GST %</th>
                <th className="w-28 px-3 py-2 text-right">Total</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const row = totals.rows[i];
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2"><Input value={it.name} onChange={(v) => updateItem(i, { name: v })} placeholder="Rice 5kg" /></td>
                    <td className="px-3 py-2"><Input value={it.hsn ?? ""} onChange={(v) => updateItem(i, { hsn: v })} /></td>
                    <td className="px-3 py-2"><NumInput value={it.qty} onChange={(v) => updateItem(i, { qty: v })} /></td>
                    <td className="px-3 py-2"><NumInput value={it.price} onChange={(v) => updateItem(i, { price: v })} step={0.01} /></td>
                    <td className="px-3 py-2"><NumInput value={it.discount} onChange={(v) => updateItem(i, { discount: v })} step={0.5} /></td>
                    <td className="px-3 py-2"><NumInput value={it.gst} onChange={(v) => updateItem(i, { gst: v })} step={0.5} /></td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{row.total.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={() => removeItem(i)} disabled={items.length === 1} className="text-muted-foreground hover:text-destructive disabled:opacity-30">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={downloadPdf} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-soft hover:opacity-90">
              <Download className="h-4 w-4" /> Download PDF
            </button>
            <button onClick={saveBill} disabled={saving} className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save bill"}
            </button>
          </div>
          {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={totals.subtotal} />
            <Row label="Discount" value={-totals.discountTotal} />
            <Row label="GST" value={totals.taxTotal} />
            <div className="my-2 border-t border-border" />
            <Row label="Grand Total" value={totals.grandTotal} bold />
          </dl>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
    </label>
  );
}
function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />;
}
function NumInput({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return <input type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-right text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />;
}
function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-semibold" : ""}`}>
      <dt className={bold ? "" : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{value.toFixed(2)}</dd>
    </div>
  );
}
