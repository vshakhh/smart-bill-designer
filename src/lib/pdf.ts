import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type BillItem = {
  name: string;
  hsn?: string;
  qty: number;
  price: number;
  gst: number; // percent
  discount: number; // percent
};

export type BillData = {
  billNumber: string;
  date: string;
  storeName: string;
  storeAddress?: string;
  customerName?: string;
  customerPhone?: string;
  items: BillItem[];
};

export function computeTotals(items: BillItem[]) {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;
  const rows = items.map((it, i) => {
    const gross = it.qty * it.price;
    const disc = (gross * it.discount) / 100;
    const taxable = gross - disc;
    const tax = (taxable * it.gst) / 100;
    const total = taxable + tax;
    subtotal += gross;
    discountTotal += disc;
    taxTotal += tax;
    return { i: i + 1, ...it, gross, disc, tax, total };
  });
  const grandTotal = subtotal - discountTotal + taxTotal;
  return { rows, subtotal, taxTotal, discountTotal, grandTotal };
}

export function generateBillPdf(bill: BillData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { rows, subtotal, taxTotal, discountTotal, grandTotal } = computeTotals(bill.items);
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(bill.storeName || "Supermarket", pageW / 2, 18, { align: "center" });
  if (bill.storeAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(bill.storeAddress, pageW / 2, 24, { align: "center" });
  }

  doc.setDrawColor(180);
  doc.line(14, 30, pageW - 14, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TAX INVOICE", pageW / 2, 37, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Bill No: ${bill.billNumber}`, 14, 45);
  doc.text(`Date: ${bill.date}`, pageW - 14, 45, { align: "right" });
  if (bill.customerName) doc.text(`Customer: ${bill.customerName}`, 14, 51);
  if (bill.customerPhone) doc.text(`Phone: ${bill.customerPhone}`, pageW - 14, 51, { align: "right" });

  // Items table
  autoTable(doc, {
    startY: 58,
    head: [["#", "Item", "HSN", "Qty", "Price", "Disc%", "GST%", "Total"]],
    body: rows.map((r) => [
      r.i,
      r.name,
      r.hsn || "-",
      r.qty,
      r.price.toFixed(2),
      r.discount.toFixed(1),
      r.gst.toFixed(1),
      r.total.toFixed(2),
    ]),
    styles: { fontSize: 9, cellPadding: 2, lineColor: [180, 180, 180], lineWidth: 0.1 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, halign: "center" },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right", fontStyle: "bold" },
    },
    theme: "grid",
  });

  // Totals block
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  const labelX = pageW - 70;
  const valueX = pageW - 14;
  doc.setFontSize(10);
  const line = (label: string, val: string, y: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, labelX, y);
    doc.text(val, valueX, y, { align: "right" });
  };
  line("Subtotal:", subtotal.toFixed(2), finalY);
  line("Discount:", `- ${discountTotal.toFixed(2)}`, finalY + 6);
  line("Tax (GST):", taxTotal.toFixed(2), finalY + 12);
  doc.setDrawColor(120);
  doc.line(labelX, finalY + 15, valueX, finalY + 15);
  doc.setFontSize(12);
  line("Grand Total:", grandTotal.toFixed(2), finalY + 22, true);

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Thank you for shopping with us!", pageW / 2, 285, { align: "center" });

  doc.save(`bill-${bill.billNumber}.pdf`);
}
