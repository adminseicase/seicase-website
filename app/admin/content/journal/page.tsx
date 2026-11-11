import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { CrudManager } from "@/components/admin/crud-manager";

export const metadata = { title: "Journal" };

export default async function JournalAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("journal_posts").select("*").order("published_at", { ascending: false, nullsFirst: true });
  return (
    <>
      <PageHeader title="Journal" description="Write stories about craft, care and styling. Published posts appear at /journal." />
      <CrudManager
        table="journal_posts"
        title="Posts"
        addLabel="New post"
        rows={data ?? []}
        defaults={{ status: "draft", author: "The seicase Studio", content: "" }}
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          { name: "slug", label: "URL slug", type: "text", hint: "Blank = created from the title" },
          { name: "excerpt", label: "Excerpt", type: "textarea", rows: 2 },
          { name: "cover_image", label: "Cover image", type: "image", folder: "journal" },
          { name: "content", label: "Story", type: "richtext" },
          { name: "tags", label: "Tags (comma separated)", type: "text" },
          { name: "author", label: "Author", type: "text" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
              { value: "archived", label: "Archived" },
            ],
          },
          { name: "published_at", label: "Publish date", type: "datetime", hint: "Future dates schedule the post" },
          { name: "seo_title", label: "SEO title", type: "text" },
          { name: "seo_description", label: "SEO description", type: "textarea", rows: 2 },
        ]}
        columns={[
          { key: "cover_image", label: "", render: "image" },
          { key: "title", label: "Title" },
          { key: "status", label: "Status", render: "badge" },
          { key: "published_at", label: "Published", render: "date" },
        ]}
      />
    </>
  );
}
