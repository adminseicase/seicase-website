import { createClient } from "@/lib/supabase/server";
import { defaultSettings } from "@/lib/demo/seed-data";
import { PageHeader } from "@/components/admin/ui";
import { CrudManager } from "@/components/admin/crud-manager";
import { AnnouncementForm, BannersForm, HomepageForm, TrustStripForm } from "@/components/admin/settings-forms";
import type { SiteSettings } from "@/lib/types";

export const metadata = { title: "Homepage & banners" };

export default async function ContentPage() {
  const supabase = await createClient();
  const [{ data: slides }, { data: settingsRows }] = await Promise.all([
    supabase.from("hero_slides").select("*").order("sort_order"),
    supabase.from("site_settings").select("key, value").in("key", ["announcement", "homepage", "trust_strip", "banners"]),
  ]);
  const get = <K extends keyof SiteSettings>(k: K): SiteSettings[K] =>
    ({ ...defaultSettings[k], ...((settingsRows?.find((r) => r.key === k)?.value as object) ?? {}) }) as SiteSettings[K];
  return (
    <>
      <PageHeader title="Homepage & banners" description="Everything on the home page. Saving updates the live store instantly." />
      <CrudManager
        table="hero_slides"
        title="Hero slides"
        addLabel="Add slide"
        rows={slides ?? []}
        defaults={{
          is_active: true,
          text_tone: "dark",
          cta_label: "Explore Collection",
          cta_href: "/shop",
          sort_order: (slides?.length ?? 0) + 1,
        }}
        fields={[
          { name: "eyebrow", label: "Small heading (optional)", type: "text" },
          { name: "title", label: "Headline", type: "text", required: true },
          { name: "subtitle", label: "Subtext", type: "textarea", rows: 2 },
          { name: "cta_label", label: "Button label", type: "text" },
          { name: "cta_href", label: "Button link", type: "text", placeholder: "/shop" },
          { name: "image_url", label: "Desktop image (1920×1080)", type: "image", folder: "hero" },
          { name: "mobile_image_url", label: "Mobile image (900×1200, optional)", type: "image", folder: "hero" },
          { name: "alt", label: "Image description (alt text)", type: "text" },
          { name: "sort_order", label: "Order", type: "number" },
          { name: "is_active", label: "Show this slide", type: "boolean" },
        ]}
        columns={[
          { key: "image_url", label: "", render: "image" },
          { key: "title", label: "Headline" },
          { key: "cta_href", label: "Link" },
          { key: "sort_order", label: "Order" },
          { key: "is_active", label: "Active", render: "bool" },
        ]}
      />
      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <AnnouncementForm value={get("announcement")} />
        <HomepageForm value={get("homepage")} />
        <TrustStripForm value={get("trust_strip")} />
        <div className="xl:col-span-2">
          <BannersForm value={get("banners")} />
        </div>
      </div>
    </>
  );
}
