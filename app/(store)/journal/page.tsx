import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getJournalPosts } from "@/lib/data/content";
import { Container } from "@/components/store/section";
import { BLUR_DATA_URL, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Journal — Stories of Craft, Care & Style",
  description: "Stories from the seicase studio: leather care, craftsmanship and styling notes.",
  alternates: { canonical: "/journal" },
};

export default async function JournalPage() {
  const posts = (await getJournalPosts()).filter((p) => p.status === "published");
  const [lead, ...rest] = posts;
  return (
    <Container className="py-10 md:py-14">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-5xl md:text-6xl">Journal</h1>
        <p className="mt-3 text-muted">Stories of craft, care and the everyday moments our bags are made for.</p>
      </header>
      {lead && (
        <Link href={`/journal/${lead.slug}`} className="group mb-14 grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-surface-muted">
            <Image src={lead.cover_image || "/images/placeholder.webp"} alt="" fill sizes="(max-width: 768px) 100vw, 60vw" preload className="object-cover transition-transform duration-700 group-hover:scale-[1.02]" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              {lead.tags[0]} · {formatDate(lead.published_at)}
            </p>
            <h2 className="mt-3 text-4xl group-hover:text-cognac md:text-5xl">{lead.title}</h2>
            <p className="mt-3 text-muted">{lead.excerpt}</p>
            <span className="mt-5 inline-block border-b border-foreground pb-0.5 text-sm">Read the story</span>
          </div>
        </Link>
      )}
      <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((p) => (
          <li key={p.id}>
            <Link href={`/journal/${p.slug}`} className="group block">
              <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-surface-muted">
                <Image src={p.cover_image || "/images/placeholder.webp"} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted">
                {p.tags[0]} · {formatDate(p.published_at)}
              </p>
              <h2 className="mt-2 text-2xl group-hover:text-cognac">{p.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-muted">{p.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
