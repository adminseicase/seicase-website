import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { CrudManager } from "@/components/admin/crud-manager";

export const metadata = { title: "Pages & FAQs" };

export default async function PagesAdminPage() {
  const supabase = await createClient();
  const [{ data: pages }, { data: faqs }] = await Promise.all([
    supabase.from("pages").select("*").order("title"),
    supabase.from("faqs").select("*").order("category").order("sort_order"),
  ]);
  return (
    <>
      <PageHeader
        title="Pages & FAQs"
        description="Our Story, policies and the Help Centre. The page slug is its address, e.g. our-story → /our-story."
      />
      <CrudManager
        table="pages"
        title="Pages"
        addLabel="New page"
        rows={pages ?? []}
        defaults={{ is_published: true, content: "" }}
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          {
            name: "slug",
            label: "Slug",
            type: "text",
            hint: "Built-in: our-story, care-guide, shipping-policy, returns-and-exchanges, privacy-policy, terms-of-service",
          },
          { name: "subtitle", label: "Subtitle", type: "text" },
          { name: "hero_image", label: "Hero image (optional)", type: "image", folder: "pages" },
          { name: "content", label: "Content", type: "richtext" },
          { name: "seo_title", label: "SEO title", type: "text" },
          { name: "seo_description", label: "SEO description", type: "textarea", rows: 2 },
          { name: "is_published", label: "Published", type: "boolean" },
        ]}
        columns={[
          { key: "title", label: "Title" },
          { key: "slug", label: "Slug" },
          { key: "is_published", label: "Published", render: "bool" },
          { key: "updated_at", label: "Updated", render: "date" },
        ]}
      />
      <div className="mt-12">
        <CrudManager
          table="faqs"
          title="FAQs (Help Centre)"
          addLabel="Add question"
          rows={faqs ?? []}
          defaults={{ category: "General", is_visible: true, is_popular: false, sort_order: (faqs?.length ?? 0) + 1 }}
          fields={[
            { name: "question", label: "Question", type: "text", required: true },
            { name: "answer", label: "Answer", type: "textarea", rows: 5 },
            { name: "category", label: "Category", type: "text", hint: "e.g. Shipping, Returns, Orders, Payments, Product Care" },
            { name: "sort_order", label: "Sort order", type: "number" },
            { name: "is_popular", label: "Show in Popular Questions", type: "boolean" },
            { name: "is_visible", label: "Visible", type: "boolean" },
          ]}
          columns={[
            { key: "question", label: "Question" },
            { key: "category", label: "Category", render: "badge" },
            { key: "is_popular", label: "Popular", render: "bool" },
            { key: "is_visible", label: "Visible", render: "bool" },
          ]}
        />
      </div>
    </>
  );
}
