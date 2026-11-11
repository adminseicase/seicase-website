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
        <p className="text-muted mt-3">Stories of craft, care and the everyday moments our bags are made for.</p>
      </header>
      {lead && (
        <Link href={`/journal/${lead.slug}`} className="group mb-14 grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div className="bg-surface-muted relative aspect-[3/2] overflow-hidden rounded-2xl">
            <Image
              src={lead.cover_image || "/images/placeholder.webp"}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              preload
              className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          </div>
          <div>
            <p className="text-muted text-xs tracking-[0.16em] uppercase">
              {lead.tags[0]} · {formatDate(lead.published_at)}
            </p>
            <h2 className="group-hover:text-cognac mt-3 text-4xl md:text-5xl">{lead.title}</h2>
            <p className="text-muted mt-3">{lead.excerpt}</p>
            <span className="border-foreground mt-5 inline-block border-b pb-0.5 text-sm">Read the story</span>
          </div>
        </Link>
      )}
      <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((p) => (
          <li key={p.id}>
            <Link href={`/journal/${p.slug}`} className="group block">
              <div className="bg-surface-muted relative aspect-[3/2] overflow-hidden rounded-xl">
                <Image
                  src={p.cover_image || "/images/placeholder.webp"}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
              </div>
              <p className="text-muted mt-4 text-xs tracking-[0.16em] uppercase">
                {p.tags[0]} · {formatDate(p.published_at)}
              </p>
              <h2 className="group-hover:text-cognac mt-2 text-2xl">{p.title}</h2>
              <p className="text-muted mt-2 line-clamp-2 text-sm">{p.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
