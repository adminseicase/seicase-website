import Link from "next/link";
import { CircleQuestionMark, Headset, Mail, Package, RotateCcw, Truck } from "lucide-react";
import { getSiteSettings } from "@/lib/data/content";

export const metadata = { title: "Help & Support" };

export default async function SupportPage() {
  const { store } = await getSiteSettings();
  const cards = [
    { href: "/help", title: "FAQs", body: "Answers to common questions", Icon: CircleQuestionMark },
    { href: "/shipping-policy", title: "Shipping", body: "Delivery times and charges", Icon: Truck },
    { href: "/returns-and-exchanges", title: "Returns", body: "Easy 15-day returns", Icon: RotateCcw },
    { href: "/account", title: "Track an order", body: "See where your parcel is", Icon: Package },
    { href: "/contact", title: "Contact us", body: "We reply within one business day", Icon: Mail },
  ];
  return (
    <>
      <h1 className="mb-6 text-4xl">Help &amp; Support</h1>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ href, title, body, Icon }) => (
          <li key={title}>
            <Link href={href} className="flex h-full gap-4 rounded-2xl border bg-surface p-5 hover:border-foreground">
              <Icon className="size-6 shrink-0 stroke-[1.25] text-brown" aria-hidden="true" />
              <span>
                <span className="block font-serif text-xl">{title}</span>
                <span className="text-sm text-muted">{body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl bg-surface-muted p-6">
        <Headset className="size-8 stroke-1" aria-hidden="true" />
        <div className="flex-1">
          <p className="font-serif text-2xl">Talk to our team</p>
          <p className="text-sm text-muted">
            {store.phone} · {store.email} · {store.hours}
          </p>
        </div>
      </div>
    </>
  );
}
