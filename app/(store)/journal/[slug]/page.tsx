import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJournalPost, getJournalPosts } from "@/lib/data/content";
import { Breadcrumbs, Container } from "@/components/store/section";
import { JsonLd } from "@/components/store/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { BLUR_DATA_URL, absoluteUrl, formatDate, stripHtml, truncate } from "@/lib/utils";

export async function generateStaticParams() {
  const params = (await getJournalPosts()).filter((p) => p.status === "published").map((p) => ({ slug: p.slug }));
  // Cache Components needs at least one entry; the placeholder renders notFound().
  return params.length ? params : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getJournalPost(slug);
  if (!p) return {};
  const description = p.seo_description || p.excerpt || truncate(stripHtml(p.content), 155);
  return {
    title: p.seo_title || p.title,
    description,
    alternates: { canonical: `/journal/${p.slug}` },
    openGraph: {
      type: "article",
      title: p.title,
      description,
      publishedTime: p.published_at ?? undefined,
      images: p.cover_image ? [p.cover_image] : undefined,
    },
  };
}

async function Post({ params }: Pick<PageProps<"/journal/[slug]">, "params">) {
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post || post.status !== "published") notFound();
  const more = (await getJournalPosts()).filter((p) => p.slug !== slug && p.status === "published").slice(0, 2);
  return (
    <article>
      <Container className="max-w-4xl pt-8 md:pt-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Journal", href: "/journal" }, { label: post.title }]} />
        <p className="text-muted mt-8 text-xs tracking-[0.16em] uppercase">
          {post.tags.join(" · ")} · {formatDate(post.published_at)}
        </p>
        <h1 className="mt-3 text-4xl md:text-6xl">{post.title}</h1>
        {post.excerpt && <p className="text-muted mt-4 font-serif text-xl italic md:text-2xl">{post.excerpt}</p>}
        <p className="text-muted mt-4 text-sm">By {post.author}</p>
      </Container>
      {post.cover_image && (
        <Container className="mt-8 max-w-5xl">
          <div className="relative aspect-[3/2] overflow-hidden rounded-2xl">
            <Image
              src={post.cover_image}
              alt=""
              fill
              sizes="(max-width: 1100px) 100vw, 1000px"
              preload
              className="object-cover"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          </div>
        </Container>
      )}
      <Container className="max-w-3xl py-10 md:py-14">
        <div className="prose-seicase text-[1.05rem]" dangerouslySetInnerHTML={{ __html: post.content }} />
      </Container>
      {more.length > 0 && (
        <Container className="max-w-5xl border-t pt-10">
          <h2 className="mb-6 text-3xl">More from the Journal</h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            {more.map((p) => (
              <li key={p.id}>
                <Link href={`/journal/${p.slug}`} className="group flex gap-4">
                  <Image
                    src={p.cover_image || "/images/placeholder.webp"}
                    alt=""
                    width={160}
                    height={107}
                    className="h-[107px] w-40 shrink-0 rounded-lg object-cover"
                  />
                  <span className="group-hover:text-cognac font-serif text-xl leading-tight">{p.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          image: post.cover_image ? [absoluteUrl(post.cover_image)] : undefined,
          datePublished: post.published_at,
          dateModified: post.updated_at ?? post.published_at,
          author: { "@type": "Organization", name: post.author ?? "seicase" },
          publisher: { "@type": "Organization", name: "seicase", logo: { "@type": "ImageObject", url: absoluteUrl("/images/logo/seicaselogo.png") } },
          mainEntityOfPage: absoluteUrl(`/journal/${post.slug}`),
        }}
      />
    </article>
  );
}

export default function JournalPostPage(props: PageProps<"/journal/[slug]">) {
  return (
    <Suspense
      fallback={
        <Container className="max-w-4xl pt-12">
          <Skeleton className="h-96" />
        </Container>
      }
    >
      <Post params={props.params} />
    </Suspense>
  );
}
