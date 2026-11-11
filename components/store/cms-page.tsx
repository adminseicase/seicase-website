import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPage } from "@/lib/data/content";
import { Breadcrumbs, Container } from "./section";
import { BotanicalSprig } from "./botanical";
import { BLUR_DATA_URL, formatDate } from "@/lib/utils";

export async function cmsMetadata(slug: string): Promise<Metadata> {
  const p = await getPage(slug);
  if (!p) return {};
  return {
    title: p.seo_title || p.title,
    description: p.seo_description || p.subtitle || undefined,
    alternates: { canonical: `/${slug}` },
  };
}

/** Renders an admin-editable page (Our Story, policies, care guide). */
export async function CmsPage({ slug, children }: { slug: string; children?: React.ReactNode }) {
  const page = await getPage(slug);
  if (!page || !page.is_published) notFound();
  return (
    <article>
      {page.hero_image ? (
        <div className="relative h-[46vh] min-h-[320px] overflow-hidden">
          <Image
            src={page.hero_image}
            alt=""
            fill
            sizes="100vw"
            preload
            className="object-cover"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1f1a17]/60 via-[#1f1a17]/20 to-transparent" />
          <Container className="relative flex h-full flex-col justify-end pb-10 text-[#F6EEE7]">
            <h1 className="text-5xl md:text-7xl">{page.title}</h1>
            {page.subtitle && <p className="mt-3 max-w-xl font-serif text-xl text-[#F6EEE7]/90 italic md:text-2xl">{page.subtitle}</p>}
          </Container>
        </div>
      ) : (
        <Container className="pt-8 md:pt-12">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: page.title }]} />
          <div className="mt-8 max-w-3xl">
            <BotanicalSprig className="text-cognac/60 mb-4 size-10" />
            <h1 className="text-5xl md:text-6xl">{page.title}</h1>
            {page.subtitle && <p className="text-muted mt-3 text-lg">{page.subtitle}</p>}
          </div>
        </Container>
      )}
      <Container className="py-10 md:py-14">
        <div className="prose-seicase max-w-3xl" dangerouslySetInnerHTML={{ __html: page.content }} />
        <p className="text-muted mt-10 text-xs">Last updated {formatDate(page.updated_at)}</p>
        {children}
      </Container>
    </article>
  );
}
