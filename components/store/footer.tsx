import Link from "next/link";
import { Clock, Mail, Phone } from "lucide-react";
import { getCategories } from "@/lib/data/catalog";
import { getSiteSettings } from "@/lib/data/content";
import { FacebookIcon, InstagramIcon, PinterestIcon, YoutubeIcon } from "./icons";
import { BackToTop } from "./back-to-top";

// Evaluated once per deployment (module scope keeps the footer fully static).
const YEAR = new Date().getFullYear();

export async function Footer() {
  const [settings, categories] = await Promise.all([getSiteSettings(), getCategories()]);
  const { store, social } = settings;
  const socials = [
    { href: social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: social.pinterest, label: "Pinterest", Icon: PinterestIcon },
    { href: social.youtube, label: "YouTube", Icon: YoutubeIcon },
    { href: social.facebook, label: "Facebook", Icon: FacebookIcon },
  ].filter((s) => s.href);

  const cols = [
    {
      title: "Shop",
      links: [
        ...categories.slice(0, 5).map((c) => ({ label: c.name, href: `/shop/${c.slug}` })),
        { label: "New In", href: "/shop/new-in" },
      ],
    },
    {
      title: "About",
      links: [
        { label: "Our Story", href: "/our-story" },
        { label: "Journal", href: "/journal" },
        { label: "Craftsmanship", href: "/our-story#process" },
        { label: "Care Guide", href: "/care-guide" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "FAQs", href: "/help" },
        { label: "Shipping", href: "/shipping-policy" },
        { label: "Returns & Exchanges", href: "/returns-and-exchanges" },
        { label: "Track Order", href: "/account" },
        { label: "Contact Us", href: "/contact" },
      ],
    },
  ];

  return (
    <footer className="bg-surface/60 mt-20 border-t">
      <div className="mx-auto max-w-[1440px] px-4 pt-14 pb-8 md:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_repeat(3,1fr)_1.3fr]">
          <div>
            <Link href="/" className="font-serif text-4xl" aria-label="seicase home">
              seicase
            </Link>
            <p className="text-muted mt-3 max-w-xs font-serif text-lg italic">More than a bag. A part of your story.</p>
            <ul className="mt-6 flex gap-1" aria-label="Follow seicase">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="text-foreground hover:bg-surface-muted hover:text-cognac inline-flex size-11 items-center justify-center rounded-full"
                  >
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {cols.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="mb-4 font-sans text-xs font-medium tracking-[0.16em] uppercase">{col.title}</h2>
              <ul className="space-y-1">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-muted hover:text-foreground inline-flex min-h-9 items-center text-sm">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <h2 className="mb-4 font-sans text-xs font-medium tracking-[0.16em] uppercase">Customer Care</h2>
            <ul className="text-muted space-y-3 text-sm">
              <li>
                <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="hover:text-foreground flex items-center gap-3">
                  <Phone className="size-4 stroke-[1.5]" aria-hidden="true" /> {store.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${store.email}`} className="hover:text-foreground flex items-center gap-3">
                  <Mail className="size-4 stroke-[1.5]" aria-hidden="true" /> {store.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="size-4 stroke-[1.5]" aria-hidden="true" /> {store.hours}
              </li>
            </ul>
          </div>
        </div>
        <div className="text-muted mt-12 flex flex-col gap-4 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {YEAR} seicase. All rights reserved. Made with care in Chennai.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <span aria-hidden="true">|</span>
            <Link href="/terms-of-service" className="hover:text-foreground">
              Terms of Service
            </Link>
            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
