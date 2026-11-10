import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSiteSettings } from "@/lib/data/content";
import { Container } from "@/components/store/section";
import { BotanicalVase } from "@/components/store/botanical";
import { FacebookIcon, InstagramIcon, PinterestIcon, YoutubeIcon } from "@/components/store/icons";
import { ContactForm } from "./contact-form";
import { LazyMap } from "./lazy-map";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with seicase — call, email or visit our Chennai studio. We reply within one business day.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const { store, social } = await getSiteSettings();
  const socials = [
    { href: social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: social.pinterest, label: "Pinterest", Icon: PinterestIcon },
    { href: social.youtube, label: "YouTube", Icon: YoutubeIcon },
    { href: social.facebook, label: "Facebook", Icon: FacebookIcon },
  ].filter((s) => s.href);
  return (
    <Container className="py-10 md:py-16">
      <div className="grid gap-10 overflow-hidden rounded-3xl bg-surface-muted/70 md:grid-cols-[1fr_1.1fr]">
        <div className="relative p-8 md:p-12">
          <BotanicalVase className="pointer-events-none absolute -bottom-6 right-0 h-72 text-cognac/25 md:h-96" />
          <h1 className="text-5xl md:text-6xl">Get in Touch</h1>
          <p className="mt-3 text-muted">We&apos;d love to hear from you.</p>
          <ul className="relative mt-8 space-y-5 text-sm">
            <li className="flex items-center gap-4">
              <Phone className="size-5 stroke-[1.5]" aria-hidden="true" />
              <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="hover:text-cognac">
                {store.phone}
              </a>
            </li>
            <li className="flex items-center gap-4">
              <Mail className="size-5 stroke-[1.5]" aria-hidden="true" />
              <a href={`mailto:${store.email}`} className="hover:text-cognac">
                {store.email}
              </a>
            </li>
            <li className="flex items-center gap-4">
              <Clock className="size-5 stroke-[1.5]" aria-hidden="true" /> {store.hours}
            </li>
            <li className="flex items-start gap-4">
              <MapPin className="size-5 shrink-0 stroke-[1.5]" aria-hidden="true" />
              <address className="not-italic">
                {store.address_line}, {store.city}, {store.state} {store.pincode}
              </address>
            </li>
          </ul>
          <ul className="relative mt-8 flex gap-1">
            {socials.map(({ href, label, Icon }) => (
              <li key={label}>
                <a href={href!} target="_blank" rel="noopener noreferrer" aria-label={label} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface">
                  <Icon />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-surface p-6 md:p-10">
          <ContactForm />
        </div>
      </div>
      <div className="mt-10">
        <LazyMap lat={store.map_lat} lng={store.map_lng} label={`seicase, ${store.address_line}, ${store.city}`} />
      </div>
    </Container>
  );
}
