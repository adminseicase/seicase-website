import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ViewableOrder } from "@/lib/data/orders";
import type { StoreSettings } from "@/lib/types";

const INK = rgb(0.12, 0.1, 0.09);
const MUTED = rgb(0.44, 0.38, 0.35);
const LINE = rgb(0.9, 0.85, 0.82);
const COGNAC = rgb(0.61, 0.35, 0.2);

// Standard PDF fonts can't render "₹", so amounts use "Rs." in the PDF.
const money = (n: number) => `Rs. ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const clean = (s: string | null | undefined) =>
  (s ?? "").replace(/[^\x20-\x7E]/g, (c) => (c === "₹" ? "Rs." : c === "×" ? "x" : c === "–" || c === "—" ? "-" : ""));

/** Tax invoice (GST inclusive) as a PDF, also used for the packing slip copy. */
export async function buildInvoicePdf(order: ViewableOrder, store: StoreSettings, kind: "invoice" | "packing" = "invoice") {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${kind === "invoice" ? "Invoice" : "Packing slip"} ${order.order_number}`);
  pdf.setAuthor("seicase");
  const page = pdf.addPage([595.28, 841.89]); // A4
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();
  const M = 48;
  let y = 790;

  const text = (
    t: string,
    x: number,
    yy: number,
    opts: { size?: number; font?: typeof sans; color?: typeof INK; align?: "left" | "right" } = {},
  ) => {
    const size = opts.size ?? 10;
    const font = opts.font ?? sans;
    const s = clean(t);
    const w = font.widthOfTextAtSize(s, size);
    page.drawText(s, { x: opts.align === "right" ? x - w : x, y: yy, size, font, color: opts.color ?? INK });
  };
  const hr = (yy: number) => page.drawLine({ start: { x: M, y: yy }, end: { x: width - M, y: yy }, thickness: 0.7, color: LINE });

  text("seicase", M, y, { size: 32, font: serif });
  text(kind === "invoice" ? "TAX INVOICE" : "PACKING SLIP", width - M, y + 8, { size: 11, font: bold, align: "right", color: COGNAC });
  text(`#${order.order_number}`, width - M, y - 8, { size: 10, align: "right" });
  y -= 22;
  text(store.legal_name, M, y, { size: 9, color: MUTED });
  y -= 12;
  text(`${store.address_line}, ${store.city}, ${store.state} ${store.pincode}`, M, y, { size: 9, color: MUTED });
  y -= 12;
  text(`${store.email}  |  ${store.phone}${store.gstin ? `  |  GSTIN ${store.gstin}` : ""}`, M, y, { size: 9, color: MUTED });
  text(
    `Date: ${new Date(order.placed_at ?? order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
    width - M,
    y,
    { size: 9, align: "right", color: MUTED },
  );
  y -= 22;
  hr(y);
  y -= 22;

  const a = order.shipping_address;
  const b = order.billing_address ?? a;
  const block = (title: string, addr: typeof a, x: number) => {
    let yy = y;
    text(title, x, yy, { size: 8, font: bold, color: MUTED });
    yy -= 14;
    for (const l of [addr.full_name, addr.line1, addr.line2, `${addr.city}, ${addr.state} ${addr.pincode}`, addr.phone].filter(
      Boolean,
    ) as string[]) {
      text(l, x, yy, { size: 10 });
      yy -= 13;
    }
    return yy;
  };
  const y1 = block("SHIP TO", a, M);
  const y2 = kind === "invoice" ? block("BILL TO", b, 300) : y1;
  y = Math.min(y1, y2) - 14;
  text(`Payment: ${order.payment_method === "cod" ? "Cash on Delivery" : "Prepaid (Razorpay)"}  |  ${order.email}`, M, y, {
    size: 9,
    color: MUTED,
  });
  y -= 20;

  // Table header
  page.drawRectangle({ x: M, y: y - 6, width: width - 2 * M, height: 22, color: rgb(0.96, 0.93, 0.9) });
  text("ITEM", M + 8, y, { size: 8, font: bold });
  text("SKU", 300, y, { size: 8, font: bold });
  text("QTY", 390, y, { size: 8, font: bold, align: "right" });
  if (kind === "invoice") {
    text("PRICE", 465, y, { size: 8, font: bold, align: "right" });
    text("AMOUNT", width - M - 8, y, { size: 8, font: bold, align: "right" });
  }
  y -= 24;
  for (const it of order.order_items) {
    const name = `${it.parent_item_id ? "  + " : ""}${it.product_name}${it.variant_name && it.variant_name !== "Charm" ? ` (${it.variant_name})` : ""}`;
    text(name.length > 48 ? `${name.slice(0, 47)}...` : name, M + 8, y, { size: 10 });
    text(it.sku ?? "-", 300, y, { size: 9, color: MUTED });
    text(String(it.quantity), 390, y, { size: 10, align: "right" });
    if (kind === "invoice") {
      text(money(it.unit_price), 465, y, { size: 10, align: "right" });
      text(money(it.line_total), width - M - 8, y, { size: 10, align: "right" });
    }
    y -= 18;
    if (y < 140) break;
  }
  hr(y + 6);
  y -= 14;

  if (kind === "invoice") {
    const row = (label: string, value: string, strong = false) => {
      text(label, 400, y, { size: strong ? 11 : 10, font: strong ? bold : sans, color: strong ? INK : MUTED });
      text(value, width - M - 8, y, { size: strong ? 11 : 10, font: strong ? bold : sans, align: "right" });
      y -= 16;
    };
    row("Subtotal", money(order.subtotal));
    if (Number(order.discount_total) > 0)
      row(`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`, `- ${money(order.discount_total)}`);
    row("Shipping", Number(order.shipping_total) === 0 ? "FREE" : money(order.shipping_total));
    if (Number(order.cod_fee) > 0) row("COD fee", money(order.cod_fee));
    y -= 4;
    row("Total", money(order.total), true);
    const gst = Number(order.tax_total);
    const intra = (a.state ?? "").toLowerCase() === store.state.toLowerCase();
    y -= 6;
    text(intra ? `Includes CGST ${money(gst / 2)} + SGST ${money(gst / 2)}` : `Includes IGST ${money(gst)}`, width - M - 8, y, {
      size: 9,
      align: "right",
      color: MUTED,
    });
    y -= 13;
    text("All prices are inclusive of GST. HSN 4202 (leather articles).", width - M - 8, y, { size: 8, align: "right", color: MUTED });
  } else {
    text("Please check that every item is included before sealing the parcel.", M, y, { size: 9, color: MUTED });
  }

  text("More than a bag. A part of your story.", M, 70, { size: 13, font: serif, color: COGNAC });
  text("Thank you for shopping with seicase. Returns accepted within 15 days of delivery.", M, 54, { size: 8, color: MUTED });
  return pdf.save();
}
