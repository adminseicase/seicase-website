import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, CircleQuestionMark, Headset, Mail, RotateCcw, Sparkles, Truck } from "lucide-react";
import { getFaqs } from "@/lib/data/content";
import { Container } from "@/components/store/section";
import { JsonLd } from "@/components/store/json-ld";
import { HelpSearch } from "./help-search";

export const metadata: Metadata = {
  title: "Help Centre — FAQs, Shipping & Returns",
  description: "Answers about shipping, returns, payments, orders and leather care at seicase.",
  alternates: { canonical: "/help" },
};

export default async function HelpPage() {
  const faqs = (await getFaqs()).filter((f) => f.is_visible);
  const popular = faqs.filter((f) => f.is_popular);
  const categories = [...new Set(faqs.map((f) => f.category))];
  const quick = [
    { href: "#faqs", label: "FAQs", Icon: CircleQuestionMark },
    { href: "/shipping-policy", label: "Shipping", Icon: Truck },
    { href: "/returns-and-exchanges", label: "Returns", Icon: RotateCcw },
    { href: "/care-guide", label: "Product Care", Icon: Sparkles },
    { href: "/contact", label: "Contact Us", Icon: Mail },
  ];

  return (
    <>
      <section className="bg-surface-muted relative overflow-hidden">
        <Container className="relative grid items-center gap-8 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div>
            <h1 className="text-5xl md:text-6xl">How can we help you?</h1>
            <p className="text-muted mt-3 max-w-md">Find answers to common questions or get in touch with our team.</p>
            <HelpSearch faqs={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
          </div>
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl md:block">
            <Image
              src="/images/products/the-heritage-satchel/burgundy-detail.webp"
              alt=""
              fill
              sizes="45vw"
              className="object-cover"
              preload
            />
          </div>
        </Container>
      </section>

      <Container className="py-10">
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {quick.map(({ href, label, Icon }) => (
            <li key={label}>
              <Link
                href={href}
                className="bg-surface hover:border-foreground flex h-full flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm"
              >
                <Icon className="text-brown size-6 stroke-[1.25]" aria-hidden="true" /> {label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      <Container className="grid gap-10 pb-10 lg:grid-cols-[1fr_320px]">
        <div id="faqs" className="scroll-mt-24">
          <h2 className="mb-4 text-3xl md:text-4xl">Popular Questions</h2>
          <FaqList items={popular} />
          {categories.map((c) => (
            <section key={c} className="mt-10" aria-labelledby={`faq-${c}`}>
              <h3 id={`faq-${c}`} className="mb-3 text-2xl">
                {c}
              </h3>
              <FaqList items={faqs.filter((f) => f.category === c)} />
            </section>
          ))}
        </div>
        <aside className="bg-surface-muted h-fit rounded-2xl p-6 text-center lg:sticky lg:top-24">
          <Headset className="mx-auto size-10 stroke-1" aria-hidden="true" />
          <p className="mt-3 font-serif text-2xl">Still have questions?</p>
          <p className="text-muted mt-1 text-sm">Our team is here to help.</p>
          <Link
            href="/contact"
            className="bg-foreground text-background hover:bg-brown mt-5 inline-flex h-11 items-center rounded-md px-5 text-sm"
          >
            Contact Support →
          </Link>
        </aside>
      </Container>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
        }}
      />
    </>
  );
}

function FaqList({ items }: { items: { id: string; question: string; answer: string }[] }) {
  return (
    <div className="bg-surface divide-y rounded-xl border">
      {items.map((f) => (
        <details key={f.id} id={`q-${f.id}`} className="group px-5">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[0.95rem] [&::-webkit-details-marker]:hidden">
            {f.question}
            <ChevronDown className="size-4 shrink-0 stroke-[1.5] transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="text-muted pb-5 text-sm leading-relaxed">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
