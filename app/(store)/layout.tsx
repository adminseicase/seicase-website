import { Suspense } from "react";
import { AnnouncementBar } from "@/components/store/announcement-bar";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { PageTracker } from "@/components/store/page-tracker";
import { CartSync } from "@/components/store/cart-sync";
import { ThirdPartyAnalytics } from "@/components/store/third-party";
import { StoreConfigProvider } from "@/components/store/store-config";
import { getSiteSettings } from "@/lib/data/content";
import { env, isSupabaseConfigured } from "@/lib/env";

/** Storefront shell: announcement bar, header, footer and global client helpers. */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const config = {
    freeShippingThreshold: settings.shipping.free_threshold,
    flatRate: settings.shipping.flat_rate,
    codEnabled: settings.shipping.cod_enabled,
    codFee: settings.shipping.cod_fee,
    codMaxOrder: settings.shipping.cod_max_order,
    returnWindowDays: settings.shipping.return_window_days,
    metroDays: settings.shipping.metro_days,
    standardDays: settings.shipping.standard_days,
    supportEmail: settings.store.email,
    supportPhone: settings.store.phone,
    razorpayKeyId: env.razorpayKeyId,
    supabaseEnabled: isSupabaseConfigured,
    turnstileSiteKey: env.turnstileSiteKey,
  };
  return (
    <StoreConfigProvider value={config}>
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-foreground px-4 py-2 text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <Suspense fallback={null}>
        <PageTracker />
      </Suspense>
      <CartSync />
      <ThirdPartyAnalytics />
    </StoreConfigProvider>
  );
}
