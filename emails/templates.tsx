import { Column, Img, Row, Section, Text, Hr, Link } from "@react-email/components";
import { Btn, EmailLayout, colors, s } from "./layout";

/**
 * All seicase transactional emails. Each export is a React Email component;
 * lib/email/send.ts renders them to HTML and sends them with Resend.
 * Preview locally with:  npx email dev --dir emails
 */

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
const abs = (siteUrl: string, url: string | null) => (!url ? `${siteUrl}/images/placeholder.webp` : url.startsWith("http") ? url : `${siteUrl}${url}`);

export interface EmailOrderItem {
  name: string;
  variant: string | null;
  quantity: number;
  price: number;
  image: string | null;
}
export interface EmailOrder {
  orderNumber: string;
  customerName: string;
  items: EmailOrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  codFee: number;
  total: number;
  paymentMethod: "razorpay" | "cod";
  address: { full_name: string; line1: string; line2?: string | null; city: string; state: string; pincode: string; phone: string };
  orderUrl: string;
}

function Items({ items, siteUrl }: { items: EmailOrderItem[]; siteUrl: string }) {
  return (
    <>
      {items.map((it, i) => (
        <Row key={i} style={{ marginBottom: "12px" }}>
          <Column style={{ width: "76px", verticalAlign: "top" }}>
            <Img src={abs(siteUrl, it.image)} width="64" height="80" alt="" style={{ borderRadius: "8px", objectFit: "cover", background: colors.muted }} />
          </Column>
          <Column style={{ verticalAlign: "top" }}>
            <Text style={{ ...s.p, margin: "0", fontSize: "15px" }}>{it.name}</Text>
            <Text style={{ ...s.small, margin: "2px 0 0" }}>
              {it.variant ? `${it.variant} · ` : ""}Qty {it.quantity}
            </Text>
          </Column>
          <Column style={{ width: "110px", textAlign: "right", verticalAlign: "top" }}>
            <Text style={{ ...s.p, margin: 0 }}>{inr(it.price * it.quantity)}</Text>
          </Column>
        </Row>
      ))}
    </>
  );
}

function Totals({ o }: { o: EmailOrder }) {
  const row = (label: string, value: string, strong = false) => (
    <Row>
      <Column>
        <Text style={{ ...(strong ? s.p : s.small), margin: "4px 0" }}>{label}</Text>
      </Column>
      <Column style={{ textAlign: "right" }}>
        <Text style={{ ...(strong ? { ...s.p, fontWeight: 500 } : s.small), margin: "4px 0" }}>{value}</Text>
      </Column>
    </Row>
  );
  return (
    <Section>
      {row("Subtotal", inr(o.subtotal))}
      {o.discount > 0 && row("Discount", `− ${inr(o.discount)}`)}
      {row("Shipping", o.shipping === 0 ? "FREE" : inr(o.shipping))}
      {o.codFee > 0 && row("COD fee", inr(o.codFee))}
      <Hr style={{ ...s.hr, margin: "10px 0" }} />
      {row("Total (incl. GST)", inr(o.total), true)}
    </Section>
  );
}

export function OrderConfirmationEmail({ order, siteUrl }: { order: EmailOrder; siteUrl: string }) {
  const a = order.address;
  return (
    <EmailLayout preview={`Thank you! Your order ${order.orderNumber} is confirmed.`} siteUrl={siteUrl}>
      <Text style={s.h1}>Thank you, {order.customerName.split(" ")[0]}.</Text>
      <Text style={s.p}>
        Your order <strong>#{order.orderNumber}</strong> has been placed. Our Chennai studio is preparing it with care, and we&apos;ll email
        you the tracking details as soon as it ships.
      </Text>
      <Btn href={order.orderUrl}>View your order →</Btn>
      <Hr style={s.hr} />
      <Items items={order.items} siteUrl={siteUrl} />
      <Hr style={s.hr} />
      <Totals o={order} />
      <Hr style={s.hr} />
      <Text style={s.h2}>Delivering to</Text>
      <Text style={s.small}>
        {a.full_name}
        <br />
        {a.line1}
        {a.line2 ? `, ${a.line2}` : ""}
        <br />
        {a.city}, {a.state} {a.pincode}
        <br />
        {a.phone}
      </Text>
      <Text style={s.small}>Payment: {order.paymentMethod === "cod" ? "Cash on Delivery" : "Paid online via Razorpay"}</Text>
    </EmailLayout>
  );
}

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  confirmed: { title: "Your order is confirmed", body: "Good news — we've confirmed your order and our artisans are getting it ready." },
  shipped: { title: "Your order is on its way", body: "Your seicase piece has left our studio and is on its way to you." },
  out_for_delivery: { title: "Out for delivery today", body: "Your order is out for delivery and should reach you today." },
  delivered: { title: "Delivered — we hope you love it", body: "Your order has been delivered. We'd love to hear what you think — leave a review any time from your account." },
  cancelled: { title: "Your order was cancelled", body: "Your order has been cancelled. If you paid online, your refund has been initiated and will reach you in 5–7 business days." },
  returned: { title: "Your return is complete", body: "We've received your return. Your refund is being processed." },
};

export function OrderStatusEmail({
  siteUrl,
  orderNumber,
  customerName,
  status,
  orderUrl,
  tracking,
  note,
}: {
  siteUrl: string;
  orderNumber: string;
  customerName: string;
  status: string;
  orderUrl: string;
  tracking?: { number: string | null; courier: string | null; url: string | null } | null;
  note?: string | null;
}) {
  const copy = STATUS_COPY[status] ?? { title: `Order update: ${status}`, body: "There's an update on your order." };
  return (
    <EmailLayout preview={`${copy.title} · #${orderNumber}`} siteUrl={siteUrl}>
      <Text style={s.h1}>{copy.title}</Text>
      <Text style={s.p}>Hi {customerName.split(" ")[0]},</Text>
      <Text style={s.p}>{copy.body}</Text>
      {note && <Text style={{ ...s.p, fontStyle: "italic", color: colors.subtle }}>{note}</Text>}
      {tracking?.number && (
        <Section style={{ background: colors.muted, borderRadius: "10px", padding: "16px 18px", margin: "8px 0 18px" }}>
          <Text style={{ ...s.small, margin: 0 }}>Tracking number</Text>
          <Text style={{ ...s.p, margin: "2px 0 0", fontWeight: 500 }}>
            {tracking.number}
            {tracking.courier ? ` · ${tracking.courier}` : ""}
          </Text>
          {tracking.url && (
            <Link href={tracking.url} style={{ ...s.small, color: colors.cognac }}>
              Track with the courier →
            </Link>
          )}
        </Section>
      )}
      <Btn href={orderUrl}>Track order #{orderNumber} →</Btn>
    </EmailLayout>
  );
}

export function WelcomeEmail({ siteUrl, name }: { siteUrl: string; name: string | null }) {
  return (
    <EmailLayout preview="Welcome to seicase — carry what you love." siteUrl={siteUrl}>
      <Text style={s.h1}>Welcome{name ? `, ${name.split(" ")[0]}` : ""}.</Text>
      <Text style={s.p}>
        Thank you for joining seicase. Every piece we make is cut, stitched and finished by hand in our Chennai studio — made to be carried
        every day, and to grow more beautiful with time.
      </Text>
      <Text style={s.p}>
        As a welcome, enjoy <strong>10% off your first order</strong> with code <strong>WELCOME10</strong>.
      </Text>
      <Btn href={`${siteUrl}/shop`}>Explore the collection →</Btn>
    </EmailLayout>
  );
}

export function ReturnUpdateEmail({
  siteUrl,
  customerName,
  orderNumber,
  status,
  refundAmount,
  note,
}: {
  siteUrl: string;
  customerName: string;
  orderNumber: string;
  status: string;
  refundAmount?: number | null;
  note?: string | null;
}) {
  const titles: Record<string, string> = {
    requested: "We've received your return request",
    approved: "Your return has been approved",
    rejected: "About your return request",
    received: "We've received your return",
    refunded: "Your refund has been issued",
    exchanged: "Your exchange is on its way",
  };
  return (
    <EmailLayout preview={`${titles[status] ?? "Return update"} · #${orderNumber}`} siteUrl={siteUrl}>
      <Text style={s.h1}>{titles[status] ?? "Return update"}</Text>
      <Text style={s.p}>Hi {customerName.split(" ")[0]},</Text>
      <Text style={s.p}>
        {status === "approved" && "We'll arrange a free pickup within 2–3 business days. Please pack the item with its tags and dust bag."}
        {status === "requested" && "Our team will review your request within one business day."}
        {status === "received" && "Our studio is inspecting your return. We'll update you shortly."}
        {status === "refunded" && `A refund${refundAmount ? ` of ${inr(refundAmount)}` : ""} has been issued to your original payment method. It may take 5–7 business days to appear.`}
        {status === "exchanged" && "Your replacement is being prepared and will ship soon."}
        {status === "rejected" && "Unfortunately we couldn't approve this return."}
      </Text>
      {note && <Text style={{ ...s.p, color: colors.subtle }}>{note}</Text>}
      <Btn href={`${siteUrl}/account`}>View my orders →</Btn>
    </EmailLayout>
  );
}

export function AbandonedCartEmail({
  siteUrl,
  name,
  items,
  recoverUrl,
}: {
  siteUrl: string;
  name: string | null;
  items: EmailOrderItem[];
  recoverUrl: string;
}) {
  return (
    <EmailLayout preview="You left something beautiful behind." siteUrl={siteUrl}>
      <Text style={s.h1}>Still thinking it over?</Text>
      <Text style={s.p}>
        {name ? `Hi ${name.split(" ")[0]}, y` : "Y"}our bag is waiting for you. Pieces are made in small batches, so we can&apos;t hold them for
        long.
      </Text>
      <Items items={items} siteUrl={siteUrl} />
      <Hr style={s.hr} />
      <Btn href={recoverUrl}>Return to your bag →</Btn>
      <Text style={{ ...s.small, marginTop: "18px" }}>Free shipping above ₹2,000 · Easy 15-day returns · Secure payments</Text>
    </EmailLayout>
  );
}

export function PasswordResetEmail({ siteUrl, resetUrl }: { siteUrl: string; resetUrl: string }) {
  return (
    <EmailLayout preview="Reset your seicase password" siteUrl={siteUrl}>
      <Text style={s.h1}>Reset your password</Text>
      <Text style={s.p}>We received a request to reset your password. Click below to choose a new one. This link expires in one hour.</Text>
      <Btn href={resetUrl}>Choose a new password →</Btn>
      <Text style={{ ...s.small, marginTop: "18px" }}>If you didn&apos;t ask for this, you can safely ignore this email.</Text>
    </EmailLayout>
  );
}

export function AdminContactEmail({
  siteUrl,
  name,
  email,
  phone,
  message,
}: {
  siteUrl: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
}) {
  return (
    <EmailLayout preview={`New message from ${name}`} siteUrl={siteUrl}>
      <Text style={s.h1}>New contact message</Text>
      <Text style={s.small}>
        From {name} &lt;{email}&gt;{phone ? ` · ${phone}` : ""}
      </Text>
      <Text style={{ ...s.p, whiteSpace: "pre-wrap" }}>{message}</Text>
      <Btn href={`${siteUrl}/admin/messages`}>Open inbox →</Btn>
    </EmailLayout>
  );
}

export function AdminNewOrderEmail({ siteUrl, order, adminUrl }: { siteUrl: string; order: EmailOrder; adminUrl: string }) {
  return (
    <EmailLayout preview={`New order ${order.orderNumber} · ${inr(order.total)}`} siteUrl={siteUrl}>
      <Text style={s.h1}>New order #{order.orderNumber}</Text>
      <Text style={s.p}>
        {order.customerName} · {order.address.city}, {order.address.state} · {order.paymentMethod === "cod" ? "COD" : "Prepaid"}
      </Text>
      <Items items={order.items} siteUrl={siteUrl} />
      <Totals o={order} />
      <Btn href={adminUrl}>Open in admin →</Btn>
    </EmailLayout>
  );
}

export function LowStockEmail({
  siteUrl,
  items,
}: {
  siteUrl: string;
  items: { product: string; colour: string; sku: string; stock: number }[];
}) {
  return (
    <EmailLayout preview={`${items.length} variants are running low`} siteUrl={siteUrl}>
      <Text style={s.h1}>Stock running low</Text>
      <Text style={s.p}>These variants are at or below their low-stock threshold:</Text>
      {items.map((i) => (
        <Text key={i.sku} style={{ ...s.small, margin: "4px 0" }}>
          <strong style={{ color: i.stock === 0 ? "#9B2C2C" : colors.text }}>{i.stock === 0 ? "OUT" : `${i.stock} left`}</strong> — {i.product} ({i.colour}) ·{" "}
          {i.sku}
        </Text>
      ))}
      <Hr style={s.hr} />
      <Btn href={`${siteUrl}/admin/inventory?filter=low`}>Restock in admin →</Btn>
    </EmailLayout>
  );
}
