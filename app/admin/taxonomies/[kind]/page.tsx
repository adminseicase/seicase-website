import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { CrudManager, type FieldDef } from "@/components/admin/crud-manager";
import { cn } from "@/lib/utils";

export const metadata = { title: "Categories & styles" };

const KINDS = { categories: "Categories", styles: "Styles", collections: "Collections" } as const;

const fields = (kind: string): FieldDef[] => [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "slug", label: "URL slug", type: "text", hint: "Leave blank to create from the name" },
  { name: "description", label: "Description", type: "textarea", rows: 2 },
  { name: "image_url", label: "Image", type: "image", folder: kind },
  { name: "sort_order", label: "Sort order", type: "number", hint: "Lower numbers appear first" },
  { name: "is_visible", label: "Visible on the store", type: "boolean" },
  { name: "seo_title", label: "SEO title", type: "text" },
  { name: "seo_description", label: "SEO description", type: "textarea", rows: 2 },
];

export default async function TaxonomyPage({ params }: PageProps<"/admin/taxonomies/[kind]">) {
  const { kind } = await params;
  if (!(kind in KINDS)) notFound();
  const k = kind as keyof typeof KINDS;
  const supabase = await createClient();
  const { data } = await supabase.from(k).select("*").order("sort_order");
  return (
    <>
      <PageHeader
        title="Categories, styles & collections"
        description="Organise how shoppers browse. Categories and styles each get their own page on the store."
      />
      <nav className="mb-6 flex gap-1" aria-label="Taxonomy type">
        {Object.entries(KINDS).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/taxonomies/${key}`}
            className={cn(
              "h-9 rounded-full border px-4 text-sm leading-9",
              key === k ? "border-foreground bg-foreground text-background" : "bg-surface hover:border-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <CrudManager
        table={k}
        title={KINDS[k]}
        addLabel={`Add ${KINDS[k].slice(0, -1).toLowerCase().replace("categorie", "category")}`}
        rows={data ?? []}
        fields={fields(k)}
        defaults={{ is_visible: true, sort_order: (data?.length ?? 0) + 1 }}
        columns={[
          { key: "image_url", label: "", render: "image" },
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          { key: "sort_order", label: "Order" },
          { key: "is_visible", label: "Visible", render: "bool" },
        ]}
      />
    </>
  );
}
